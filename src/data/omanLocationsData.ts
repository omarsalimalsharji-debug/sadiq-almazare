/**
 * Complete Official Administrative Hierarchy of the Sultanate of Oman
 * سلطنة عُمان ← المحافظة (11) ← الولاية (63) ← القرية أو المنطقة الزراعية
 * Pure data + Haversine & fuzzy-name resolution helpers (Zero external asset deps)
 */

export type OmanAgroZone =
  | 'coastal_batinah'
  | 'interior_oasis'
  | 'mountain_hajar'
  | 'dhofar_monsoon'
  | 'desert_plains'
  | 'musandam_straits';

export interface OmanWilayat {
  id: string;
  governorateId: string;
  name: string;
  nameEn: string;
  lat: number;
  lon: number;
  agroZone: OmanAgroZone;
  villages: string[];
  aliases?: string[];
}

export interface OmanGovernorateAdmin {
  id: string;
  name: string;
  nameEn: string;
  lat: number;
  lon: number;
  defaultAgroZone: OmanAgroZone;
  climateNote: string;
  aliases?: string[];
  wilayats: OmanWilayat[];
}

export const AGRO_ZONE_ADVICE: Record<
  OmanAgroZone,
  {
    labelAr: string;
    irrigationHint: string;
    cropsFocus: string;
    pestWatch: string;
  }
> = {
  coastal_batinah: {
    labelAr: 'السهل الساحلي الرطب والباطنة',
    irrigationHint: 'يفضّل الري بالتنقيط صباحاً ومراقبة ملوحة مياه الآبار.',
    cropsFocus: 'الليمون العُماني، المانجو، الطماطم، الخيار، الجت، البصل، الفلفل.',
    pestWatch: 'راقب صانعة الأنفاق، الذبابة البيضاء، وحلم الغبار عند ارتفاع الحرارة.',
  },
  interior_oasis: {
    labelAr: 'الواحات الداخلية والأفلاج',
    irrigationHint: 'اضبط حصص الفلج والري التكميلي فجراً لتقليل التبخر الجاف.',
    cropsFocus: 'نخيل الفرض والخلاص، الثوم العُماني، البصل، القمح، القت، الحمضيات.',
    pestWatch: 'تابع دوباس النخيل، سوسة النخيل الحمراء، والحميرة في أوقات السكون.',
  },
  mountain_hajar: {
    labelAr: 'المرتفعات الجبلية (الحجر والجبل الأخضر)',
    irrigationHint: 'التربة المدرجة تصرّف الماء سريعاً؛ اعتمد رياً متقارباً ومغطياً للجذور.',
    cropsFocus: 'الرمان، الخوخ، المشمش، الجوز، الورد العُماني، الزيتون، الثوم الجبلي.',
    pestWatch: 'احمِ الشتلات من الصقيع الشتوي والبياض الدقيقي وحفارات الساق.',
  },
  dhofar_monsoon: {
    labelAr: 'نطاق الخريف والسهول الجنوبية (ظفار)',
    irrigationHint: 'قلل الري صيفاً مع رذاذ الخريف، وحافظ على تصريف التربة لمنع التعفن.',
    cropsFocus: 'النارجيل (جوز الهند)، الموز، الفافاي، اللبان، الأعلاف، الخضار الموسمية.',
    pestWatch: 'راقب الأعراض الفطرية وندوة الأوراق والآفات القشرية مع الرطوبة العالية.',
  },
  desert_plains: {
    labelAr: 'السهول الداخلية والبادية',
    irrigationHint: 'الري الليلي أو قبل الشروق ضروري مع مصدات رياح وأسمدة عضوية ممسكة للرطوبة.',
    cropsFocus: 'التمور المقاومة، الأعلاف الملحية، الخضار المحمية المبردة، السدر.',
    pestWatch: 'احذر الإجهاد الحراري الشديد والتربس والعناكب في البيوت المحمية.',
  },
  musandam_straits: {
    labelAr: 'المضائق والسفوح الجبلية الشمالية (مسندم)',
    irrigationHint: 'استفد من حصاد مياه الأمطار والمدرجات ووجّه النقاطات مباشرة للجذر.',
    cropsFocus: 'النخيل، الحمضيات، التين، المانجو، الأعلاف المحلية.',
    pestWatch: 'تأكد من التهوية والتقليم لتفادي العناكب والذبابة البيضاء.',
  },
};

