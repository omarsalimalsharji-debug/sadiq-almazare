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
  sceneHeading: string;
  narration: string;
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
  isCustom?: boolean;
  scenes: CartoonScene[];
}

export const INITIAL_CARTOON_EPISODES: CartoonEpisode[] = [
  {
    id: 'ep-falaj-drip',
    title: 'حكاية الري بالتنقيط وأفلاج عُمان',
    category: 'الري والأفلاج',
    durationLabel: '1:10 د',
    takeaway: 'الري بالتنقيط في الصباح الباكر يوفر حتى 45% من الماء ويحمي الجذور.',
    scenes: [
      {
        id: 's1',
        sceneHeading: 'مرحباً بكم في مزرعة فليجان!',
        narration:
          'أهلاً بكم يا أصدقائي المزارعين في سلطنة عُمان! أنا فليجان، واليوم سنكتشف معاً سر الحفاظ على مياه أفلاجنا وآبارنا بذكاء.',
        subtitle:
          'أهلاً بكم يا مزارعي عُمان! أنا فليجان، سنتعلم اليوم سر الحفاظ على مياه الأفلاج والآبار.',
        backdrop: 'oasis_falaj',
        flijanPose: 'wave',
        flijanMood: 'happy',
        prop: 'water_drop',
      },
      {
        id: 's2',
        sceneHeading: 'لماذا نهدر الماء وقت الظهيرة؟',
        narration:
          'الري الغزير وقت اشتداد الشمس يتبخر سريعاً قبل أن تستفيد منه الجذور، وقد يسبب اختناق التربة وتعفنها.',
        subtitle:
          'الري وقت الظهيرة يزيد التبخر ويفقد النبات رطوبته الثمينة.',
        backdrop: 'sunny_field',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'sun_shield',
      },
      {
        id: 's3',
        sceneHeading: 'الحل الذكي: التنقيط الصباحي',
        narration:
          'عندما نستخدم شبكة الري بالتنقيط في الفجر أو المساء، تصل كل قطرة ماء مباشرة إلى منطقة الجذور بهدوء وانتظام.',
        subtitle:
          'الري بالتنقيط في الفجر أو المساء يوصل الماء مباشرة إلى الجذور.',
        backdrop: 'palm_grove',
        flijanPose: 'explain',
        flijanMood: 'curious',
        prop: 'water_drop',
      },
      {
        id: 's4',
        sceneHeading: 'حصاد وفير ومياه محفوظة',
        narration:
          'بهذه الطريقة نوفر قرابة نصف كمية المياه، ونحصل على ثمار قوية وجودة عالية بإذن الله!',
        subtitle:
          'النتيجة: توفير قرابة 45% من المياه ومحصول أوفر وأجود!',
        backdrop: 'oasis_falaj',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'palm_tree',
      },
    ],
  },
  {
    id: 'ep-palm-weevil',
    title: 'فليجان يحمي النخيل من السوسة الحمراء',
    category: 'وقاية النخيل',
    durationLabel: '1:15 د',
    takeaway: 'افحص قاعدة الجذع أسبوعياً وعالج جروح التقليم فوراً لحماية النخلة.',
    scenes: [
      {
        id: 's1',
        sceneHeading: 'كنز عُمان الأخضر في خطر؟',
        narration:
          'النخلة هي رمز الخير في بلادنا، لكن حشرة صغيرة اسمها سوسة النخيل الحمراء تتسلل بصمت داخل الجذع إذا أهملنا الفحص.',
        subtitle:
          'النخلة ثروة عُمانية، وسوسة النخيل الحمراء قد تتسلل للجذع بصمت.',
        backdrop: 'palm_grove',
        flijanPose: 'wave',
        flijanMood: 'curious',
        prop: 'palm_tree',
      },
      {
        id: 's2',
        sceneHeading: 'كيف نكتشفها مبكراً بالعدسة؟',
        narration:
          'تفقدوا قاعدة النخلة ومكان الفسائل كل أسبوع. إذا رأيتم إفرازات صمغية بنية أو نشارة خشب رطبة، فهذه علامة إنذار مبكرة.',
        subtitle:
          'راقب قاعدة الجذع: الإفرازات الصمغية أو نشارة الخشب علامة إنذار مبكرة.',
        backdrop: 'palm_grove',
        flijanPose: 'inspect',
        flijanMood: 'warning',
        prop: 'magnifying_glass',
      },
      {
        id: 's3',
        sceneHeading: 'إغلاق الجروح والمصائد الفيرمونية',
        narration:
          'بعد تقليم السعف أو فصل الفسائل، نغطي مكان القطع فوراً بمادة مطهرة أو طين معالج، ونضع المصائد الفيرمونية بعيداً عن الجذع.',
        subtitle:
          'غطِّ جروح التقليم فوراً بالمطهر المناسب واستخدم المصائد الفيرمونية.',
        backdrop: 'oasis_falaj',
        flijanPose: 'explain',
        flijanMood: 'happy',
        prop: 'palm_tree',
      },
      {
        id: 's4',
        sceneHeading: 'سلامة مزرعتنا بوعينا',
        narration:
          'ولا تنسوا: إذا اشتبهتم بإصابة شديدة، تواصلوا فوراً مع مركز التنمية الزراعية لحماية بساتين الولاية كاملة.',
        subtitle:
          'الكشف المبكر والتواصل مع المرشد الزراعي يحميان بساتين الولاية كلها.',
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
    durationLabel: '1:05 د',
    takeaway: 'التهوية الجيدة والرش العضوي بزيت النيم أو البيكربونات يوقفان البياض الدقيقي.',
    scenes: [
      {
        id: 's1',
        sceneHeading: 'بقع بيضاء على أوراق الطماطم!',
        narration:
          'لاحظ فليجان اليوم مسحوقاً أبيض يشبه الطحين على أوراق الطماطم والخيار داخل البيت المحمي. هذا هو مرض البياض الدقيقي!',
        subtitle:
          'المسحوق الأبيض على أوراق الطماطم والخيار هو مرض البياض الدقيقي.',
        backdrop: 'greenhouse',
        flijanPose: 'inspect',
        flijanMood: 'curious',
        prop: 'magnifying_glass',
      },
      {
        id: 's2',
        sceneHeading: 'أصل المشكلة: رطوبة راكدة',
        narration:
          'ينشط هذا الفطر عندما تتزاحم النباتات وتنخفض التهوية وتبتل الأوراق في المساء البارد.',
        subtitle:
          'تزاحم النباتات وقلة التهوية يهيئان البيئة لنمو الفطر سريعاً.',
        backdrop: 'greenhouse',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'water_drop',
      },
      {
        id: 's3',
        sceneHeading: 'المكافحة العضوية الآمنة',
        narration:
          'نبدأ بتقليم الأوراق السفلية المتزاحمة، ثم نفتح شبابيك التهوية، ونرش مستخلص زيت النيم أو محلول بيكربونات البوتاسيوم صباحاً.',
        subtitle:
          'افتح التهوية، خفف الأوراق المتزاحمة، ورش زيت النيم أو البيكربونات صباحاً.',
        backdrop: 'greenhouse',
        flijanPose: 'explain',
        flijanMood: 'happy',
        prop: 'sun_shield',
      },
      {
        id: 's4',
        sceneHeading: 'أوراق خضراء وثمار نظيفة',
        narration:
          'مع الانتظام والوقاية الأسبوعية، تبقى البيوت المحمية نظيفة وخالية من المتبقيات الضارة!',
        subtitle:
          'الوقاية المنتظمة تحافظ على خضرة الأوراق وجودة الثمار بدون متبقيات ضارة.',
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
    durationLabel: '1:10 د',
    takeaway: 'تجنب الرش وقت تفتح الأزهار ونفذ الرش المسائي بعد غروب الشمس لحماية النحل.',
    scenes: [
      {
        id: 's1',
        sceneHeading: 'النحلة صديقة المزارع الأولى',
        narration:
          'هل تعلم أن نحل العسل العُماني هو المسؤول الأول عن تلقيح الأزهار وزيادة عقد الثمار في مزارعنا؟',
        subtitle:
          'نحل العسل العُماني شريك أساسي في التلقيح وزيادة عقد الثمار.',
        backdrop: 'sunny_field',
        flijanPose: 'wave',
        flijanMood: 'happy',
        prop: 'bee',
      },
      {
        id: 's2',
        sceneHeading: 'خطأ شائع يهدد المناحل',
        narration:
          'رش المبيدات الحشرية نهاراً أثناء نشاط النحل على الأزهار يؤدي إلى هلاك النحل وتراجع إنتاج العسل والمحاصيل.',
        subtitle:
          'رش المبيدات نهاراً وقت تفتح الأزهار يضر النحل ويقلل التلقيح.',
        backdrop: 'sunny_field',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'bee',
      },
      {
        id: 's3',
        sceneHeading: 'القاعدة الذهبية للرش الآمن',
        narration:
          'يفضل الاعتماد على المكافحة الحيوية أولاً، وإذا اضطررنا للرش نختار المساء بعد عودة النحل للخلايا مع الالتزام التام بفترة الأمان.',
        subtitle:
          'استخدم المكافحة الحيوية أو رش في المساء بعد غروب الشمس وعودة النحل للخلايا.',
        backdrop: 'oasis_falaj',
        flijanPose: 'explain',
        flijanMood: 'curious',
        prop: 'sun_shield',
      },
      {
        id: 's4',
        sceneHeading: 'عسل عُماني ومحصول مزدهر',
        narration:
          'عندما نحمي النحل، نحمي التوازن البيئي ونبارك في رزق المزرعة بإذن الله.',
        subtitle:
          'حماية النحل تحافظ على التوازن البيئي وتزيد بركة وإنتاجية المزرعة.',
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
    durationLabel: '1:05 د',
    takeaway: 'قسّم السماد لجرعات صغيرة مع الري البارد وتجنب التسميد الكيميائي في ذروة الصيف.',
    scenes: [
      {
        id: 's1',
        sceneHeading: 'هل الإكثار من السماد مفيد؟',
        narration:
          'كثيرون يظنون أن مضاعفة السماد تسرّع النمو، لكن فليجان يحذرنا: السماد الزائد في حرارة الصيف يحرق الجذور!',
        subtitle:
          'مضاعفة السماد في الجو الحار ترفع ملوحة التربة وتحرق الجذور.',
        backdrop: 'sunny_field',
        flijanPose: 'caution',
        flijanMood: 'warning',
        prop: 'fertilizer_bag',
      },
      {
        id: 's2',
        sceneHeading: 'السماد العضوي المتحلل أولاً',
        narration:
          'السماد البلدي المعالج والمتحلل يغذي التربة ببطء، ويحسن احتفاظها بالرطوبة، ويخفف صدمات الحرارة عن الجذور.',
        subtitle:
          'السماد العضوي المتحلل يرفع خصوبة التربة ويحفظ رطوبتها في الحر.',
        backdrop: 'palm_grove',
        flijanPose: 'explain',
        flijanMood: 'happy',
        prop: 'fertilizer_bag',
      },
      {
        id: 's3',
        sceneHeading: 'التسميد على دفعات مع الري',
        narration:
          'وزع التسميد على دفعات أسبوعية خفيفة بعد ري التربة بالماء البارد في الصباح الباكر، وتابع لون الأوراق الجديدة.',
        subtitle:
          'قسّم السماد لدفعات خفيفة مع الري الصباحي بعد ترطيب التربة.',
        backdrop: 'oasis_falaj',
        flijanPose: 'inspect',
        flijanMood: 'curious',
        prop: 'water_drop',
      },
      {
        id: 's4',
        sceneHeading: 'نبات قوي ومقاوم للأمراض',
        narration:
          'التغذية المتوازنة تصنع نباتاً قوياً يقاوم الآفات وتقل حاجته للمبيدات!',
        subtitle:
          'التوازن الغذائي يمنح النبات مناعة طبيعية ضد الأمراض والإجهاد.',
        backdrop: 'palm_grove',
        flijanPose: 'celebrate',
        flijanMood: 'proud',
        prop: 'palm_tree',
      },
    ],
  },
];
