/* MASAR original educational expansions. Supplementary educational explanations; not official test material. */
(function(){
"use strict";
const data=Object.create(null);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const para=s=>"<p>"+escape(s)+"</p>";
function render(lesson){
 const item=data[lesson.order];
 if(!item)return '<section class="deep-guide-missing" role="note">الشرح الموسع لهذا الدرس لم يُنشر بعد؛ استخدمي صفحات مرجع الدرس وتحققي من المعلومة قبل الاعتماد عليها.</section>';
 return '<section class="lesson-deep-dive" id="lesson-deep-dive" aria-label="الشرح التعليمي الموسع">'
 +'<div class="deep-guide-head"><div class="eyebrow">دليل التعلم / شرح أصلي موسع</div><h2>نفهم '+escape(lesson.title)+' خطوة بخطوة</h2><p>اقرئي الشرح ثم المثال؛ بعدها جاوبي من ذاكرتك قبل كشف الحل.</p></div>'
 +'<div class="deep-guide-content"><h3>الفكرة ببساطة</h3>'+para(item.foundation)+para(item.why)
 +'<h3>خطوات ومفاهيم مهمة</h3><ol class="deep-guide-steps">'+item.steps.map(v=>'<li>'+escape(v)+'</li>').join("")+'</ol>'
 +'<div class="deep-example"><h3>مثال من الطريق</h3>'+para(item.example)+'</div>'
 +'<h3>انتبهي لهذه الأخطاء</h3><ul>'+item.errors.map(v=>'<li>'+escape(v)+'</li>').join("")+'</ul>'
 +'<div class="deep-guide-recall"><h3>فكّري قبل كشف الإجابة</h3><p>'+escape(item.prompt)+'</p><details><summary>اكشفي التفسير بعد المحاولة</summary>'+para(item.answer)+'</details></div>'
 +'<div class="deep-guide-homework"><h3>تطبيقك خارج الدرس</h3>'+para(item.homework)+'</div>'
 +'<p class="deep-source-note">هذه صياغة تعليمية أصلية للفهم، وليست نصًا رسميًا من الاختبار. راجعي «مراجع وصفحات الدرس» للتحقق من التفاصيل؛ تختلف بعض إجراءات المدارس وأزرار السيارات بحسب المكان والموديل.</p>'
 +'</div></section>';
}
window.MasarGuides=Object.freeze({register(items){for(const item of items){if(!Number.isInteger(item.id)||data[item.id])throw Error("Invalid or repeated educational guide "+item.id);data[item.id]=item;}},render,getCount:()=>Object.keys(data).length});
})();