export const OMAN_ADMINISTRATIVE_DATA: OmanGovernorateAdmin[] = [
  {
    id: 'muscat',
    name: 'محافظة مسقط',
    nameEn: 'Muscat',
    lat: 23.588,
    lon: 58.3829,
    defaultAgroZone: 'coastal_batinah',
    climateNote: 'طقس ساحلي معتدل شتاءً ورطب صيفاً، بساتين نخيل وخضار محمية.',
    aliases: ['muscat', 'مسقط'],
    wilayats: [
      {
        id: 'muscat_city',
        governorateId: 'muscat',
        name: 'مسقط',
        nameEn: 'Muscat',
        lat: 23.6143,
        lon: 58.5922,
        agroZone: 'coastal_batinah',
        villages: ['مسقط القديمة', 'سداب', 'البستان', 'قنتب', 'يتي', 'السيفة'],
        aliases: ['مسقط', 'muscat'],
      },
      {
        id: 'mutrah',
        governorateId: 'muscat',
        name: 'مطرح',
        nameEn: 'Mutrah',
        lat: 23.6206,
        lon: 58.5671,
        agroZone: 'coastal_batinah',
        villages: ['مطرح', 'روي', 'الوطية', 'دارست', 'وادي كبير'],
        aliases: ['مطرح', 'mutrah', 'muttrah'],
      },
      {
        id: 'al_amerat',
        governorateId: 'muscat',
        name: 'العامرات',
        nameEn: 'Al Amerat',
        lat: 23.5167,
        lon: 58.5008,
        agroZone: 'interior_oasis',
        villages: ['العامرات', 'الحاجر', 'جحلوت', 'وادي حطاط', 'العتكية', 'سمكت'],
        aliases: ['العامرات', 'عامرات', 'amerat', 'al amerat'],
      },
      {
        id: 'bawshar',
        governorateId: 'muscat',
        name: 'بوشر',
        nameEn: 'Bawshar',
        lat: 23.5625,
        lon: 58.3991,
        agroZone: 'coastal_batinah',
        villages: ['بوشر', 'الغبرة', 'العذيبة', 'الخوير', 'الأنصب', 'فلج الشام', 'صنب'],
        aliases: ['بوشر', 'bawshar', 'bousher'],
      },
      {
        id: 'seeb',
        governorateId: 'muscat',
        name: 'السيب',
        nameEn: 'As Seeb',
        lat: 23.6703,
        lon: 58.1891,
        agroZone: 'coastal_batinah',
        villages: ['السيب', 'الخوض', 'الحيل', 'المعبيلة', 'الموالح', 'وادي اللوامي', 'الشرادي'],
        aliases: ['السيب', 'سيب', 'seeb', 'as seeb'],
      },
      {
        id: 'qurayyat',
        governorateId: 'muscat',
        name: 'قريات',
        nameEn: 'Qurayyat',
        lat: 23.2611,
        lon: 58.9182,
        agroZone: 'coastal_batinah',
        villages: ['قريات', 'المزارع', 'وادي ضيقة', 'دغمر', 'فنس', 'بمة', 'حي الظاهر'],
        aliases: ['قريات', 'qurayyat', 'quryat'],
      },
    ],
  },
  {
    id: 'dakhiliyah',
    name: 'محافظة الداخلية',
    nameEn: 'Ad Dakhiliyah',
    lat: 22.9333,
    lon: 57.5333,
    defaultAgroZone: 'interior_oasis',
    climateNote: 'واحات نخيل وأفلاج تاريخية عريقة وبرودة متوسطية بالجبل الأخضر.',
    aliases: ['dakhiliyah', 'ad dakhiliyah', 'الداخلية', 'داخلية'],
    wilayats: [
      {
        id: 'nizwa',
        governorateId: 'dakhiliyah',
        name: 'نزوى',
        nameEn: 'Nizwa',
        lat: 22.9333,
        lon: 57.5333,
        agroZone: 'interior_oasis',
        villages: ['نزوى المركز', 'تنوف', 'بركة الموز', 'فرق', 'كرشاء', 'حي التراث', 'وادي كلبوه', 'كمه'],
        aliases: ['نزوى', 'nizwa'],
      },
      {
        id: 'samail',
        governorateId: 'dakhiliyah',
        name: 'سمائل',
        nameEn: 'Samail',
        lat: 23.2981,
        lon: 57.9686,
        agroZone: 'interior_oasis',
        villages: [
          'وادي محرم',
          'سرور',
          'لزغ',
          'فنجاء',
          'الخوبار',
          'المدرة',
          'سفالة سمائل',
          'العلاية',
          'طوي النصف',
          'الدسر',
          'وادي العق',
        ],
        aliases: ['سمائل', 'samail', 'sumail'],
      },
      {
        id: 'bahla',
        governorateId: 'dakhiliyah',
        name: 'بهلاء',
        nameEn: 'Bahla',
        lat: 22.9647,
        lon: 57.3008,
        agroZone: 'interior_oasis',
        villages: ['بهلاء', 'جبرين', 'بسياء', 'سنت', 'وادي قريات', 'العقير', 'بلادسيت'],
        aliases: ['بهلاء', 'بهلا', 'bahla'],
      },
      {
        id: 'adam',
        governorateId: 'dakhiliyah',
        name: 'أدم',
        nameEn: 'Adam',
        lat: 22.3754,
        lon: 57.5231,
        agroZone: 'desert_plains',
        villages: ['أدم', 'الجامع', 'فلج السليل', 'رأس الجبل', 'قرن العلم', 'الزاهب'],
        aliases: ['أدم', 'ادم', 'adam'],
      },
      {
        id: 'al_hamra',
        governorateId: 'dakhiliyah',
        name: 'الحمراء',
        nameEn: 'Al Hamra',
        lat: 23.1128,
        lon: 57.3081,
        agroZone: 'mountain_hajar',
        villages: ['الحمراء', 'مسفاة العبريين', 'جبل شمس', 'وادي غول', 'العارض', 'بلد سيت'],
        aliases: ['الحمراء', 'حمراء', 'al hamra', 'hamra'],
      },
      {
        id: 'manah',
        governorateId: 'dakhiliyah',
        name: 'منح',
        nameEn: 'Manah',
        lat: 22.7931,
        lon: 57.5906,
        agroZone: 'interior_oasis',
        villages: ['منح', 'البلاد', 'معمد', 'المعري', 'أبو نخيلة', 'حارة البلاد'],
        aliases: ['منح', 'manah'],
      },
      {
        id: 'izki',
        governorateId: 'dakhiliyah',
        name: 'إزكي',
        nameEn: 'Izki',
        lat: 22.9339,
        lon: 57.7689,
        agroZone: 'interior_oasis',
        villages: ['إزكي', 'إمطي', 'قلعة العوامر', 'القريتين', 'شافع', 'سيماء', 'زكيت'],
        aliases: ['إزكي', 'ازكي', 'izki'],
      },
      {
        id: 'bidbid',
        governorateId: 'dakhiliyah',
        name: 'بدبد',
        nameEn: 'Bidbid',
        lat: 23.4092,
        lon: 58.1278,
        agroZone: 'interior_oasis',
        villages: ['بدبد', 'فنجاء', 'سيح المعيدن', 'العمقات', 'ثميد', 'وادي الضبعون'],
        aliases: ['بدبد', 'bidbid'],
      },
      {
        id: 'jabal_akhdar',
        governorateId: 'dakhiliyah',
        name: 'الجبل الأخضر',
        nameEn: 'Al Jabal Al Akhdar',
        lat: 23.0715,
        lon: 57.6612,
        agroZone: 'mountain_hajar',
        villages: ['سيح قطنة', 'العين', 'الشريجة', 'وادي بني حبيب', 'سيق', 'حيل اليمن', 'السوجرة'],
        aliases: ['الجبل الأخضر', 'جبل اخضر', 'jabal akhdar', 'saiq'],
      },
    ],
  },
  {
    id: 'batinah_north',
    name: 'محافظة شمال الباطنة',
    nameEn: 'North Al Batinah',
    lat: 24.3461,
    lon: 56.7075,
    defaultAgroZone: 'coastal_batinah',
    climateNote: 'السهل الزراعي الخصيب للسلطنة ومزارع الخضار والفواكه والحمضيات.',
    aliases: ['north al batinah', 'batinah north', 'شمال الباطنة'],
    wilayats: [
      {
        id: 'sohar',
        governorateId: 'batinah_north',
        name: 'صحار',
        nameEn: 'Sohar',
        lat: 24.3643,
        lon: 56.7468,
        agroZone: 'coastal_batinah',
        villages: ['صحار', 'مويلح', 'فلج القبائل', 'الطريف', 'وادي حيبي', 'وادي عاهن', 'العوينات'],
        aliases: ['صحار', 'sohar', 'suhar'],
      },
      {
        id: 'shinas',
        governorateId: 'batinah_north',
        name: 'شناص',
        nameEn: 'Shinas',
        lat: 24.7429,
        lon: 56.4659,
        agroZone: 'coastal_batinah',
        villages: ['شناص', 'العقر', 'أسرار بني عمر', 'البليدة', 'سور العبري', 'النعمى'],
        aliases: ['شناص', 'shinas'],
      },
      {
        id: 'liwa',
        governorateId: 'batinah_north',
        name: 'لوى',
        nameEn: 'Liwa',
        lat: 24.5308,
        lon: 56.5653,
        agroZone: 'coastal_batinah',
        villages: ['لوى', 'نبر', 'حرمول', 'غضفان', 'الرميلة', 'فزح'],
        aliases: ['لوى', 'لوى', 'liwa'],
      },
      {
        id: 'saham',
        governorateId: 'batinah_north',
        name: 'صحم',
        nameEn: 'Saham',
        lat: 24.1722,
        lon: 56.8886,
        agroZone: 'coastal_batinah',
        villages: ['صحم', 'مخيليف', 'ديل آل عبد السلام', 'أم الجعاريف', 'الفليج', 'وادي المحموم'],
        aliases: ['صحم', 'saham'],
      },
      {
        id: 'khaburah',
        governorateId: 'batinah_north',
        name: 'الخابورة',
        nameEn: 'Al Khaburah',
        lat: 23.9718,
        lon: 57.0937,
        agroZone: 'coastal_batinah',
        villages: ['الخابورة', 'القصف', 'البريك', 'قصبية آل بوسعيد', 'وادي الحواسنة', 'الهجاري'],
        aliases: ['الخابورة', 'خابورة', 'khaburah', 'al khaburah'],
      },
      {
        id: 'suwayq',
        governorateId: 'batinah_north',
        name: 'السويق',
        nameEn: 'As Suwayq',
        lat: 23.8494,
        lon: 57.4386,
        agroZone: 'coastal_batinah',
        villages: ['السويق', 'الخضراء', 'الثرمد', 'بطحاء هلال', 'وادي الجهاور', 'ضيان'],
        aliases: ['السويق', 'سويق', 'suwayq', 'suwaiq'],
      },
    ],
  },
  {
    id: 'batinah_south',
    name: 'محافظة جنوب الباطنة',
    nameEn: 'South Al Batinah',
    lat: 23.3914,
    lon: 57.4244,
    defaultAgroZone: 'coastal_batinah',
    climateNote: 'عيون مائية متدفقة وسهول ومشاريع زراعة محمية وبساتين.',
    aliases: ['south al batinah', 'batinah south', 'جنوب الباطنة'],
    wilayats: [
      {
        id: 'rustaq',
        governorateId: 'batinah_south',
        name: 'الرستاق',
        nameEn: 'Rustaq',
        lat: 23.3908,
        lon: 57.4244,
        agroZone: 'interior_oasis',
        villages: ['الرستاق', 'الحوقين', 'وادي بني غافر', 'وادي السحتن', 'فلج الحديث', 'المسفاة', 'عين الكسفة'],
        aliases: ['الرستاق', 'رستاق', 'rustaq'],
      },
      {
        id: 'awabi',
        governorateId: 'batinah_south',
        name: 'العوابي',
        nameEn: 'Al Awabi',
        lat: 23.3033,
        lon: 57.5306,
        agroZone: 'mountain_hajar',
        villages: ['العوابي', 'وادي بني خروص', 'ستال', 'الهجير', 'العلياء', 'السهل'],
        aliases: ['العوابي', 'عوابي', 'awabi', 'al awabi'],
      },
      {
        id: 'nakhal',
        governorateId: 'batinah_south',
        name: 'نخل',
        nameEn: 'Nakhal',
        lat: 23.3951,
        lon: 57.8286,
        agroZone: 'interior_oasis',
        villages: ['نخل', 'عين الثوارة', 'وادي مستل', 'وكان', 'الطو', 'حلبان'],
        aliases: ['نخل', 'nakhal'],
      },
      {
        id: 'wadi_maawil',
        governorateId: 'batinah_south',
        name: 'وادي المعاول',
        nameEn: 'Wadi Al Maawil',
        lat: 23.4389,
        lon: 57.8233,
        agroZone: 'interior_oasis',
        villages: ['أفي', 'اللاجال', 'مسلمات', 'المريغة', 'حبراء', 'واشحي'],
        aliases: ['وادي المعاول', 'wadi al maawil', 'معاول'],
      },
      {
        id: 'barka',
        governorateId: 'batinah_south',
        name: 'بركاء',
        nameEn: 'Barka',
        lat: 23.6787,
        lon: 57.8861,
        agroZone: 'coastal_batinah',
        villages: ['بركاء', 'الرميس', 'الصومحان', 'قرحة البلوش', 'المريصي', 'البلة', 'حفري'],
        aliases: ['بركاء', 'بركا', 'barka'],
      },
      {
        id: 'musannah',
        governorateId: 'batinah_south',
        name: 'المصنعة',
        nameEn: 'Al Musannah',
        lat: 23.7636,
        lon: 57.6247,
        agroZone: 'coastal_batinah',
        villages: ['المصنعة', 'الملدة', 'ودام الساحل', 'الشعيبة', 'المغسر', 'أبو عبالي'],
        aliases: ['المصنعة', 'مصنعة', 'musannah', 'al musannah'],
      },
    ],
  },
  {
    id: 'dhofar',
    name: 'محافظة ظفار',
    nameEn: 'Dhofar',
    lat: 17.0151,
    lon: 54.0924,
    defaultAgroZone: 'dhofar_monsoon',
    climateNote: 'موسم الخريف الفريد وزراعات النارجيل والموز والفافاي والأعلاف واللبان.',
    aliases: ['dhofar', 'ظفار'],
    wilayats: [
      {
        id: 'salalah',
        governorateId: 'dhofar',
        name: 'صلالة',
        nameEn: 'Salalah',
        lat: 17.0151,
        lon: 54.0924,
        agroZone: 'dhofar_monsoon',
        villages: ['صلالة الوسطى', 'الحافة', 'عوقد', 'الدهاريز', 'رزات', 'السعادة', 'وادي نحيز'],
        aliases: ['صلالة', 'salalah'],
      },
      {
        id: 'taqah',
        governorateId: 'dhofar',
        name: 'طاقة',
        nameEn: 'Taqah',
        lat: 17.0398,
        lon: 54.3983,
        agroZone: 'dhofar_monsoon',
        villages: ['طاقة', 'مدينة الحق', 'وادي دربات', 'جيبجات', 'خور روري'],
        aliases: ['طاقة', 'taqah'],
      },
      {
        id: 'mirbat',
        governorateId: 'dhofar',
        name: 'مرباط',
        nameEn: 'Mirbat',
        lat: 16.9922,
        lon: 54.6914,
        agroZone: 'dhofar_monsoon',
        villages: ['مرباط', 'طوي أعتير', 'يور', 'وادي عين', 'سمحان'],
        aliases: ['مرباط', 'mirbat'],
      },
      {
        id: 'rakhyut',
        governorateId: 'dhofar',
        name: 'رخيوت',
        nameEn: 'Rakhyut',
        lat: 16.7417,
        lon: 53.4036,
        agroZone: 'dhofar_monsoon',
        villages: ['رخيوت', 'شهب أصعيب', 'عجداروت', 'الحوطة'],
        aliases: ['رخيوت', 'rakhyut'],
      },
      {
        id: 'thumrait',
        governorateId: 'dhofar',
        name: 'ثمريت',
        nameEn: 'Thumrait',
        lat: 17.6697,
        lon: 54.0225,
        agroZone: 'desert_plains',
        villages: ['ثمريت', 'النجد', 'هيلة الراكة', 'وادي دوكة', 'مضبي', 'شصر'],
        aliases: ['ثمريت', 'thumrait'],
      },
      {
        id: 'dhalkut',
        governorateId: 'dhofar',
        name: 'ضلكوت',
        nameEn: 'Dhalkut',
        lat: 16.7069,
        lon: 53.2439,
        agroZone: 'dhofar_monsoon',
        villages: ['ضلكوت', 'خضرفي', 'صرفيت', 'ديم'],
        aliases: ['ضلكوت', 'dhalkut'],
      },
      {
        id: 'mazyunah',
        governorateId: 'dhofar',
        name: 'المزيونة',
        nameEn: 'Al Mazyunah',
        lat: 17.855,
        lon: 52.662,
        agroZone: 'desert_plains',
        villages: ['المزيونة', 'ميتن', 'توسنات', 'هرويب'],
        aliases: ['المزيونة', 'مزيونة', 'al mazyunah'],
      },
      {
        id: 'muqshin',
        governorateId: 'dhofar',
        name: 'مقشن',
        nameEn: 'Muqshin',
        lat: 19.505,
        lon: 54.888,
        agroZone: 'desert_plains',
        villages: ['مقشن', 'مرسودد', 'المنادر', 'المشاش'],
        aliases: ['مقشن', 'muqshin'],
      },
      {
        id: 'shaleem',
        governorateId: 'dhofar',
        name: 'شليم وجزر الحلانيات',
        nameEn: 'Shaleem and Al Hallaniyyat',
        lat: 18.111,
        lon: 55.622,
        agroZone: 'desert_plains',
        villages: ['شليم', 'الشويمية', 'ديميت', 'الحلانيات', 'فوت'],
        aliases: ['شليم', 'الحلانيات', 'shaleem'],
      },
      {
        id: 'sadah',
        governorateId: 'dhofar',
        name: 'سدح',
        nameEn: 'Sadah',
        lat: 17.0497,
        lon: 55.0706,
        agroZone: 'dhofar_monsoon',
        villages: ['سدح', 'حاسك', 'حدبين', 'جوفاء'],
        aliases: ['سدح', 'sadah'],
      },
    ],
  },
  {
    id: 'dhahirah',
    name: 'محافظة الظاهرة',
    nameEn: 'Ad Dhahirah',
    lat: 23.2307,
    lon: 56.5153,
    defaultAgroZone: 'interior_oasis',
    climateNote: 'شمس وفيرة لإنتاج أفخر تمور الخلاص والقمح العُماني والزراعة المروية.',
    aliases: ['dhahirah', 'ad dhahirah', 'الظاهرة', 'ظاهرة'],
    wilayats: [
      {
        id: 'ibri',
        governorateId: 'dhahirah',
        name: 'عبري',
        nameEn: 'Ibri',
        lat: 23.2257,
        lon: 56.5157,
        agroZone: 'interior_oasis',
        villages: ['عبري', 'السليف', 'العراقي', 'الدريز', 'بات', 'الهجر', 'مقنيات', 'كبارة'],
        aliases: ['عبري', 'ibri'],
      },
      {
        id: 'yanqul',
        governorateId: 'dhahirah',
        name: 'ينقل',
        nameEn: 'Yanqul',
        lat: 23.5861,
        lon: 56.5397,
        agroZone: 'mountain_hajar',
        villages: ['ينقل', 'الوقبة', 'العلاء', 'المري', 'ظاهر الفوارس', 'وادي الحريم'],
        aliases: ['ينقل', 'yanqul'],
      },
      {
        id: 'dhank',
        governorateId: 'dhahirah',
        name: 'ضنك',
        nameEn: 'Dhank',
        lat: 23.5503,
        lon: 56.2564,
        agroZone: 'interior_oasis',
        villages: ['ضنك', 'قميراء', 'دوت', 'فدا', 'العزيزي', 'وادي الفتح'],
        aliases: ['ضنك', 'dhank'],
      },
    ],
  },
  {
    id: 'sharqiyah_north',
    name: 'محافظة شمال الشرقية',
    nameEn: 'North Ash Sharqiyah',
    lat: 22.6906,
    lon: 58.5334,
    defaultAgroZone: 'interior_oasis',
    climateNote: 'أودية جارية ونخيل باسقة وواحات الرمال الذهبية والزراعة الصحراوية.',
    aliases: ['north ash sharqiyah', 'sharqiyah north', 'شمال الشرقية'],
    wilayats: [
      {
        id: 'ibra',
        governorateId: 'sharqiyah_north',
        name: 'إبراء',
        nameEn: 'Ibra',
        lat: 22.6906,
        lon: 58.5334,
        agroZone: 'interior_oasis',
        villages: ['إبراء', 'اليحمدي', 'السفالة', 'العلاية', 'الثابتي', 'الحايمة', 'قفيفة'],
        aliases: ['إبراء', 'ابراء', 'ibra'],
      },
      {
        id: 'mudhaibi',
        governorateId: 'sharqiyah_north',
        name: 'المضيبي',
        nameEn: 'Al Mudhaibi',
        lat: 22.5706,
        lon: 58.1186,
        agroZone: 'interior_oasis',
        villages: ['المضيبي', 'سمد الشأن', 'الروضة', 'الأفلاج', 'وادي عندام', 'الفتح', 'الجزع'],
        aliases: ['المضيبي', 'مضيبي', 'mudhaibi', 'al mudhaibi'],
      },
      {
        id: 'sinaw',
        governorateId: 'sharqiyah_north',
        name: 'سناو',
        nameEn: 'Sinaw',
        lat: 22.5019,
        lon: 58.0267,
        agroZone: 'desert_plains',
        villages: ['سناو', 'مقشاع', 'العيون', 'برزمان', 'المجازه', 'القابل سناو'],
        aliases: ['سناو', 'sinaw'],
      },
      {
        id: 'bidiya',
        governorateId: 'sharqiyah_north',
        name: 'بدية',
        nameEn: 'Bidiya',
        lat: 22.4483,
        lon: 58.8031,
        agroZone: 'interior_oasis',
        villages: ['المنترب', 'الغبي', 'الواصل', 'الظاهر', 'شاحك', 'الحوية'],
        aliases: ['بدية', 'bidiya', 'bidiyah'],
      },
      {
        id: 'qabil',
        governorateId: 'sharqiyah_north',
        name: 'القابل',
        nameEn: 'Al Qabil',
        lat: 22.5678,
        lon: 58.7022,
        agroZone: 'interior_oasis',
        villages: ['القابل', 'المضيرب', 'النبأ', 'الدريز', 'عز', 'القرى'],
        aliases: ['القابل', 'قابل', 'al qabil', 'qabil'],
      },
      {
        id: 'wadi_bani_khalid',
        governorateId: 'sharqiyah_north',
        name: 'وادي بني خالد',
        nameEn: 'Wadi Bani Khalid',
        lat: 22.6161,
        lon: 59.0919,
        agroZone: 'mountain_hajar',
        villages: ['مقل', 'العين', 'بضعة', 'سيح الحيل', 'مزيرع', 'القرية'],
        aliases: ['وادي بني خالد', 'wadi bani khalid'],
      },
      {
        id: 'dima_tayeen',
        governorateId: 'sharqiyah_north',
        name: 'دماء والطائيين',
        nameEn: "Dima W'Attayeen",
        lat: 23.0339,
        lon: 58.5739,
        agroZone: 'mountain_hajar',
        villages: ['محلاح', 'دماء', 'الطائيين', 'تول', 'الغبرة', 'مس'],
        aliases: ['دماء والطائيين', 'دماء', 'الطائيين', 'dima'],
      },
    ],
  },
  {
    id: 'sharqiyah_south',
    name: 'محافظة جنوب الشرقية',
    nameEn: 'South Ash Sharqiyah',
    lat: 22.5667,
    lon: 59.5289,
    defaultAgroZone: 'coastal_batinah',
    climateNote: 'رياح بحرية معتدلة ومزارع تمور وبساتين الفواكه الساحلية.',
    aliases: ['south ash sharqiyah', 'sharqiyah south', 'جنوب الشرقية'],
    wilayats: [
      {
        id: 'sur',
        governorateId: 'sharqiyah_south',
        name: 'صور',
        nameEn: 'Sur',
        lat: 22.5667,
        lon: 59.5289,
        agroZone: 'coastal_batinah',
        villages: ['صور', 'العيجة', 'رأس الحد', 'طيوي', 'قلهات', 'وادي شاب', 'بلاد صور'],
        aliases: ['صور', 'sur'],
      },
      {
        id: 'kamil_wafi',
        governorateId: 'sharqiyah_south',
        name: 'الكامل والوافي',
        nameEn: 'Al Kamil Wal Wafi',
        lat: 22.2156,
        lon: 59.205,
        agroZone: 'interior_oasis',
        villages: ['الكامل', 'الوافي', 'سبت', 'السيح الشرقي', 'طوى عائشة', 'وادي البطحاء'],
        aliases: ['الكامل والوافي', 'الكامل', 'الوافي', 'kamil'],
      },
      {
        id: 'jalan_bu_hassan',
        governorateId: 'sharqiyah_south',
        name: 'جعلان بني بو حسن',
        nameEn: 'Jalan Bani Bu Hassan',
        lat: 22.0886,
        lon: 59.2775,
        agroZone: 'interior_oasis',
        villages: ['جعلان بني بو حسن', 'الغينة', 'فليجة', 'سيح العلاء', 'القرين'],
        aliases: ['جعلان بني بو حسن', 'بوحسن', 'bu hassan'],
      },
      {
        id: 'jalan_bu_ali',
        governorateId: 'sharqiyah_south',
        name: 'جعلان بني بو علي',
        nameEn: 'Jalan Bani Bu Ali',
        lat: 22.0086,
        lon: 59.3272,
        agroZone: 'coastal_batinah',
        villages: ['جعلان بني بو علي', 'الأشخرة', 'السويح', 'رأس الرويس', 'أصيلة', 'الحدة'],
        aliases: ['جعلان بني بو علي', 'بوعلي', 'bu ali'],
      },
      {
        id: 'masirah',
        governorateId: 'sharqiyah_south',
        name: 'مصيرة',
        nameEn: 'Masirah',
        lat: 20.6694,
        lon: 58.8764,
        agroZone: 'coastal_batinah',
        villages: ['حلف', 'دفيات', 'مرصيص', 'قرن', 'شغف'],
        aliases: ['مصيرة', 'masirah'],
      },
    ],
  },
  {
    id: 'musandam',
    name: 'محافظة مسندم',
    nameEn: 'Musandam',
    lat: 26.1798,
    lon: 56.2483,
    defaultAgroZone: 'musandam_straits',
    climateNote: 'مضائق جبلية وزراعة المدرجات الصخرية والتين والحمضيات والنخيل.',
    aliases: ['musandam', 'مسندم'],
    wilayats: [
      {
        id: 'khasab',
        governorateId: 'musandam',
        name: 'خصب',
        nameEn: 'Khasab',
        lat: 26.1798,
        lon: 56.2483,
        agroZone: 'musandam_straits',
        villages: ['خصب', 'قدى', 'كمزار', 'ليما', 'غمضاء', 'رووس الجبال'],
        aliases: ['خصب', 'khasab'],
      },
      {
        id: 'dibba',
        governorateId: 'musandam',
        name: 'دبا',
        nameEn: 'Dibba',
        lat: 25.6378,
        lon: 56.2656,
        agroZone: 'musandam_straits',
        villages: ['دبا البيعة', 'خور معلى', 'زغي', 'السيح', 'حفه'],
        aliases: ['دبا', 'dibba'],
      },
      {
        id: 'bukha',
        governorateId: 'musandam',
        name: 'بخاء',
        nameEn: 'Bukha',
        lat: 26.1408,
        lon: 56.1489,
        agroZone: 'musandam_straits',
        villages: ['بخاء', 'تيبات', 'الجري', 'الجادي'],
        aliases: ['بخاء', 'بخا', 'bukha'],
      },
      {
        id: 'madha',
        governorateId: 'musandam',
        name: 'مدحاء',
        nameEn: 'Madha',
        lat: 25.2842,
        lon: 56.3328,
        agroZone: 'musandam_straits',
        villages: ['مدحاء الجديدة', 'الغونة', 'حجر بني حميد', 'الزراع'],
        aliases: ['مدحاء', 'مدحا', 'madha'],
      },
    ],
  },
  {
    id: 'wusta',
    name: 'محافظة الوسطى',
    nameEn: 'Al Wusta',
    lat: 19.9571,
    lon: 56.2758,
    defaultAgroZone: 'desert_plains',
    climateNote: 'أراضي شاسعة ومشاريع الزراعات الملحية والمحميات الرعوية.',
    aliases: ['al wusta', 'wusta', 'الوسطى'],
    wilayats: [
      {
        id: 'haima',
        governorateId: 'wusta',
        name: 'هيماء',
        nameEn: 'Haima',
        lat: 19.9571,
        lon: 56.2758,
        agroZone: 'desert_plains',
        villages: ['هيماء', 'العجائز', 'أبو مضابي', 'الغافتين', 'جعلوني'],
        aliases: ['هيماء', 'هيما', 'haima', 'hayma'],
      },
      {
        id: 'mahout',
        governorateId: 'wusta',
        name: 'محوت',
        nameEn: 'Mahout',
        lat: 20.5731,
        lon: 58.1636,
        agroZone: 'desert_plains',
        villages: ['محوت', 'حج', 'الجوبة', 'خلوف', 'صراب'],
        aliases: ['محوت', 'mahout', 'mahoot'],
      },
      {
        id: 'duqm',
        governorateId: 'wusta',
        name: 'الدقم',
        nameEn: 'Duqm',
        lat: 19.6561,
        lon: 57.7042,
        agroZone: 'desert_plains',
        villages: ['الدقم', 'صي', 'ظهر', 'رأس مدركة', 'نفون'],
        aliases: ['الدقم', 'دقم', 'duqm'],
      },
      {
        id: 'al_jazer',
        governorateId: 'wusta',
        name: 'الجازر',
        nameEn: 'Al Jazer',
        lat: 18.8819,
        lon: 56.6056,
        agroZone: 'desert_plains',
        villages: ['الكحل', 'لكبي', 'صوقرة', 'ريما', 'الخضراء'],
        aliases: ['الجازر', 'جازر', 'al jazer', 'jazer'],
      },
    ],
  },
  {
    id: 'buraimi',
    name: 'محافظة البريمي',
    nameEn: 'Al Buraimi',
    lat: 24.2509,
    lon: 55.7931,
    defaultAgroZone: 'interior_oasis',
    climateNote: 'مزارع تمور وأعلاف وزراعة خضروات في البيوت المحمية عالية الكفاءة.',
    aliases: ['al buraimi', 'buraimi', 'البريمي'],
    wilayats: [
      {
        id: 'buraimi_city',
        governorateId: 'buraimi',
        name: 'البريمي',
        nameEn: 'Al Buraimi',
        lat: 24.2509,
        lon: 55.7931,
        agroZone: 'interior_oasis',
        villages: ['البريمي', 'صعراء', 'حماسة', 'الغريفة', 'حفيت', 'أرض الجو', 'الفي'],
        aliases: ['البريمي', 'بريمي', 'buraimi'],
      },
      {
        id: 'mahdah',
        governorateId: 'buraimi',
        name: 'محضة',
        nameEn: 'Mahdah',
        lat: 24.4072,
        lon: 55.9739,
        agroZone: 'mountain_hajar',
        villages: ['محضة', 'الروضة', 'وادي الحيول', 'شرم', 'الخطوة', 'كتنة'],
        aliases: ['محضة', 'mahdah'],
      },
      {
        id: 'sunaynah',
        governorateId: 'buraimi',
        name: 'السنينة',
        nameEn: 'As Sunaynah',
        lat: 23.7222,
        lon: 55.8267,
        agroZone: 'desert_plains',
        villages: ['السنينة', 'الهرموزي', 'العويدة', 'مسروق', 'المعيزيلة'],
        aliases: ['السنينة', 'سنينة', 'sunaynah', 'as sunaynah'],
      },
    ],
  },
];

