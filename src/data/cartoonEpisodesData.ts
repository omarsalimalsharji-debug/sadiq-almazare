export type CartoonBackdrop =
  | 'oasis_falaj'
  | 'palm_grove'
  | 'greenhouse'
  | 'sunny_field';

export type FlijanPose =
  | 'wave'
  | 'explain'
  | 'inspect'
  | 'celebrate'
  | 'caution';

export type FlijanMood = 'happy' | 'curious' | 'warning' | 'proud';

export type CartoonProp =
  | 'water_drop'
  | 'palm_tree'
  | 'magnifying_glass'
  | 'bee'
  | 'sun_shield'
  | 'fertilizer_bag';

export interface CartoonScene {
  id: string;
  /** Internal editorial beat label only — never prefix with "المشهد 1/2" */
  sceneHeading: string;
  narration: string;
  /** Manually proofread vocalized (Tashkeel) narration fed to TTS */
  vocalizedNarration?: string;
  subtitle: string;
  backdrop: CartoonBackdrop;
  flijanPose: FlijanPose;
  flijanMood: FlijanMood;
  prop: CartoonProp;
}

export interface CartoonEpisode {
  id: string;
  title: string;
  category:
    | 'الري والأفلاج'
    | 'وقاية النخيل'
    | 'مكافحة الآفات'
    | 'التسميد والتربة'
    | 'البيوت المحمية';
  durationLabel: string;
  takeaway: string;
  /** 3 concise bullet takeaways displayed in the connected video's summary sequence */
  summaryPoints?: [string, string, string];
  /** Artwork used for film card poster and connected video backdrop */
  heroArtwork?: string;
  /** Produced connected MP4 streams (1080p standard + 480p low bandwidth) */
  video1080pUrl?: string;
  video480pUrl?: string;
  /** Mastered -16 LUFS audio with -13 dB ducked CC0 music */
  audioMasterUrl?: string;
  subtitlesVttUrl?: string;
  musicAttribution?: string;
  isCustom?: boolean;
  scenes: CartoonScene[];
}

