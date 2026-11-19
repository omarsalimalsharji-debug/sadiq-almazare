# إعداد توقيع Android لتطبيق صديق المزارع

لا تضع ملف keystore أو كلمات المرور في Git أو في المحادثات أو داخل ملفات المشروع. تُحفظ القيم حصراً في GitHub Actions Secrets.

## قبل إنشاء مفتاح جديد
إذا كان لديك ملف توقيع النسخة المثبتة حالياً (`.jks` أو `.keystore`) فاستخدمه نفسه. لا تنشئ مفتاحاً جديداً؛ اختلاف التوقيع يمنع تثبيت التحديث فوق النسخة الموجودة.

إذا فُقد المفتاح القديم، يمكن إنشاء مفتاح جديد، لكن سيحتاج المستخدمون إلى إزالة النسخة القديمة وتثبيت النسخة الجديدة مرة واحدة قبل استقبال تحديثات التطبيق المعتادة. احفظ نسخة احتياطية آمنة من المفتاح الجديد.

## إنشاء مفتاح جديد على Windows (عند فقد القديم فقط)

من PowerShell داخل مجلد آمن غير متزامن مع Git:

```powershell
keytool -genkeypair -v -keystore .\sadiq-release.jks -alias sadiq-almazare -keyalg RSA -keysize 4096 -validity 10000
` ```

احتفظ بكلمة مرور المخزن وكلمة مرور المفتاح والاسم المستعار في مدير كلمات مرور آمن.

لتحويل الملف إلى Base64 ونسخ القيمة إلى الحافظة:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\sadiq-release.jks")) | Set-Clipboard
` ```

## إضافة GitHub Secrets

افتح إعدادات المستودع: Settings → Secrets and variables → Actions → New repository secret، وأضف القيم التالية:

- `ANDROID_KEYSTORE_BASE64`: قيمة Base64 المنسوخة.
- `ANDROID_KEYSTORE_PASSWORD`: كلمة مرور ملف keystore.
- `ANDROID_KEY_ALIAS`: `sadiq-almazare` (أو الاسم المستعار الفعلي في المفتاح القديم).
- `ANDROID_KEY_PASSWORD`: كلمة مرور المفتاح.

بعد حفظ الأسرار، شغّل workflow المسمى **Build Android APK** من Actions. لن يُنشر تحديث داخل التطبيق إلا بعد نجاح بناء APK الموقّع ونشره في GitHub Release.

## مفاتيح الخدمات
مفتاح `GEMINI_API_KEY` يُحفظ في Render ضمن Environment، وليس في ملفات الواجهة أو GitHub source. لا تستبدل مفتاحاً قائماً بقيمة فارغة أو تجريبية. لا يمكن إنشاء المفتاح نيابة عن مالك حساب Google AI.
