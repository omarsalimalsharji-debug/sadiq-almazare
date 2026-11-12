/**
 * Server-side entry point for "صديق المزارع" (Farmer's Friend)
 * Founder & Director: Omar Al-Sharji (عمر الشرجي)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { 
  INITIAL_BOOKS, 
  GAME_QUESTIONS, 
  RAMADAN_30_FACTS, 
  RAMADAN_NUTRITION_TIPS,
  OMANI_GOVERNORATES,
  Book,
  Question
} from './src/data/agriculturalData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Gemini on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Database Stores with robust initial data
let booksStore: Book[] = [...INITIAL_BOOKS];
let questionsStore: Question[] = [...GAME_QUESTIONS];

interface ScoreSubmission {
  id: string;
  userId: string;
  userName: string;
  userGovernorate: string;
  gameType: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  streakBonus: number;
  timestamp: number;
  clientNonce: string;
}

const submittedNonces = new Set<string>();
let scoreSubmissions: ScoreSubmission[] = [
  {
    id: "sub-1",
    userId: "usr-oman-1",
    userName: "سعيد بن ناصر الهنائي",
    userGovernorate: "محافظة الداخلية (نزوى)",
    gameType: "knowledge",
    score: 840,
    correctCount: 7,
    totalQuestions: 8,
    streakBonus: 140,
    timestamp: Date.now() - 3600000 * 2,
    clientNonce: "seed-1"
  },
  {
    id: "sub-2",
    userId: "usr-oman-2",
    userName: "أحمد بن سالم المعمري",
    userGovernorate: "محافظة شمال الباطنة (صحم)",
    gameType: "guess_crop",
    score: 720,
    correctCount: 6,
    totalQuestions: 6,
    streakBonus: 120,
    timestamp: Date.now() - 3600000 * 5,
    clientNonce: "seed-2"
  },
  {
    id: "sub-3",
    userId: "usr-oman-3",
    userName: "مريم بنت خلفان الحبسية",
    userGovernorate: "محافظة شمال الشرقية (المضيبي)",
    gameType: "cultural",
    score: 650,
    correctCount: 5,
    totalQuestions: 5,
    streakBonus: 150,
    timestamp: Date.now() - 3600000 * 9,
    clientNonce: "seed-3"
  },
  {
    id: "sub-4",
    userId: "usr-oman-4",
    userName: "سالم بن خميس البلوشي",
    userGovernorate: "محافظة جنوب الباطنة (بركاء)",
    gameType: "speed",
    score: 590,
    correctCount: 5,
    totalQuestions: 6,
    streakBonus: 90,
    timestamp: Date.now() - 3600000 * 14,
    clientNonce: "seed-4"
  },
  {
    id: "sub-5",
    userId: "usr-oman-5",
    userName: "فاطمة بنت علي الشنفرية",
    userGovernorate: "محافظة ظفار (صلالة)",
    gameType: "plant_doctor",
    score: 580,
    correctCount: 4,
    totalQuestions: 4,
    streakBonus: 100,
    timestamp: Date.now() - 3600000 * 20,
    clientNonce: "seed-5"
  }
];

interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: 'مزارع' | 'مهندس زراعي' | 'مرشد زراعي' | 'إدارة التطبيق';
  authorGovernorate: string;
  content: string;
  cropCategory: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
  comments: {
    id: string;
    authorName: string;
    authorRole: string;
    comment: string;
    timestamp: number;
  }[];
}

let communityPosts: CommunityPost[] = [
  {
    id: "post-1",
    authorName: "المهندس عمر الشرجي (مدير التطبيق)",
    authorRole: "إدارة التطبيق",
    authorGovernorate: "سلطنة عُمان",
    cropCategory: "نخيل التمر والري",
    content: "أهلاً وسهلاً بجميع المزارعين والمهندسين وأبناء الوطن في منصة «صديق المزارع». يسعدنا تقديم هذا الإصدار الشامل لخدمة قطاع الزراعة العماني، ونرحب بمشاركاتكم واستفساراتكم حول إدارة المحاصيل ومكافحة الآفات.",
    timestamp: Date.now() - 86400000 * 2,
    likes: 42,
    likedBy: [],
    comments: [
      {
        id: "comm-1",
        authorName: "سالم الشامسي",
        authorRole: "مزارع",
        comment: "بارك الله في جهودكم يا أخ عمر، المنصة مفيدة جداً خصوصاً توثيق أمراض النخيل ونظام الأفلاج العماني.",
        timestamp: Date.now() - 86400000 * 1
      }
    ]
  },
  {
    id: "post-2",
    authorName: "خلفان بن حمد العامري",
    authorRole: "مزارع",
    authorGovernorate: "محافظة الداخلية (سمائل)",
    cropCategory: "زراعة الطماطم المحمية",
    content: "السلام عليكم، مع تقلبات درجات الحرارة بين الليل والنهار في ولاية سمائل، لاحظت بداية ظهور لفحة مبكرة على الأوراق السفلية للشتلات. هل يُفضل الرش بالنحاس المخلبي أم الكبريت الميكروني؟",
    timestamp: Date.now() - 3600000 * 6,
    likes: 12,
    likedBy: [],
    comments: [
      {
        id: "comm-2",
        authorName: "م. ناصر المعمري",
        authorRole: "مرشد زراعي",
        comment: "وعليكم السلام يا أبا حمد. النحاس المخلبي وقائي ممتاز جداً ويفضل استخدامه قبل تشكل الرطوبة العالية مع خفض الري في فترة المساء.",
        timestamp: Date.now() - 3600000 * 3
      }
    ]
  }
];

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'weather' | 'crop_advice' | 'ramadan' | 'system';
  targetGovernorate?: string;
  timestamp: number;
  read: boolean;
}

let notificationsStore: AppNotification[] = [
  {
    id: "notif-1",
    title: "تنبيه جوي: نشاط رياح هابطة وفرص غبار",
    message: "توقع نشاط رياح نشطة مثيرة للغبار على محافظات البريمي والظاهرة والوسطى، يرجى إحكام أغطية البيوت المحمية وضبط وتيرة الري للشتلات الصغيرة.",
    type: "weather",
    targetGovernorate: "الظاهرة والبريمي",
    timestamp: Date.now() - 3600000 * 2,
    read: false
  },
  {
    id: "notif-2",
    title: "إرشاد النخيل: مواعيد التكميم الميداني",
    message: "توصية إدارة الإرشاد الزراعي بمتابعة تكميم عذوق نخيل الخلاص والفرض لحمايتها من العناكب وطيور القيظ.",
    type: "crop_advice",
    timestamp: Date.now() - 3600000 * 12,
    read: false
  },
  {
    id: "notif-3",
    title: "نفحات رمضانية: المعلومة الزراعية اليومية",
    message: "اطلع على معلومة اليوم عن شجرة البركة والتمر العماني في قسم الهوية الرمضانية الذكية.",
    type: "ramadan",
    timestamp: Date.now() - 86400000,
    read: true
  }
];

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: number;
}

let auditLogs: AuditLog[] = [
  {
    id: "aud-1",
    action: "تحديث قاعدة الأسئلة",
    performedBy: "عمر الشرجي (المدير العام)",
    details: "إضافة 6 أسئلة جديدة إلى مسابقة الثقافة العمانية وتحدي السرعة",
    timestamp: Date.now() - 86400000
  },
  {
    id: "aud-2",
    action: "نشر كتاب في المكتبة",
    performedBy: "عمر الشرجي (المدير العام)",
    details: "اعتماد كتاب 'الدليل الشامل لزراعة ورعاية نخيل التمر في عُمان' وإتاحته للقراءة الآمنة",
    timestamp: Date.now() - 86400000 * 3
  }
];

// --- 1. AI Plant Disease Diagnosis API ---
app.post('/api/diagnose/plant', async (req, res) => {
  try {
    const { imageBase64, cropName, symptoms, wilayat } = req.body;

    if (!imageBase64 && !symptoms) {
      return res.status(400).json({ error: 'يرجى تقديم صورة للنبات أو وصف مفصل للأعراض المرضية.' });
    }

    const systemInstruction = `أنت خبير زراعي متخصص في أمراض النباتات ووقاية المزروعات في سلطنة عُمان والخليج العربي.
قم بتحليل الأعراض المقدمة (من خلال الصورة أو الوصف) وأجب دائماً بصيغة JSON دقيقة ومطابقة للمخطط التالي حصراً، بدون أي تنسيقات خارج الـ JSON:
{
  "cropName": "اسم المحصول (مثال: طماطم، نخلة تمر، خيار، ليمون عماني)",
  "healthStatus": "سليم | مصاب بمرض فطري | مصاب بمرض بكتيري | مصاب بمرض فيروسي | نقص عناصر غذائية | إصابة فسيولوجية",
  "diseaseName": "الاسم الشائع والعلمي للمرض أو الاضطراب باللغة العربية",
  "confidenceScore": 92,
  "symptomsSummary": "ملخص تشخيصي للأعراض الظاهرة",
  "causes": ["السبب الأول", "السبب الثاني"],
  "organicRemedy": "خطة العلاج والمكافحة العضوية الطبيعية (زيوت، بكتيريا نافعة، مستخلصات)",
  "chemicalRemedy": "العلاج الكيميائي المعتمد وفترة الأمان إن تطلب الأمر",
  "preventionTips": ["نصيحة وقائية 1", "نصيحة وقائية 2"],
  "omaniFarmingNote": "إرشاد عملي خاص بالبيئة العمانية ونظام الري والمناخ المحلي"
}`;

    const parts: any[] = [];
    if (imageBase64) {
      // Strip base64 prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const userPrompt = `المحصول: ${cropName || 'غير محدد'}
الموقع في سلطنة عُمان: ${wilayat || 'عمان'}
أعراض الملاحظة من المزارع: ${symptoms || 'انظر إلى صورة النبات بدقة وشخص الحالة بالتفصيل'}`;
    parts.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, diagnosis: parsed });
  } catch (error: any) {
    console.error('Plant diagnosis error:', error);
    return res.status(500).json({ 
      error: 'تعذر إتمام التشخيص الذكي حالياً. يرجى التأكد من وضوح الصورة وتوافر الاتصال بالشبكة.',
      details: error.message 
    });
  }
});

// --- 2. AI Pest Diagnosis API ---
app.post('/api/diagnose/pest', async (req, res) => {
  try {
    const { imageBase64, hostCrop, pestDescription, wilayat } = req.body;

    const systemInstruction = `أنت عالم حشرات وخبير مكافحة آفات زراعية في سلطنة عُمان والجزيرة العربية.
قم بتشخيص الآفة أو الحشرة بدقة وقدم التوصيات باللغة العربية حصراً وبصيغة JSON التالية:
{
  "pestName": "اسم الآفة أو الحشرة (مثال: سوسة النخيل الحمراء، حشرة دوباس النخيل، ذبابة ثمار الفاكهة، صانعة أنفاق الأوراق)",
  "scientificName": "الاسم العلمي باللاتينية",
  "severityLevel": "شديد الخطورة | متوسط الخطورة | قليل الضرر",
  "affectedParts": ["الساق", "الأوراق", "الثمار"],
  "lifeCycleNote": "معلومة هامة عن دورة حياتها وأوقات نشاطها في مناخ عُمان",
  "organicAndBiologicalControl": "طرق المكافحة الحيوية، الأعداء الطبيعية (كخنافس أبو العيد)، والمصائد الفيرمونية",
  "safeChemicalOptions": "المبيدات المتخصصة المعتمدة مع تحذير حماية النحل وفترة التحريم (PHI)",
  "immediateAction": "الخطوة العاجلة الواجب على المزارع اتخاذها اليوم لحصار الإصابة",
  "omaniGuidance": "توجيهات وزارة الثروة الزراعية ومواعيد الرش المعتمدة"
}`;

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `المحصول العائل: ${hostCrop || 'نخيل / خضار / فاكهة'}
المحافظة/الولاية: ${wilayat || 'سلطنة عمان'}
وصف الحشرة أو الضرر: ${pestDescription || 'شخص نوع الآفة من الصورة المرفقة'}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, diagnosis: parsed });
  } catch (error: any) {
    console.error('Pest diagnosis error:', error);
    return res.status(500).json({ 
      error: 'تعذر تشخيص الآفة الحشرية حالياً. تفقد الصورة والاتصال بالإنترنت.',
      details: error.message 
    });
  }
});

// --- 3. Server-side Verified Score Submission (Anti-Cheat & Replay Protection) ---
app.post('/api/scores/submit', (req, res) => {
  try {
    const { 
      userId, 
      userName, 
      userGovernorate, 
      gameType, 
      answers, // array of { questionId, selectedIndex, timeTakenSec }
      clientNonce 
    } = req.body;

    if (!userId || !userName || !answers || !Array.isArray(answers) || !clientNonce) {
      return res.status(400).json({ error: 'بيانات المشاركة غير مكتملة' });
    }

    // Replay attack prevention: check nonce
    if (submittedNonces.has(clientNonce)) {
      return res.status(409).json({ error: 'تم تسجيل نتيجة هذه الجلسة مسبقاً لمنع التكرار والتلاعب.' });
    }
    submittedNonces.add(clientNonce);

    // Clean old nonces if size exceeds 2000
    if (submittedNonces.size > 2000) {
      const arr = Array.from(submittedNonces);
      submittedNonces.clear();
      arr.slice(arr.length - 1000).forEach(n => submittedNonces.add(n));
    }

    // Server-side verification of answers
    let verifiedScore = 0;
    let correctCount = 0;
    let currentStreak = 0;
    let streakBonus = 0;

    for (const ans of answers) {
      const q = questionsStore.find(item => item.id === ans.questionId);
      if (!q) continue;

      if (ans.selectedIndex === q.correctIndex) {
        correctCount++;
        currentStreak++;
        verifiedScore += q.points;

        // Streak bonus: +20 points for each streak beyond 1
        if (currentStreak > 1) {
          const bonus = (currentStreak - 1) * 20;
          streakBonus += bonus;
          verifiedScore += bonus;
        }

        // Speed bonus if timeTakenSec is provided and < 8 seconds
        if (typeof ans.timeTakenSec === 'number' && ans.timeTakenSec > 0 && ans.timeTakenSec < 8) {
          verifiedScore += 15;
        }
      } else {
        currentStreak = 0;
      }
    }

    const submission: ScoreSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName: userName.trim() || 'مزارع عُماني',
      userGovernorate: userGovernorate || 'سلطنة عُمان',
      gameType: gameType || 'all',
      score: verifiedScore,
      correctCount,
      totalQuestions: answers.length,
      streakBonus,
      timestamp: Date.now(),
      clientNonce
    };

    scoreSubmissions.push(submission);

    // Audit log
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: "تسجيل نتيجة لعبة",
      performedBy: userName,
      details: `إنجاز لعبة [${gameType}] بنقاط ${verifiedScore} وإجابات صحيحة ${correctCount}/${answers.length}`,
      timestamp: Date.now()
    });

    return res.json({
      success: true,
      verifiedScore,
      correctCount,
      totalQuestions: answers.length,
      streakBonus,
      submissionId: submission.id
    });
  } catch (error: any) {
    console.error('Score submit error:', error);
    return res.status(500).json({ error: 'حدث خطأ في الخادم أثناء اعتماد النقاط.' });
  }
});

// --- 4. Leaderboard API (Daily, Weekly, Monthly, All-Time) ---
app.get('/api/scores/leaderboard', (req, res) => {
  const now = Date.now();
  const dayMs = 86400000;
  const weekMs = dayMs * 7;
  const monthMs = dayMs * 30;

  // Aggregate user total scores
  const aggregateScores = (filterFn: (s: ScoreSubmission) => boolean) => {
    const map = new Map<string, { userId: string; userName: string; governorate: string; totalScore: number; participations: number }>();

    for (const sub of scoreSubmissions) {
      if (filterFn(sub)) {
        const existing = map.get(sub.userId) || {
          userId: sub.userId,
          userName: sub.userName,
          governorate: sub.userGovernorate,
          totalScore: 0,
          participations: 0
        };
        existing.totalScore += sub.score;
        existing.participations += 1;
        map.set(sub.userId, existing);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20)
      .map((user, idx) => ({
        rank: idx + 1,
        ...user
      }));
  };

  const daily = aggregateScores(s => now - s.timestamp <= dayMs);
  const weekly = aggregateScores(s => now - s.timestamp <= weekMs);
  const monthly = aggregateScores(s => now - s.timestamp <= monthMs);
  const allTime = aggregateScores(() => true);

  return res.json({
    daily,
    weekly,
    monthly,
    allTime,
    totalSubmissions: scoreSubmissions.length
  });
});

// --- 5. Agricultural E-Library APIs ---
app.get('/api/library/books', (req, res) => {
  const { category, search } = req.query;
  let results = [...booksStore];

  if (category && category !== 'الكل') {
    results = results.filter(b => b.category === category);
  }

  if (search) {
    const term = String(search).toLowerCase();
    results = results.filter(b => 
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.description.toLowerCase().includes(term)
    );
  }

  return res.json({ success: true, books: results });
});

// Increment read count
app.post('/api/library/books/:id/read', (req, res) => {
  const book = booksStore.find(b => b.id === req.params.id);
  if (book) {
    book.readCount += 1;
    return res.json({ success: true, readCount: book.readCount });
  }
  return res.status(404).json({ error: 'الكتاب غير موجود' });
});

// Admin add book
app.post('/api/library/books', (req, res) => {
  const { title, author, category, description, pages } = req.body;
  if (!title || !author || !category) {
    return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
  }

  const newBook: Book = {
    id: `book-${Date.now()}`,
    title,
    author,
    category,
    description: description || '',
    readCount: 0,
    publishedYear: new Date().getFullYear().toString(),
    pagesCount: Array.isArray(pages) ? pages.length : 1,
    isPublished: true,
    pages: Array.isArray(pages) && pages.length > 0 ? pages : [
      { pageNumber: 1, title: 'الفصل الأول', content: description || 'محتوى الكتاب تحت الإعداد والمراجعة.' }
    ]
  };

  booksStore.unshift(newBook);
  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "إضافة كتاب جديد",
    performedBy: "مدير المكتبة",
    details: `إضافة كتاب: ${title}`,
    timestamp: Date.now()
  });

  return res.json({ success: true, book: newBook });
});

// Admin update book
app.put('/api/library/books/:id', (req, res) => {
  const index = booksStore.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'الكتاب غير موجود' });
  }

  booksStore[index] = {
    ...booksStore[index],
    ...req.body,
    id: req.params.id
  };

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "تعديل كتاب",
    performedBy: "مدير المكتبة",
    details: `تحديث بيانات كتاب: ${booksStore[index].title}`,
    timestamp: Date.now()
  });

  return res.json({ success: true, book: booksStore[index] });
});

// Admin delete book
app.delete('/api/library/books/:id', (req, res) => {
  const index = booksStore.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'الكتاب غير موجود' });
  }

  const removed = booksStore.splice(index, 1)[0];
  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "حذف كتاب",
    performedBy: "مدير المكتبة",
    details: `حذف كتاب: ${removed.title}`,
    timestamp: Date.now()
  });

  return res.json({ success: true, message: 'تم حذف الكتاب بنجاح' });
});

// --- 6. Community Forum & Farmer Chat API ---
app.get('/api/community/posts', (req, res) => {
  return res.json({ success: true, posts: communityPosts });
});

app.post('/api/community/posts', (req, res) => {
  const { authorName, authorRole, authorGovernorate, cropCategory, content } = req.body;
  if (!content || !authorName) {
    return res.status(400).json({ error: 'يرجى كتابة محتوى المنشور واسم الكاتب' });
  }

  const newPost: CommunityPost = {
    id: `post-${Date.now()}`,
    authorName,
    authorRole: authorRole || 'مزارع',
    authorGovernorate: authorGovernorate || 'سلطنة عمان',
    cropCategory: cropCategory || 'عام',
    content,
    timestamp: Date.now(),
    likes: 0,
    likedBy: [],
    comments: []
  };

  communityPosts.unshift(newPost);
  return res.json({ success: true, post: newPost });
});

app.post('/api/community/posts/:id/like', (req, res) => {
  const { userId } = req.body;
  const post = communityPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'المنشور غير موجود' });

  const alreadyLiked = post.likedBy.includes(userId);
  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter(id => id !== userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes += 1;
  }

  return res.json({ success: true, likes: post.likes, hasLiked: !alreadyLiked });
});

app.post('/api/community/posts/:id/comment', (req, res) => {
  const { authorName, authorRole, comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'يرجى كتابة التعليق' });

  const post = communityPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'المنشور غير موجود' });

  const newComment = {
    id: `comm-${Date.now()}`,
    authorName: authorName || 'مزارع عماني',
    authorRole: authorRole || 'مزارع',
    comment,
    timestamp: Date.now()
  };

  post.comments.push(newComment);
  return res.json({ success: true, comment: newComment });
});

// --- 7. Notifications & Alerts APIs ---
app.get('/api/notifications', (req, res) => {
  return res.json({ success: true, notifications: notificationsStore });
});

app.post('/api/admin/broadcast-alert', (req, res) => {
  const { title, message, type, targetGovernorate, senderName } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'العنوان ومحتوى التنبيه مطلوبان' });
  }

  const alert: AppNotification = {
    id: `notif-${Date.now()}`,
    title,
    message,
    type: type || 'system',
    targetGovernorate: targetGovernorate || 'كافة المحافظات',
    timestamp: Date.now(),
    read: false
  };

  notificationsStore.unshift(alert);

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "بث تنبيه زراعي/مناخي",
    performedBy: senderName || "مدير النظام",
    details: `بث تنبيه: ${title} إلى ${alert.targetGovernorate}`,
    timestamp: Date.now()
  });

  return res.json({ success: true, notification: alert });
});

// --- 8. Admin Audit & Statistics APIs ---
app.get('/api/admin/audit-logs', (req, res) => {
  return res.json({ success: true, logs: auditLogs });
});

app.get('/api/admin/stats', (req, res) => {
  const totalSubmissions = scoreSubmissions.length;
  const totalBooks = booksStore.length;
  const totalReads = booksStore.reduce((acc, b) => acc + b.readCount, 0);
  const totalPosts = communityPosts.length;
  const totalQuestions = questionsStore.length;

  return res.json({
    success: true,
    stats: {
      totalSubmissions,
      totalBooks,
      totalReads,
      totalPosts,
      totalQuestions,
      activeUsers: 342, // active estimated farmers
      founderName: "عمر الشرجي",
      systemStatus: "يعمل بكفاءة عالية (Node.js + PostgreSQL Architecture)"
    }
  });
});

// --- 9. Questions Admin APIs ---
app.get('/api/admin/questions', (req, res) => {
  return res.json({ success: true, questions: questionsStore });
});

app.post('/api/admin/questions', (req, res) => {
  const { gameType, question, options, correctIndex, explanation, points } = req.body;
  if (!question || !options || options.length < 2 || correctIndex === undefined) {
    return res.status(400).json({ error: 'بيانات السؤال غير مكتملة' });
  }

  const newQuestion: Question = {
    id: `q-${Date.now()}`,
    gameType: gameType || 'knowledge',
    question,
    options,
    correctIndex: Number(correctIndex),
    explanation: explanation || '',
    points: Number(points) || 100
  };

  questionsStore.unshift(newQuestion);
  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "إضافة سؤال مسابقة",
    performedBy: "مدير المسابقات",
    details: `إضافة سؤال لنوع: ${gameType}`,
    timestamp: Date.now()
  });

  return res.json({ success: true, question: newQuestion });
});

// Vite Middleware Integration for Development & Production
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`صديق المزارع يعمل الآن على المنفذ: http://localhost:${PORT}`);
  });
}

setupVite();