export const INITIAL_CARTOON_EPISODES: CartoonEpisode[] = [
  {
    id: 'ep-falaj-drip',
    title: 'حكاية الرّي بالتنقيط وأفلاج عُمان',
    category: 'الري والأفلاج',
    durationLabel: '0:58 د',
    takeaway: 'الري بالتنقيط في الصباح الباكر يوفر حتى 45% من الماء ويحمي الجذور.',
    summaryPoints: [
      'ارْوِ نباتاتك فجراً أو مساءً لتفادي التبخر الحار',
      'وجّه النقاطات مباشرة نحو منطقة الجذور لا الممرات',
      'وفّر قرابة 45% من مياه الفلج وحافظ على خضرة المزرعة',
    ],
    heroArtwork: '/media/posters/oman_falaj_drip.jpg',
    video1080pUrl: '/media/videos/ep-falaj-drip-1080p.mp4',
    video480pUrl: '/media/videos/ep-falaj-drip-480p.mp4',
    audioMasterUrl: '/media/audio/ep-falaj-drip-master.mp3',
    subtitlesVttUrl: '/media/subtitles/ep-falaj-drip.vtt',
    musicAttribution: 'موسيقى هادئة أصلية مرخّصة للمشاع الإبداعي (CC0 1.0) — صديق المزارع',
    scenes: [
      {
        id: 'hook',
        sceneHeading: 'نداء الأفلاج العُمانية',
        narration:
          'أهلاً بكم يا مزارعي سلطنة عُمان! أنا فليجان، واليوم نكشف سرّ الحفاظ على مياه أفلاجنا وآبارنا بذكاء.',
        vocalizedNarration:
          'أَهْلاً بِكُمْ يَا مُزَارِعِي سَلْطَنَةِ عُمَانَ! أَنَا فْلَيْجَانُ، وَالْيَوْمَ نَكْشِفُ سِرَّ الْحِفَاظِ عَلَى مِيَاهِ أَفْلَاجِنَا وَآبَارِنَا بِذَكَاءٍ.',
        subtitle:
          'أهلاً بكم في مزرعة فليجان؛ كيف نحافظ على كل قطرة من مياه الأفلاج والآبار؟',
        backdrop: 'oasis_falaj',
        flijanPose: 'wave',
        flijanMood: 'happy',
        prop: 'water_drop',
      },
      {
        id: 'problem',
        sceneHeading: 'هدر الماء وقت الظهيرة',
        narration:
          'الري الغزير وقت اشتداد الشمس يتبخر سريعاً قبل أن تصل القطرة للجذور، وقد يخنق التربة ويضعف النمو.',
        vocalizedNarration:
          'الرَّيُّ الْغَزِيرُ وَقْتَ اشْتِدَادِ الشَّمْسِ يَتَبَخَّرُ سَرِيعاً قَبْلَ أَنْ تَصِلَ الْقَطْرَةُ لِلْجُذُورِ، وَقَدْ يَخْنُقُ التُّرْبَةَ وَيُضْعِفُ النُّمُوَّ.',
        subtitle:
          'الري بالغمر وقت الظهيرة يضيع بالبخر ويجهد جذور المحاصيل.',
        backdrop: 'sunny_field',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'sun_shield',
      },
      {
        id: 'solution',
        sceneHeading: 'شبكة التنقيط الصباحية',
        narration:
          'الحل العملي هو تشغيل شبكة التنقيط عند الفجر أو بعد العصر؛ فتصل كل قطرة بهدوء إلى منطقة الجذور.',
        vocalizedNarration:
          'الْحَلُّ الْعَمَلِيُّ هُوَ تَشْغِيلُ شَبَكَةِ التَّنْقِيطِ عِنْدَ الْفَجْرِ أَوْ بَعْدَ الْعَصْرِ؛ فَتَصِلُ كُلُّ قَطْرَةٍ بِهُدُوءٍ إِلَى مِنْطَقَةِ الْجُذُورِ.',
        subtitle:
          'شغّل شبكة التنقيط فجراً أو مساءً لتوصيل الماء مباشرة إلى الجذور.',
        backdrop: 'palm_grove',
        flijanPose: 'explain',
        flijanMood: 'curious',
        prop: 'water_drop',
      },
      {
        id: 'summary',
        sceneHeading: 'حصاد أوفر وماء محفوظ',
        narration:
          'نلخص درسنا: اروِ فجراً، اضبط النقاطات عند الجذر، واقتصد قرابة خمسة وأربعين في المئة من الماء لحصاد أوفر.',
        vocalizedNarration:
          'نُلَخِّصُ دَرْسَنَا: ارْوِ فَجْراً، اضْبِطِ النَّقَّاطَاتِ عِنْدَ الْجَذْرِ، وَاقْتَصِدْ قُرَابَةَ خَمْسَةٍ وَأَرْبَعِينَ فِي الْمِئَةِ مِنَ الْمَاءِ لِحَصَادٍ أَوْفَرَ.',
        subtitle:
          'توفير 45% من المياه ومحصول أقوى عبر التنقيط المنتظم.',
        backdrop: 'oasis_falaj',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'palm_tree',
      },
    ],
  },
  {
    id: 'ep-palm-weevil',
    title: 'حماية النخيل من السوسة الحمراء',
    category: 'وقاية النخيل',
    durationLabel: '1:02 د',
    takeaway: 'افحص قاعدة الجذع أسبوعياً وعالج جروح التقليم فوراً لحماية النخلة.',
    summaryPoints: [
      'افحص قاعدة الجذع والفسائل كل أسبوع بحثاً عن نشارة رطبة',
      'أغلق جروح التقليم وفصل الفسائل فوراً بمادة مطهرة',
      'ثبّت المصائد الفيرمونية بعيداً وأبلغ المرشد عند الاشتباه',
    ],
    heroArtwork: '/media/posters/oman_palm_weevil_care.jpg',
    video1080pUrl: '/media/videos/ep-palm-weevil-1080p.mp4',
    video480pUrl: '/media/videos/ep-palm-weevil-480p.mp4',
    audioMasterUrl: '/media/audio/ep-palm-weevil-master.mp3',
    subtitlesVttUrl: '/media/subtitles/ep-palm-weevil.vtt',
    musicAttribution: 'موسيقى هادئة أصلية مرخّصة للمشاع الإبداعي (CC0 1.0) — صديق المزارع',
    scenes: [
      {
        id: 'hook',
        sceneHeading: 'ثروة النخيل العُماني',
        narration:
          'النخلة رمز الخير في سمائل وكل ولايات عُمان، لكن سوسة النخيل الحمراء تتسلل بصمت إلى قلب الجذع إن لم ننتبه.',
        vocalizedNarration:
          'النَّخْلَةُ رَمْزُ الْخَيْرِ فِي سَمَائِلَ وَكُلِّ وِلَايَاتِ عُمَانَ، لَكِنَّ سُوسَةَ النَّخِيلِ الْحَمْرَاءَ تَتَسَلَّلُ بِصَمْتٍ إِلَى قَلْبِ الْجِذْعِ إِنْ لَمْ نَنْتَبِهْ.',
        subtitle:
          'النخلة ثروة وطنية، وسوسة النخيل الحمراء تتسلل بصمت إذا أهملنا الفحص.',
        backdrop: 'palm_grove',
        flijanPose: 'wave',
        flijanMood: 'curious',
        prop: 'palm_tree',
      },
      {
        id: 'problem',
        sceneHeading: 'علامات الإنذار المبكرة',
        narration:
          'تفقدوا قاعدة النخلة والفسائل أسبوعياً؛ فوجود إفرازات صمغية بنية أو نشارة خشب رطبة يعني خطراً مبكراً.',
        vocalizedNarration:
          'تَفَقَّدُوا قَاعِدَةَ النَّخْلَةِ وَالْفَسَائِلِ أُسْبُوعِيّاً؛ فَوُجُودُ إِفْرَازَاتٍ صَمْغِيَّةٍ بُنِّيَّةٍ أَوْ نُشَارَةِ خَشَبٍ رَطْبَةٍ يَعْنِي خَطَراً مُبَكِّراً.',
        subtitle:
          'راقب قاعدة الجذع: الإفرازات الصمغية أو نشارة الخشب الرطبة إنذار مبكر.',
        backdrop: 'palm_grove',
        flijanPose: 'inspect',
        flijanMood: 'warning',
        prop: 'magnifying_glass',
      },
      {
        id: 'solution',
        sceneHeading: 'تغطية الجروح والمصائد',
        narration:
          'بعد التقليم أو قلع الفسائل نغطي الجرح فوراً بمطهر زراعي مناسب، ونركّب المصائد الفيرمونية بعيداً عن الجذع.',
        vocalizedNarration:
          'بَعْدَ التَّقْلِيمِ أَوْ قَلْعِ الْفَسَائِلِ نُغَطِّي الْجُرْحَ فَوْراً بِمُطَهِّرٍ زِرَاعِيٍّ مُنَاسِبٍ، وَنُرَكِّبُ الْمَصَائِدَ الْفِيرْمُونِيَّةَ بَعِيداً عَنِ الْجِذْعِ.',
        subtitle:
          'طهّر جروح التقليم فوراً واستخدم المصائد الفيرمونية في محيط المزرعة.',
        backdrop: 'oasis_falaj',
        flijanPose: 'explain',
        flijanMood: 'happy',
        prop: 'palm_tree',
      },
      {
        id: 'summary',
        sceneHeading: 'حماية البساتين بالتعاون',
        narration:
          'تذكّر دائماً: فحص أسبوعي، تطهير الجروح، والتواصل السريع مع المرشد الزراعي لحماية بساتين الولاية.',
        vocalizedNarration:
          'تَذَكَّرْ دَائِماً: فَحْصٌ أُسْبُوعِيٌّ، تَطْهِيرُ الْجُرُوحِ، وَالتَّوَاصُلُ السَّرِيعُ مَعَ الْمُرْشِدِ الزِّرَاعِيِّ لِحِمَايَةِ بَسَاتِينِ الْوِلَايَةِ.',
        subtitle:
          'الفحص الأسبوعي والتبليغ الفوري يحميان نخيل عُمان كلها.',
        backdrop: 'palm_grove',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'palm_tree',
      },
    ],
  },
  {
    id: 'ep-powdery-mildew',
    title: 'وداعاً للبياض الدقيقي في البيوت المحمية',
    category: 'البيوت المحمية',
    durationLabel: '0:56 د',
    takeaway: 'التهوية الجيدة والرش العضوي بزيت النيم أو البيكربونات يوقفان البياض الدقيقي.',
    summaryPoints: [
      'افتح شبابيك التهوية يومياً لتقليل الرطوبة الراكدة',
      'قلّم الأوراق السفلية المتزاحمة لتنفس النباتات',
      'رش زيت النيم أو بيكربونات البوتاسيوم في الصباح الباكر',
    ],
    heroArtwork: '/media/posters/oman_greenhouse_care.jpg',
    video1080pUrl: '/media/videos/ep-powdery-mildew-1080p.mp4',
    video480pUrl: '/media/videos/ep-powdery-mildew-480p.mp4',
    audioMasterUrl: '/media/audio/ep-powdery-mildew-master.mp3',
    subtitlesVttUrl: '/media/subtitles/ep-powdery-mildew.vtt',
    musicAttribution: 'موسيقى هادئة أصلية مرخّصة للمشاع الإبداعي (CC0 1.0) — صديق المزارع',
    scenes: [
      {
        id: 'hook',
        sceneHeading: 'بقع بيضاء تشبه الطحين',
        narration:
          'هل لاحظت بقعاً بيضاء تشبه الطحين على أوراق الطماطم والخيار في البيت المحمي؟ هذا هو مرض البياض الدقيقي!',
        vocalizedNarration:
          'هَلْ لَاحَظْتَ بُقَعاً بَيْضَاءَ تُشْبِهُ الطَّحِينَ عَلَى أَوْرَاقِ الطَّمَاطِمِ وَالْخِيَارِ فِي الْبَيْتِ الْمَحْمِيِّ؟ هَذَا هُوَ مَرَضُ الْبَيَاضِ الدَّقِيقِيِّ!',
        subtitle:
          'المسحوق الأبيض على أوراق الطماطم والخيار هو مرض البياض الدقيقي.',
        backdrop: 'greenhouse',
        flijanPose: 'inspect',
        flijanMood: 'curious',
        prop: 'magnifying_glass',
      },
      {
        id: 'problem',
        sceneHeading: 'الرطوبة الراكدة وتزاحم الأوراق',
        narration:
          'ينشط هذا الفطر سريعاً عند تزاحم الشتلات وضعف التهوية وبلل الأوراق مع انخفاض الحرارة ليلاً.',
        vocalizedNarration:
          'يَنْشَطُ هَذَا الْفِطْرُ سَرِيعاً عِنْدَ تَزَاحُمِ الشَّتْلَاتِ وَضَعْفِ التَّهْوِيَةِ وَبَلَلِ الْأَوْرَاقِ مَعَ انْخِفَاضِ الْحَرَارَةِ لَيْلاً.',
        subtitle:
          'تزاحم الأوراق وقلة التهوية يهيئان بيئة مثالية لانتشار الفطر.',
        backdrop: 'greenhouse',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'water_drop',
      },
      {
        id: 'solution',
        sceneHeading: 'التهوية والرش العضوي الآمن',
        narration:
          'نخفف الأوراق السفلية المتزاحمة ونفتح التهوية صباحاً، ثم نرش زيت النيم أو محلول بيكربونات البوتاسيوم بانتظام.',
        vocalizedNarration:
          'نُخَفِّفُ الْأَوْرَاقَ السُّفْلِيَّةَ الْمُتَزَاحِمَةَ وَنَفْتَحُ التَّهْوِيَةَ صَبَاحاً، ثُمَّ نَرُشُّ زَيْتَ النِّيمِ أَوْ مَحْلُولَ بِيكَرْبُونَاتِ الْبُوتَاسْيُومِ بِانْتِظَامٍ.',
        subtitle:
          'افتح التهوية وخفف الأوراق ثم رش زيت النيم أو البيكربونات صباحاً.',
        backdrop: 'greenhouse',
        flijanPose: 'explain',
        flijanMood: 'happy',
        prop: 'sun_shield',
      },
      {
        id: 'summary',
        sceneHeading: 'بيوت محمية نظيفة',
        narration:
          'الخلاصة في ثلاث خطوات: تهوية مستمرة، تقليم خفيف للأوراق السفلية، ومكافحة عضوية مبكرة لثمار نظيفة.',
        vocalizedNarration:
          'الْخُلَاصَةُ فِي ثَلَاثِ خُطُوَاتٍ: تَهْوِيَةٌ مُسْتَمِرَّةٌ، تَقْلِيمٌ خَفِيفٌ لِلْأَوْرَاقِ السُّفْلِيَّةِ، وَمُكَافَحَةٌ عُضْوِيَّةٌ مُبَكِّرَةٌ لِثِمَارٍ نَظِيفَةٍ.',
        subtitle:
          'الوقاية المنتظمة تحافظ على خضرة المحصول بدون متبقيات ضارة.',
        backdrop: 'greenhouse',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'fertilizer_bag',
      },
    ],
  },
  {
    id: 'ep-protect-bees',
    title: 'حماية نحل العسل العُماني عند مكافحة الآفات',
    category: 'مكافحة الآفات',
    durationLabel: '0:59 د',
    takeaway: 'تجنب الرش وقت تفتح الأزهار ونفذ الرش المسائي بعد غروب الشمس لحماية النحل.',
    summaryPoints: [
      'أوقف أي رش حشري نهاراً أثناء تفتح الأزهار ونشاط النحل',
      'اختر المكافحة الحيوية أولاً وتنسيق مواعيد الرش مع النحالين',
      'نفّذ الرش الضروري مساءً بعد غروب الشمس وعودة النحل للخلايا',
    ],
    heroArtwork: '/media/posters/oman_honeybee_orchard.jpg',
    video1080pUrl: '/media/videos/ep-protect-bees-1080p.mp4',
    video480pUrl: '/media/videos/ep-protect-bees-480p.mp4',
    audioMasterUrl: '/media/audio/ep-protect-bees-master.mp3',
    subtitlesVttUrl: '/media/subtitles/ep-protect-bees.vtt',
    musicAttribution: 'موسيقى هادئة أصلية مرخّصة للمشاع الإبداعي (CC0 1.0) — صديق المزارع',
    scenes: [
      {
        id: 'hook',
        sceneHeading: 'النحلة شريكة الإنتاج',
        narration:
          'هل تعلم أن نحل العسل العُماني هو شريكك الأول في تلقيح الأزهار وزيادة عقد الثمار في بساتيننا؟',
        vocalizedNarration:
          'هَلْ تَعْلَمُ أَنَّ نَحْلَ الْعَسَلِ الْعُمَانِيَّ هُوَ شَرِيكُكَ الْأَوَّلُ فِي تَلْقِيحِ الْأَزْهَارِ وَزِيَادَةِ عَقْدِ الثِّمَارِ فِي بَسَاتِينِنَا؟',
        subtitle:
          'نحل العسل العُماني شريك أساسي في التلقيح ووفرة الثمار.',
        backdrop: 'sunny_field',
        flijanPose: 'wave',
        flijanMood: 'happy',
        prop: 'bee',
      },
      {
        id: 'problem',
        sceneHeading: 'خطر الرش النهاري على المناحل',
        narration:
          'رش المبيدات نهاراً وقت تفتح الأزهار يفتك بالنحل السارح ويضعف المناحل ويقلل جودة التلقيح والإنتاج.',
        vocalizedNarration:
          'رَشُّ الْمُبِيدَاتِ نَهَاراً وَقْتَ تَفَتُّحِ الْأَزْهَارِ يَفْتِكُ بِالنَّحْلِ السَّارِحِ وَيُضْعِفُ الْمَنَاحِلَ وَيُقَلِّلُ جَوْدَةَ التَّلْقِيحِ وَالْإِنْتَاجِ.',
        subtitle:
          'الرش النهاري أثناء الإزهار يهدد المناحل ويضعف عقد المحاصيل.',
        backdrop: 'sunny_field',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'bee',
      },
      {
        id: 'solution',
        sceneHeading: 'توقيت الرش المسائي الآمن',
        narration:
          'نبدأ بالمكافحة الحيوية الآمنة، وإن استدعى الأمر رشاً فنختار المساء بعد غروب الشمس وعودة النحل للخلايا.',
        vocalizedNarration:
          'نَبْدَأُ بِالْمُكَافَحَةِ الْحَيَوِيَّةِ الْآمِنَةِ، وَإِنِ اسْتَدْعَى الْأَمْرُ رَشّاً فَنَخْتَارُ الْمَسَاءَ بَعْدَ غُرُوبِ الشَّمْسِ وَعَوْدَةِ النَّحْلِ لِلْخَلَايَا.',
        subtitle:
          'اعتمد المكافحة الحيوية أو نفذ الرش مساءً بعد عودة النحل للخلايا.',
        backdrop: 'oasis_falaj',
        flijanPose: 'explain',
        flijanMood: 'curious',
        prop: 'sun_shield',
      },
      {
        id: 'summary',
        sceneHeading: 'عسل عُماني ومزرعة مزدهرة',
        narration:
          'احفظ القاعدة الذهبية: لا رشّ أثناء الإزهار نهاراً، تواصل مع النحال المجاور، وبارك الله في رزق مزرعتك.',
        vocalizedNarration:
          'احْفَظِ الْقَاعِدَةَ الذَّهَبِيَّةَ: لَا رَشَّ أَثْنَاءَ الْإِزْهَارِ نَهَاراً، تَوَاصَلْ مَعَ النَّحَّالِ الْمُجَاوِرِ، وَبَارَكَ اللَّهُ فِي رِزْقِ مَزْرَعَتِكَ.',
        subtitle:
          'حماية النحل تحفظ التوازن البيئي وتزيد بركة المزرعة والعسل.',
        backdrop: 'oasis_falaj',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'bee',
      },
    ],
  },
  {
    id: 'ep-summer-fertilizer',
    title: 'التسميد المتوازن وحماية الجذور في الحر',
    category: 'التسميد والتربة',
    durationLabel: '0:57 د',
    takeaway: 'قسّم السماد لجرعات صغيرة مع الري البارد وتجنب التسميد الكيميائي في ذروة الصيف.',
    summaryPoints: [
      'أضف السماد العضوي المتحلل لتحسين احتفاظ التربة بالرطوبة',
      'قسّم الجرعات إلى دفعات خفيفة أسبوعية بدل دفعة ثقيلة',
      'اروِ التربة بماء بارد أولاً في الصباح قبل التسميد',
    ],
    heroArtwork: '/media/posters/oman_soil_compost.jpg',
    video1080pUrl: '/media/videos/ep-summer-fertilizer-1080p.mp4',
    video480pUrl: '/media/videos/ep-summer-fertilizer-480p.mp4',
    audioMasterUrl: '/media/audio/ep-summer-fertilizer-master.mp3',
    subtitlesVttUrl: '/media/subtitles/ep-summer-fertilizer.vtt',
    musicAttribution: 'موسيقى هادئة أصلية مرخّصة للمشاع الإبداعي (CC0 1.0) — صديق المزارع',
    scenes: [
      {
        id: 'hook',
        sceneHeading: 'هل الإكثار من السماد يسرّع النمو؟',
        narration:
          'يظن بعض المزارعين أن مضاعفة السماد تضاعف الثمار، لكن فليجان ينبهنا: الزيادة في الحر تحرق الجذور!',
        vocalizedNarration:
          'يَظُنُّ بَعْضُ الْمُزَارِعِينَ أَنَّ مُضَاعَفَةَ السَّمَادِ تُضَاعِفُ الثِّمَارَ، لَكِنَّ فْلَيْجَانَ يُنَبِّهُنَا: الزِّيَادَةُ فِي الْحَرِّ تَحْرِقُ الْجُذُورَ!',
        subtitle:
          'مضاعفة السماد في قيظ الصيف ترفع الملوحة وتضر الشعيرات الجذرية.',
        backdrop: 'sunny_field',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'fertilizer_bag',
      },
      {
        id: 'problem',
        sceneHeading: 'فائدة السماد العضوي المتحلل',
        narration:
          'في المقابل، السماد العضوي المعالج والمتحلل يغذي التربة ببطء ويحفظ رطوبتها ويخفف إجهاد الحرارة.',
        vocalizedNarration:
          'فِي الْمُقَابِلِ، السَّمَادُ الْعُضْوِيُّ الْمُعَالَجُ وَالْمُتَحَلِّلُ يُغَذِّي التُّرْبَةَ بِبُطْءٍ وَيَحْفَظُ رُطُوبَتَهَا وَيُخَفِّفُ إِجْهَادَ الْحَرَارَةِ.',
        subtitle:
          'السماد العضوي المتحلل يرفع خصوبة التربة ويخفف الإجهاد الحراري.',
        backdrop: 'palm_grove',
        flijanPose: 'explain',
        flijanMood: 'happy',
        prop: 'fertilizer_bag',
      },
      {
        id: 'solution',
        sceneHeading: 'جرعات خفيفة بعد الري الصباحي',
        narration:
          'نوزع السماد على دفعات أسبوعية خفيفة في الصباح الباكر بعد ترطيب التربة بالماء البارد لحماية الجذور.',
        vocalizedNarration:
          'نُوَزِّعُ السَّمَادَ عَلَى دُفَعَاتٍ أُسْبُوعِيَّةٍ خَفِيفَةٍ فِي الصَّبَاحِ الْبَاكِرِ بَعْدَ تَرْطِيبِ التُّرْبَةِ بِالْمَاءِ الْبَارِدِ لِحِمَايَةِ الْجُذُورِ.',
        subtitle:
          'قسّم السماد لدفعات خفيفة صباحاً بعد ترطيب التربة بالماء.',
        backdrop: 'oasis_falaj',
        flijanPose: 'inspect',
        flijanMood: 'curious',
        prop: 'water_drop',
      },
      {
        id: 'summary',
        sceneHeading: 'مناعة طبيعية وإنتاج مستدام',
        narration:
          'تذكر الثلاثية الذهبية: سماد عضوي متحلل، جرعات صغيرة، وري مسبق لتنعم بنبات قوي يقاوم الآفات.',
        vocalizedNarration:
          'تَذَكَّرِ الثُّلَاثِيَّةَ الذَّهَبِيَّةَ: سَمَادٌ عُضْوِيٌّ مُتَحَلِّلٌ، جُرَعَاتٌ صَغِيرَةٌ، وَرَيٌّ مُسْبَقٌ لِتَنْعَمَ بِنَبَاتٍ قَوِيٍّ يُقَاوِمُ الْآفَاتِ.',
        subtitle:
          'التغذية المتوازنة تمنح النبات مناعة طبيعية وتقلل الحاجة للمبيدات.',
        backdrop: 'palm_grove',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'palm_tree',
      },
    ],
  },
];
