# نشر مسار BMW على GitHub Pages

المستودع العام: https://github.com/wejdan0404/masar-bmw

الموقع عبارة عن صفحات ثابتة ولا يحتاج Node server أو تطبيق بناء خارجي. ملف `index.html` في جذر الفرع `main` هو نسخة الإنتاج.

1. من المستودع افتحي **Settings → Pages**.
2. تحت **Build and deployment** اختاري **Deploy from a branch**.
3. حددي `main` والمجلد `/(root)`، ثم **Save**.
4. انتظري نجاح نشر GitHub Pages، وافتحي الرابط الذي يظهر في صفحة Pages. العنوان المتوقع عادةً: https://wejdan0404.github.io/masar-bmw/ — لا يُعتبر منشورًا حتى تعرض GitHub حالة نجاح واضحة.
5. جرّبي الدرس الأول والاختبار واستعادة التقدم بعد تحديث الصفحة.

يتطلب تفعيل Pages مرة واحدة عبر إعدادات GitHub. بعد ذلك تحديث ملف `index.html` على `main` يعيد نشر الموقع تلقائيًا.

**الحفظ:** IndexedDB محلي في المتصفح. لا تحتاجين دفع اشتراك أو تفعيل خدمة بيانات خارجية. وجود هذا الموقع في GitHub لا يعني أن درجاتك أو ملاحظاتك أصبحت بيانات عامة.

المرجع الرسمي: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
