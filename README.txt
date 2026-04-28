نظام المحاسبة المدرسية - السنة الدراسية 2026/2027
=====================================================

طريقة التشغيل:
--------------
1. افتح CMD في مجلد المشروع
2. اكتب: python -m http.server 8000
3. افتح المتصفح على: http://localhost:8000

بيانات الدخول:
--------------
Admin:
  admin@schools-system.com    / Admin@1234
  admin2@schools-system.com   / Admin@5678

Bristol:
  acc1.bristol@bristol-school.com  / Bristol@11
  acc2.bristol@bristol-school.com  / Bristol@22

Cardiff:
  acc1.cardiff@cardiff-school.com  / Cardiff@11
  acc2.cardiff@cardiff-school.com  / Cardiff@22

Stanford 1:
  acc1.stanford1@stanford-school.com  / Stanford1@11
  acc2.stanford1@stanford-school.com  / Stanford1@22

Stanford 2:
  acc1.stanford2@stanford-school.com  / Stanford2@11
  acc2.stanford2@stanford-school.com  / Stanford2@22

ملفات المشروع:
--------------
- index.html            : صفحة تسجيل الدخول
- dashboard.html        : الرئيسية
- collection.html       : التحصيل اليومي
- debts.html            : المديونيات (صفحة جديدة)
- expenses.html         : المصروفات + بند الباصات
- reports.html          : التقارير والشيتات
- admin.html            : لوحة الادمن

السنة الدراسية:
---------------
- السنة الدراسية: 2026/2027
- تبدأ من: 1 يوليو 2026

التعديلات والإصلاحات (آخر إصدار):
------------------------------------
1. إضافة صفحة المديونيات (debts.html):
   - عرض كل المديونيات مع فلترة بالاسم/المرحلة/الحالة
   - بطاقات ملخص: إجمالي المتبقي / جزئي / مسدد / نسبة التحصيل
   - زر تسوية لكل مديونية (جزئي أو كامل)
   - تسجيل transaction جديدة عند التسوية
   - تصدير PDF و Excel منسق

2. إضافة بند الباصات في expenses.html:
   - حساب تكلفة الباصات (سيارات × أيام × قيمة اليوم)
   - حساب إيرادات الاشتركين (عدد × قيمة الاشتراك)
   - ملخص الفائض/العجز تلقائي
   - حفظ في Firebase (collection: busData)
   - لا يُضاف للشيت

3. إصلاح Bug: <td><td> في reports.html و admin.html
   - كان سبب في خراب جداول PDF

4. إصلاح Bug: filterItem في reports.html
   - يدعم الآن البنود المتعددة (مصروفات دراسية + باص)

5. إصلاح Bug: إخفاء أعمدة الجدول في reports.html
   - استخدام class="col-daily" بدل inline display style

6. إصلاح Bug: حساب العهدة في expenses.html
   - الرصيد المتبقي يحسب على كل المصروفات مش الفترة المفلترة فقط

7. ترقية تصدير Excel في admin.html
   - من SheetJS غير منسق إلى ExcelJS كامل التنسيق

8. إصلاح getWeekNumber في collection.html
   - معيار ISO 8601 الصحيح بدل الحساب القديم

9. إضافة رابط المديونيات في القائمة الجانبية (layout.js)

Designed by Eng. Kareem Ali Mousa
