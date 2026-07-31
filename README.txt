نظام المحاسبة المدرسية - السنة الدراسية 2026/2027
=====================================================

طريقة التشغيل:
--------------
1. افتح CMD في مجلد المشروع
2. اكتب: python -m http.server 8000
3. افتح المتصفح على: http://localhost:8000

بيانات الدخول:
--------------
الإيميلات معرّفة في firebase-config.js (SCHOOLS / ADMINS).
كلمات المرور تُدار من Firebase Console → Authentication فقط —
لا تُخزَّن في المشروع ولا تُرفع للمستودع.

ملفات المشروع:
--------------
- index.html            : صفحة تسجيل الدخول
- dashboard.html        : الرئيسية
- collection.html       : التحصيل اليومي
- debts.html            : المديونيات
- expenses.html         : المصروفات + العهدة
- buses.html            : بند الباصات
- contractors.html      : الموردون والمقاولون
- reports.html          : التقارير والشيتات
- party.html            : تسجيل الحفلة
- photo-package.html    : باكدج التصوير
- student-affairs.html  : شئون الطلاب
- edit-student.html     : تعديل بيانات الطلاب
- student-search.html   : بحث الطلاب
- hr.html               : الموارد البشرية
- admin.html            : لوحة الأدمن
- ticket.html           : عرض تذكرة الحفلة (عامة)
- firebase-config.js    : إعداد Firebase والمدارس
- layout.js             : القائمة الجانبية والحماية
- firestore.rules       : قواعد أمان Firestore
- service-worker.js     : PWA cache

السنة الدراسية:
---------------
- تُحسب تلقائياً من التاريخ الحالي (يوليو → يونيو)
- مثال عند التشغيل في يوليو 2026: 2026/2027 تبدأ 1 يوليو 2026

Designed by Eng. Kareem Ali Mousa