export const ALL_OMAN_WILAYATS: OmanWilayat[] = OMAN_ADMINISTRATIVE_DATA.flatMap(
  (g) => g.wilayats
);

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isRoughlyWithinOman(lat: number, lon: number): boolean {
  return lat >= 16.4 && lat <= 26.6 && lon >= 51.8 && lon <= 60.2;
}

export interface ResolvedOmanAdmin {
  governorate: OmanGovernorateAdmin;
  wilayat: OmanWilayat;
  village: string;
  distanceKm: number;
  withinOman: boolean;
}

export function findNearestOmanLocation(lat: number, lon: number): ResolvedOmanAdmin {
  let bestWilayat = ALL_OMAN_WILAYATS[0];
  let bestDist = Infinity;

  for (const w of ALL_OMAN_WILAYATS) {
    const d = haversineKm(lat, lon, w.lat, w.lon);
    if (d < bestDist) {
      bestDist = d;
      bestWilayat = w;
    }
  }

  const governorate =
    OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === bestWilayat.governorateId) ||
    OMAN_ADMINISTRATIVE_DATA[0];

  return {
    governorate,
    wilayat: bestWilayat,
    village: bestWilayat.villages[0] || bestWilayat.name,
    distanceKm: Math.round(bestDist * 10) / 10,
    withinOman: isRoughlyWithinOman(lat, lon),
  };
}

