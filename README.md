# 📖 المصحف الإلكتروني (The Holy Qur'an)

[![Live Site](https://img.shields.io/badge/Demo-Live_Website-2ecc71?style=for-the-badge&logo=google-chrome&logoColor=white)](https://engali983.github.io/The_Holy_Qur-an/)
[![GitHub](https://img.shields.io/badge/GitHub-Profile-white?style=for-the-badge&logo=github&logoColor=black)](https://github.com/engAli983)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-0a66c2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ali-khaled-014b21344/)

تطبيق ويب متكامل لقراءة القرآن الكريم بتصميم إسلامي كلاسيكي وتجربة مستخدم عصرية، يتيح للمستخدمين التنقل بين السور وحفظ العلامات المرجعية بألوان مختلفة.

---

## ✨ المميزات الرئيسية (Key Features)

- **قراءة السور:** عرض جميع سور القرآن الكريم (114 سورة) مع جلب البيانات لحظياً.
- **نظام العلامات المرجعية (Bookmarks):** إمكانية حفظ الآيات للعودة إليها لاحقاً مع خاصية التمرير التلقائي (Auto-scroll) للآية المحفوظة.
- **تعدد الألوان:** تخصيص لون العلامة المرجعية (ذهبي، أحمر، أخضر، أزرق) لتنظيم القراءة.
- **واجهة مستخدم زخرفية:** تصميم يستخدم خطوطاً عربية أصيلة (Amiri & Lateef) مع إطارات وزخارف إسلامية.
- **متوافق مع الجوال:** تصميم مرن (Responsive Design) يضمن سهولة القراءة من أي جهاز.
- **البحث والوصول:** قائمة منسدلة لاختيار السور مع عرض أسمائها بالعربية والإنجليزية.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **HTML5:** لبناء هيكل المصحف وتنسيق المحتوى.
- **CSS3:** لتصميم الواجهة والزخارف واستخدام المتغيرات (CSS Variables).
- **JavaScript (ES6+):** للتعامل مع العمليات المنطقية، الـ DOM، والـ LocalStorage.
- **Al Quran Cloud API:** المصدر الأساسي لجلب نصوص الآيات وبيانات السور.
- **Google Fonts:** استخدام خطوط متخصصة لتحسين مظهر النص القرآني.

---

## 📁 هيكل المشروع (Project Structure)
```text
├── index.html         # الصفحة الرئيسية وهيكل التطبيق
├── style.css          # التنسيقات والزخارف وتصميم المودال
├── main.js           # التعامل مع الـ API، العلامات المرجعية، والتحكم في العرض
└── README.md          # توثيق المشروع

---

## 🔊 نظام الصوت وتثبيت أصوات شيوخ جدد (Audio System & Reciters)

يتميز التطبيق بنظام تشغيل صوتي ذكي ومستقر، يعتمد على التشغيل المباشر من شبكة توزيع الصوت الإسلامية (Islamic Network CDN) بدون تأخير في التحميل ومع خاصية **التحميل المسبق التلقائي للآية التالية (Background Audio Prefetching)** لضمان انتقال فوري وسلس بين الآيات.

### 💡 كيف تضيف شيوخ وقراء جدد للقائمة؟
لإضافة صوت أي قارئ جديد في العالم الإسلامي، اتبع هذه الخطوات البسيطة:

1. افتح ملف [index.html](file:///d:/Learn-front-end/Ali-Github-Project/The_Holy_Qur-an/index.html).
2. ابحث عن عنصر الاختيار الخاص بالقراء: `<select id="reciterSelect">`.
3. قم بإضافة خيار جديد `<option>` باستخدام **مُعرّف القارئ الصحيح** في حقل الـ `value`.

#### 📌 أمثلة لمعرفات أشهر القراء الجاهزة للاستخدام:
* **ماهر المعيقلي:** `ar.mahermuaiqly`
* **عبد الرحمن السديس:** `ar.sudais`
* **سعود الشريم:** `ar.saoodshuraym`
* **ياسر الدوسري:** `ar.yasseraldossari`
* **أبو بكر الشاطري:** `ar.shaatree`
* **أحمد العجمي:** `ar.ahmedajamy`
* **عبد الرشيد صوفي (شعبة/حفص):** `ar.abdulrasheedsufi`
* **فارس عباد:** `ar.faresabbad`

#### 📝 مثال عملي للإضافة في الكود:
```html
<select id="reciterSelect">
  <!-- القراء الحاليين... -->
  <option value="ar.mahermuaiqly">ماهر المعيقلي</option>
  <option value="ar.sudais">عبد الرحمن السديس</option>
</select>
```
بمجرد إضافة السطر، سيقوم التطبيق بربط الصوت تلقائياً وجلب الآيات لحظياً بصوت الشيخ الجديد!