function normalizeArabicToken(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/محافظة|ولاية|سلطنة عمان|سلطنة عُمان/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchOmanLocationByNames(
  govHint?: string,
  wilayatHint?: string,
  villageHint?: string
): { governorate: OmanGovernorateAdmin; wilayat: OmanWilayat; village: string } {
  const nGov = normalizeArabicToken(govHint || '');
  const nWil = normalizeArabicToken(wilayatHint || '');
  const nVil = normalizeArabicToken(villageHint || '');

  let matchedGov: OmanGovernorateAdmin | undefined = OMAN_ADMINISTRATIVE_DATA.find((g) => {
    const candidates = [g.name, g.nameEn, ...(g.aliases || [])].map(normalizeArabicToken);
    return nGov && candidates.some((c) => c === nGov || nGov.includes(c) || c.includes(nGov));
  });

  const searchPool = matchedGov ? matchedGov.wilayats : ALL_OMAN_WILAYATS;
  let matchedWil: OmanWilayat | undefined = searchPool.find((w) => {
    const candidates = [w.name, w.nameEn, ...(w.aliases || [])].map(normalizeArabicToken);
    return nWil && candidates.some((c) => c === nWil || nWil.includes(c) || c.includes(nWil));
  });

  if (!matchedWil && nWil) {
    matchedWil = ALL_OMAN_WILAYATS.find((w) => {
      const candidates = [w.name, w.nameEn, ...(w.aliases || [])].map(normalizeArabicToken);
      return candidates.some((c) => c === nWil || nWil.includes(c) || c.includes(nWil));
    });
  }

  if (matchedWil && !matchedGov) {
    matchedGov = OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === matchedWil!.governorateId);
  }

  if (!matchedGov) {
    matchedGov =
      OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === 'dakhiliyah') || OMAN_ADMINISTRATIVE_DATA[0];
  }
  if (!matchedWil) {
    matchedWil = matchedGov.wilayats[0];
  }

  let resolvedVillage = matchedWil.villages[0] || matchedWil.name;
  if (villageHint && villageHint.trim()) {
    const knownMatch = matchedWil.villages.find((v) => {
      const nv = normalizeArabicToken(v);
      return nv === nVil || nVil.includes(nv) || nv.includes(nVil);
    });
    resolvedVillage = knownMatch || villageHint.trim().slice(0, 80);
  }

  return {
    governorate: matchedGov,
    wilayat: matchedWil,
    village: resolvedVillage,
  };
}

export function formatOmanLocationPath(params: {
  governorate?: string;
  wilayat?: string;
  village?: string;
  includeCountry?: boolean;
}): string {
  const parts: string[] = [];
  if (params.includeCountry) parts.push('سلطنة عُمان');
  if (params.governorate?.trim()) parts.push(params.governorate.trim());
  if (params.wilayat?.trim()) {
    const w = params.wilayat.trim();
    parts.push(w.startsWith('ولاية') ? w : `ولاية ${w}`);
  }
  if (params.village?.trim()) {
    parts.push(params.village.trim());
  }
  return parts.join(' ← ');
}
