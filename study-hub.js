/* MASAR original learning toolkit: personal documents, quizzes, practical checklists. */
(function(){
'use strict';
var cachedFiles={}, quizFilter='all',quizIndex=0,pinnedQuestionId=null;
function E(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function sign(k){
 var red='#cf1522',blue='#1b578b',black='#19232d',shape='',label='';
 if(k==='stop'){shape='<polygon points="75,5 113,20 130,57 113,94 75,110 36,94 20,57 36,20" fill="'+red+'" stroke="white" stroke-width="4"/><text x="75" y="66" text-anchor="middle" fill="white" font-weight="900" font-size="22">قف</text>';label='إشارة الوقوف التام'}
 else if(k==='yield'){shape='<polygon points="75,116 8,8 142,8" fill="white" stroke="'+red+'" stroke-width="13" stroke-linejoin="round"/>';label='إفساح الطريق'}
 else if(k==='no-entry'){shape='<circle cx="75" cy="64" r="53" fill="'+red+'"/><rect x="38" y="57" width="74" height="15" rx="3" fill="white"/>';label='ممنوع الدخول'}
 else if(k==='speed60'){shape='<circle cx="75" cy="64" r="53" fill="white" stroke="'+red+'" stroke-width="11"/><text x="75" y="79" font-size="45" text-anchor="middle" fill="'+black+'">60</text>';label='السرعة القصوى'}
 else if(k==='no-parking'){shape='<circle cx="75" cy="64" r="54" fill="'+blue+'" stroke="'+red+'" stroke-width="10"/><path d="M35 25L116 106" stroke="'+red+'" stroke-width="12"/>';label='منع الوقوف'}
 else if(k==='no-uturn'){shape='<circle cx="75" cy="64" r="54" fill="white" stroke="'+red+'" stroke-width="10"/><path d="M102 92V47Q102 22 76 22T48 47V78M48 78L36 64M48 78L62 64" fill="none" stroke="'+black+'" stroke-width="10" stroke-linejoin="round"/><path d="M33 24L116 106" stroke="'+red+'" stroke-width="10"/>';label='منع الدوران للخلف'}
 else if(k==='traffic-light'){shape='<polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><rect x="65" y="44" width="20" height="62" rx="6" fill="'+black+'"/><circle cx="75" cy="55" r="7" fill="#ed333a"/><circle cx="75" cy="74" r="7" fill="#f4c02d"/><circle cx="75" cy="93" r="7" fill="#28a35e"/>';label='إشارة ضوئية أمامك'}
 else if(k==='roundabout'){shape='<polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><circle cx="75" cy="73" r="25" fill="none" stroke="'+black+'" stroke-width="6" stroke-dasharray="31 12"/><path d="M56 52L50 67L68 66M86 96L101 93L90 79" fill="none" stroke="'+black+'" stroke-width="5"/>';label='الدوار'}
 else if(k==='blue-direction'){shape='<circle cx="75" cy="64" r="52" fill="'+blue+'"/><path d="M41 65H109M109 65L87 43M109 65L87 87" fill="none" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>';label='سهم اتجاه إلزامي توضيحي'}else {shape='<rect x="8" y="12" width="134" height="108" rx="17" fill="#eff5f9" stroke="#85a0b4" stroke-width="3"/><text x="75" y="78" text-anchor="middle" font-size="43" font-weight="800" fill="'+blue+'">؟</text>';label='مفهوم تدريبي، ليس شكل إشارة مرور معتمدة'}
 return '<svg class="masar-sign" viewBox="0 0 150 128" role="img" aria-label="'+E(label)+'" xmlns="http://www.w3.org/2000/svg">'+shape+'</svg>';
}
function filteredQuestions(course,state){
 return (course.review_questions||[]).filter(function(q){
  var a=state.reviewAnswers&&state.reviewAnswers[q.id];
  return quizFilter==='all'||q.topic===quizFilter||(quizFilter==='wrong'&&Number.isInteger(a)&&a!==q.correct_option_index)||(quizFilter==='new'&&!Number.isInteger(a))
 });
}
function quizPage(course,state){
 var all=course.review_questions||[],topics=[['all','كل المواضيع'],['signals','اللوحات'],['road','قواعد الطريق'],['practical','المهارات'],['safety','السيارة والسلامة'],['test','الاختبار'],['wrong','أخطائي'],['new','غير المحلول']];
 var bank=filteredQuestions(course,state);
 if(quizIndex>=bank.length)quizIndex=0;
 var answered=all.filter(function(q){return Number.isInteger(state.reviewAnswers&&state.reviewAnswers[q.id])}).length;
 var correct=all.filter(function(q){return Number(state.reviewAnswers&&state.reviewAnswers[q.id])===q.correct_option_index && Number.isInteger(state.reviewAnswers&&state.reviewAnswers[q.id])}).length;
 var q=pinnedQuestionId?all.find(function(x){return x.id===pinnedQuestionId}):bank[quizIndex],a=q?state.reviewAnswers&&state.reviewAnswers[q.id]:null,done=Number.isInteger(a);
 return '<div class="eyebrow">PRACTICE BANK / EXAM TRAINING</div><h1 class="page-title">تجميعات وأسئلة المراجعة</h1><p class="sub">بنك أصلي من '+all.length+' سؤالًا تعليميًا مستوحى من موضوعات المصادر، وليس نسخة من أسئلة الامتحان الرسمي. بعد الإجابة يظهر تفسير السبب، وتُحفظ النتيجة على جهازك.</p><div class="hub-metrics"><div><strong>'+answered+' / '+all.length+'</strong><small>أجبتي عنها</small></div><div><strong>'+correct+'</strong><small>إجابات صحيحة</small></div></div><div class="hub-filters">'+topics.map(function(t){return '<button class="hub-filter '+(quizFilter===t[0]?'on':'')+'" data-action="hub-filter" data-topic="'+t[0]+'" aria-pressed="'+(quizFilter===t[0])+'">'+t[1]+'</button>'}).join('')+'</div>'+(q?'<section class="hub-question card"><div class="hub-q-top"><span>سؤال '+(quizIndex+1)+' / '+bank.length+'</span><span>مرجع الفكرة: '+E(q.source_id==='DOC-TRAINEE'?'كتاب المتدربة':q.source_id==='DOC-NAZAWI'?'مجموعة النزاوي (غير رسمية)':q.source_id)+(q.source_pdf_page?' · PDF ص'+q.source_pdf_page:'')+'</span></div><div class="hub-sign-scene">'+sign(q.visual_key)+'</div><h2>'+E(q.question)+'</h2><div class="hub-options">'+q.options.map(function(o,i){return '<button type="button" class="hub-choice '+(done?(i===q.correct_option_index?'right':i===a?'wrong':''):'')+'" data-action="hub-answer" data-qid="'+E(q.id)+'" data-answer="'+i+'" '+(done?'disabled':'')+' aria-label="الخيار '+(i+1)+'">'+E(o)+'</button>'}).join('')+'</div>'+(done?'<div class="hub-explain" role="status"><strong>'+(a===q.correct_option_index?'إجابتك صحيحة':'راجعي المعلومة')+'</strong><p>'+E(q.explanation)+'</p></div>':'')+'<div class="hub-q-links"><a class="inline-link" href="#/lesson/'+Number(q.lesson_id.slice(-3))+'">راجعي الدرس المرتبط ←</a>'+(done?'<button type="button" class="btn btn-outline" data-action="hub-retry" data-qid="'+E(q.id)+'">إعادة محاولة السؤال</button>':'')+'</div><div class="source-inline-preview" data-source-preview="'+E(item.id)+'" aria-live="polite"></div><label class="hub-source-note">ملاحظتي على السؤال<textarea data-source-note="QUESTION-'+E(q.id)+'" placeholder="ليش اخترت الإجابة؟ وش القاعدة اللي أبي أتذكرها؟">'+E((state.sourceNotes||{})['QUESTION-'+q.id]||'')+'</textarea></label><div class="hub-q-nav"><button type="button" class="btn btn-outline" data-action="hub-prev">السابق</button><button type="button" class="btn btn-primary" data-action="hub-next">التالي ←</button></div><p class="hub-legal">الرسم والأمثلة مبسّطة للمذاكرة، وقد تختلف اللوحات بتفاصيلها. للمراجعة النظامية راجعي دليل الإشارات الصادر عن المرور.</p></section>':'<p>لا توجد أسئلة هنا حاليًا. إذا اخترتِ «أخطائي» فمعناه أنكِ ما عندك إجابات خاطئة محفوظة في بنك المراجعة.</p>')+'<section class="hub-supplement"><h3>تجميع النزاوي والصور الـ39</h3><p>يمكنك ربط ملف النزاوي الشخصي من قسم المصادر. أضفنا كذلك فهرس روابط الصور الـ39 التي أرسلتِها، دون إعادة نشر الصور في المستودع العام.</p><a class="btn btn-outline" href="#/sources">مكتبة المصادر والصور</a></section>';
}
function faultDetails(course){
 var ref=course.practical_assessment_reference;if(!ref)return '';
 return '<section class="hub-fault-ref"><h2>نماذج أخطاء التقييم العملي — للمقارنة فقط</h2><p>استخرجنا الملاحظات التي أرسلتيها وأعدنا تنظيمها: '+ref.immediate_failure_examples.length+' أمثلة على أخطاء حرجة، و'+ref.fault_categories.length+' فئة أخرى. القائمة من مصادر متعددة وقد تختلف المدرسة ومعاييرها.</p><details class="hub-fault-group"><summary>أمثلة أخطاء حرجة — لا تعمّمي معيار الرسوب على جميع المدارس</summary><ul>'+ref.immediate_failure_examples.map(function(x){return '<li>'+E(x.text)+'</li>'}).join('')+'</ul></details>'+ref.fault_categories.map(function(cat){return '<details class="hub-fault-group"><summary>'+cat.number+' — '+E(cat.title)+' ('+cat.mistakes.length+' أمثلة)</summary><ul>'+cat.mistakes.map(function(x){return '<li>'+E(x)+'</li>'}).join('')+'</ul></details>'}).join('')+'<p class="hub-legal">عبارة «4 حركات» والاختبارات الخاصة بناقل حركة يدوي لا تنطبق بالضرورة على سيارتك أو مدرسة اختبارك. لا يُحسب عدد أخطاء ولا ساعات تدريب هنا.</p></section>';
}
function lessonReadings(course,lesson){
 var row=(course.lesson_reading_map||[]).find(function(x){return x.lesson_id===lesson.id});
 if(!row)return '';
 var list=row.resources||[],overview=lesson.study_content||{},intro=E(overview.introduction||overview.goal||'');
 var keypoints=(overview.key_points||[]).map(function(x){return '<li>'+E(x)+'</li>'}).join('');
 var cards=list.map(function(a){
  var item=(course.personal_documents||[]).find(function(x){return x.id===a.source_id});
  var page=a.pdf_page_start,pg=page===a.pdf_page_end?'PDF صفحة '+page:'PDF صفحات '+page+'–'+a.pdf_page_end;
  var loaded=!!cachedFiles[a.source_id];
  return '<details class="source-chapter"><summary><span class="chapter-title">'+E(a.source_title)+'</span><span class="chapter-page">'+pg+'</span><span class="chapter-toggle" aria-hidden="true">⌄</span></summary>'
   +'<div class="source-chapter-inner"><h3>محتوى الدرس المرتبط بهذا الفصل</h3><p>'+intro+'</p><ul>'+keypoints+'</ul>'
   +'<p class="source-honesty">هذا شرح أصلي من مِسار للموضوع المرتبط بالكتاب، وليس نسخًا حرفيًا لجميع صفحاته. يمكنك استعراض صفحات ملفك الأصلي أسفله من داخل الموقع.</p>'
   +'<div class="source-chapter-actions"><button type="button" class="btn btn-primary" data-action="hub-inline-open" data-source="'+E(a.source_id)+'" data-page="'+page+'">اعرضي صفحات الكتاب هنا</button>'
   +(!loaded?'<button type="button" class="btn btn-outline" data-action="hub-pick" data-source="'+E(a.source_id)+'">أضيفي ملفك مرة واحدة</button>':'<span class="chip tiny success">ملفك محفوظ على هذا المتصفح</span>')
   +'</div><div class="source-inline-preview" data-source-preview="'+E(a.source_id)+'" aria-live="polite"></div>'
   +'<p class="source-page-hint">'+E(a.note||'')+'</p></div></details>';
 }).join('');
 return '<section class="lesson-sources card" id="source-reading"><div class="eyebrow">THE BOOKS / مصادر الدرس</div><h2>اقرئي من الكتب هنا، بدون الخروج من مِسار</h2>'
 +'<p>افتحي اسم أي كتاب لتشاهدي خلاصة الموضوع، ثم صفحات المرجع الأصلي داخل الدرس عند إضافته إلى مكتبتك الخاصة.</p>'
 +'<input type="file" hidden id="hub-file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp" data-source=""/>'
 +'<div class="source-chapter-list">'+cards+'</div><p class="hub-legal">تختلف طبعات بعض المراجع وأرقام صفحاتها، وقد تحتاج المعلومات النظامية إلى تحديث. يحتفظ المتصفح بملفاتك محليًا، ولا نرفعها إلى GitHub.</p></section>';
}
function schoolPolicies(course){
 var rows=course.school_specific_evidence||[];if(!rows.length)return '';
 return '<section class="hub-school-policy"><h2>مثال موثق من مدرسة سعودية — وليس قاعدة لجميع المدارس</h2><p>بعض التجميعات تخلط بين عدد أخطاء التقييم وعدد ساعات برامج التدريب. هذه بيانات منشورة من مدرسة جامعة القصيم، ولا تنطبق تلقائيًا على مدرستك.</p>'+rows.map(function(x){return '<article><strong>'+E(x.claim)+'</strong><small>'+E(x.applies_to)+'</small><a href="'+E(x.source_url)+'" target="_blank" rel="noopener noreferrer">المصدر من موقع المدرسة ↗</a></article>'}).join('')+'</section>';
}
function practicePage(course,state){
 var blocks=course.practical_checklist||[],checked=state.practiceChecks||{};
 return '<div class="eyebrow">PRACTICAL EVALUATION / مراجعة</div><h1 class="page-title">قائمة المهارات العملية</h1><p class="sub">تستخدمين هذه القائمة للتذكّر والتقييم الذاتي النظري؛ لا تقيّم مهارتك في القيادة فعليًا ولا تضمن اجتياز الفحص. مصدر بنودها نموذج التقييم الذي رفعتيه ومناهج المدارس.</p><div class="hub-warning"><strong>معايير الرسوب والـ6/12/30 ساعة</strong><p>الأرقام المذكورة في التجميع غير مثبتة كسياسة وطنية موحدة. لا تُستخدم لتقدير نتيجتك الفعلية؛ مرجعك هو المدرسة التي ستختبرين فيها.</p></div>'+schoolPolicies(course)+faultDetails(course)+blocks.map(function(b){var n=b.items.filter(function(_,i){return checked[b.id+':'+i]}).length;return '<section class="hub-rubric card"><div class="flexline"><h2>'+E(b.title)+'</h2><span class="chip">'+n+' / '+b.items.length+'</span></div><div class="hub-checklist">'+b.items.map(function(item,i){return '<label class="hub-check"><input type="checkbox" data-practice-id="'+E(b.id+':'+i)+'" '+(checked[b.id+':'+i]?'checked':'')+'/><span>'+E(item)+'</span></label>'}).join('')+'</div><p class="hub-legal">جاهزية نظرية للمراجعة، وليست إثبات أداء عملي.</p></section>'}).join('')+'<p><a href="#/sources">عرض نماذج التقييم التي أرسلتيها ←</a></p>';
}
function studySourceDetails(course,item){
 if(!item.pages)return '';
 var lessonById=Object.fromEntries((course.lessons||[]).map(function(l){return [l.id,l]}));
 var references=(course.lesson_reading_map||[]).flatMap(function(row){
  return (row.resources||[]).filter(function(ref){return ref.source_id===item.id}).map(function(ref){
   return {lesson:lessonById[row.lesson_id],start:ref.pdf_page_start,end:ref.pdf_page_end};
  });
 }).filter(function(x){return !!x.lesson});
 var status=item.verification==='practice_unverified'?'تجميع غير مؤكد':item.verification==='reference_only'?'مرجع يحتاج التحقق':'خطوات تدريب مرتبطة بالمصدر';
 var linked=references.map(function(r){
  var pg='PDF '+r.start+(r.end&&r.end!==r.start?'–'+r.end:'');
  return '<div class="source-topic-row"><a href="#/lesson/'+r.lesson.order+'">'+E(r.lesson.title)+'</a><span>'+E(pg)+'</span><button type="button" data-action="hub-open-page" data-source="'+E(item.id)+'" data-page="'+E(r.start)+'">فتح الصفحة</button></div>';
 }).join('');
 return '<div class="source-role"><span>'+E(item.pages)+' صفحة</span><span>'+E(item.publisher||'مرجع إضافي')+'</span><span>'+E(status)+'</span></div><details class="source-topic-index"><summary>مواضع القراءة في دروس مِسار · '+references.length+'</summary><div class="source-topic-list">'+(linked||'<p>لم تُضف لهذا المرجع إحالات صفحات بعد.</p>')+'</div><small>الربط بالصفحات لا يعني تدقيق الكتاب كاملًا أو صلاحية الأسئلة للاختبار الحالي.</small></details>';
}
function docsPage(course,state){
 var files=(course.personal_documents||[]).concat(course.uploaded_image_index||[]),byKind=(course.external_study_sources||[]);
 var cards=files.map(function(item,i){var file=cachedFiles[item.id];var header=i===0?'<h2 class="hub-library-subtitle">الكتب ومراجع القيادة · '+(course.personal_documents||[]).length+'</h2>':i===(course.personal_documents||[]).length?'<h2 class="hub-library-subtitle">الصور والملصقات المرجعية · '+(course.uploaded_image_index||[]).length+'</h2>':'';return header+'<article class="hub-source card"><div class="flexline"><div><span class="bento-overline">'+(item.pages?E(item.pages)+' صفحة · ':'صورة مرجعية · ')+'ملف شخصي</span><h3>'+E(item.title)+'</h3></div><span class="chip '+(file?'blue':'')+'">'+(file?'في مكتبتك':'غير مرفوع بعد')+'</span></div><p>'+E(item.scope||item.note||'صورة للتعلم والمقارنة')+'</p>'+studySourceDetails(course,item)+'<p class="hub-filename">'+E(item.filename)+'</p><div class="hub-source-buttons"><button type="button" class="btn btn-outline" data-action="hub-pick" data-source="'+E(item.id)+'">اختيار الملف من الكمبيوتر</button>'+(file?'<button type="button" class="btn btn-primary" data-action="hub-open" data-source="'+E(item.id)+'">فتح الملف</button><button type="button" class="btn btn-outline" data-action="hub-delete" data-source="'+E(item.id)+'">إزالة</button>':'')+'</div><label class="hub-source-note">ملاحظاتي على المرجع<textarea data-source-note="'+E(item.id)+'" placeholder="رقم الصفحة، وش فهمت، وش أحتاج أراجع؟">'+E((state.sourceNotes||{})[item.id]||'')+'</textarea></label></article>'}).join('');
 var urls=byKind.map(function(x){return '<div class="hub-online-source"><div><strong>'+E(x.title)+'</strong><small>'+E(x.note)+'</small></div><a href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">زيارة المصدر ↗</a></div>'}).join('');
 var links=course.community_pages&&course.community_pages.image_links||[];
 return '<div class="eyebrow">YOUR PERSONAL SOURCE LIBRARY</div><h1 class="page-title">المصادر وملفاتي الخاصة</h1><div class="source-library-summary"><strong>'+(course.personal_documents||[]).length+' كتب ومراجع PDF · '+(course.uploaded_image_index||[]).length+' صور مرجعية · '+byKind.length+' روابط تعليمية</strong><span>كل الكتب مفهرسة، لكن فتح الملف يتطلب إضافته محليًا من جهازك؛ لا ننشر ملفات PDF على GitHub.</span></div><p class="sub">رتبنا الكتب والصور التي أرسلتيها وفصلنا المكرر. لإبقائها خاصة ولا نخالف حقوق النشر: اختاري ملفاتك من الكمبيوتر مرة واحدة، ويحفظها متصفحك محليًا في IndexedDB، لا في GitHub ولا على خادم عام.</p><div class="hub-warning"><strong>مهم للحفظ</strong><p>الملفات الكبيرة تعتمد على مساحة المتصفح وقد تُحذف عند تنظيف بيانات الموقع. نسخة التقدم JSON لا تحتوي ملفات PDF أو الصور المرفوعة. احتفظي بنسخ الملفات الأصلية على الكمبيوتر.</p></div><input type="file" hidden id="hub-file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp" data-source=""/><div class="hub-metrics"><div><strong>'+files.length+'</strong><small>مرجعًا مختلفًا</small></div><div><strong>'+Object.keys(cachedFiles).length+'</strong><small>ملفًا أضفتِه محليًا</small></div></div><div class="hub-source-grid">'+cards+'</div><h2 class="hub-section-title">روابط المصادر على الإنترنت</h2><div class="hub-online-list">'+urls+'</div><details class="hub-page-list"><summary>صور تجميع النزاوي: '+links.length+' رابط صفحة خارجية</summary><p>هذه روابط مقدمة من موقع طرف ثالث؛ لم نتحقق من صحة جميع الصفحات أو الحق في إعادة توزيعها.</p><div>'+links.map(function(it){return '<a href="'+E(it.url)+'" target="_blank" rel="noopener noreferrer">صفحة '+it.page+'</a>'}).join('')+'</div></details>';
}
function paperPage(course){
 var arr=course.review_questions||[];
 return '<div class="eyebrow">PAPER PRACTICE / SELF ASSESSMENT</div><h1 class="page-title">اختبار ورقي تجريبي — '+arr.length+' سؤالًا</h1><p class="sub">ورقة مُعدّة من أسئلة تعليمية أصلية وليست أسئلة الامتحان الرسمي. طبعيها وحليها بالقلم قبل فتح مفتاح الحل. ركزي على الأسئلة التي تسأل عمّا «ليس صحيحًا».</p><button class="btn btn-primary paper-print-btn" type="button" data-action="paper-print">طباعة نموذج الأسئلة</button><section class="paper-sheet"><header><strong>مسار BMW — ورقة تقييم تدريبية</strong><span>الاسم: ______________ التاريخ: ______________</span><p>حددي إجابة واحدة لكل سؤال؛ استخدمي قلمًا مختلفًا لمراجعة الأخطاء بعد الحل.</p></header>'+arr.map(function(q,i){return '<article class="paper-item"><strong>'+(i+1)+'. '+E(q.question)+'</strong><div>'+q.options.map(function(o,n){return '<span>□ '+['أ','ب','ج','د'][n]+' — '+E(o)+'</span>'}).join('')+'</div></article>'}).join('')+'</section><details class="hub-page-list paper-key"><summary>عرض مفتاح الحل بعد إنهاء الورقة</summary><ol>'+arr.map(function(q,i){return '<li><strong>'+(i+1)+' — '+['أ','ب','ج','د'][q.correct_option_index]+'</strong>: '+E(q.explanation)+'</li>'}).join('')+'</ol></details>';
}
function videoNotes(video,state){
 return '<label class="hub-source-note video-learning-notes">ملاحظاتي على هذا الفيديو<textarea data-video-note="'+E(video.id)+'" placeholder="الدقيقة 00:00 — لاحظتِ إيش؟&#10;قاعدة جديدة: ...&#10;سؤالي للمدربة: ...">'+E((state.videoNotes||{})[video.id]||'')+'</textarea><small>احفظي اسم الخطوة ووقتها والسؤال الذي تريدين مراجعته؛ تُحفظ الملاحظة محليًا.</small></label>';
}
function notesPage(state,course){
 var videos=Object.entries(state.videoNotes||{}).filter(function(x){return x[1]&&x[1].trim()}).map(function(x){var v=(course.media_resources||[]).find(function(m){return m.id===x[0]});return '<article class="ref-card"><h3>فيديو: '+E(v?v.title:x[0])+'</h3><p style="white-space:pre-wrap">'+E(x[1])+'</p></article>'}).join('');
 var sources=Object.entries(state.sourceNotes||{}).filter(function(x){return x[1]&&x[1].trim()}).map(function(x){var d=[].concat(course.personal_documents||[],course.uploaded_image_index||[]).find(function(m){return m.id===x[0]});var q=(course.review_questions||[]).find(function(q){return x[0]==='QUESTION-'+q.id});return '<article class="ref-card"><h3>'+(q?'سؤال: '+E(q.question):'مصدر: '+E(d?d.title:x[0]))+'</h3><p style="white-space:pre-wrap">'+E(x[1])+'</p></article>'}).join('');
 return '<div class="section-head"><h2>ملاحظاتي على الفيديوهات والملفات</h2></div>'+(videos+sources||'<div class="empty">عند كتابة ملاحظة في صفحة فيديو أو مرجع، تظهر هنا تلقائيًا.</div>');
}
async function refreshFiles(db,rerender){try{var list=await db.listPersonalFiles();cachedFiles=Object.fromEntries(list.map(function(it){return [it.id,it]}));if(rerender)rerender()}catch(e){console.warn('Personal library unavailable',e)}}
function click(action,el,ctx){
 var c=ctx.course,st=ctx.state;
 if(action==='hub-filter'){quizFilter=el.dataset.topic||'all';quizIndex=0;pinnedQuestionId=null;ctx.render(true);return true}
 if(action==='hub-prev'){quizIndex=Math.max(0,quizIndex-1);pinnedQuestionId=null;ctx.render(true);return true}
 if(action==='hub-next'){var remaining=filteredQuestions(c,st),stillThere=remaining.some(function(q){return q.id===pinnedQuestionId});quizIndex=Math.max(0,Math.min(remaining.length-1,quizIndex+(pinnedQuestionId&&!stillThere?0:1)));pinnedQuestionId=null;ctx.render(true);return true}
 if(action==='hub-answer'){var q=(c.review_questions||[]).find(function(x){return x.id===el.dataset.qid});var a=Number(el.dataset.answer);if(q&&Number.isInteger(a)&&a>=0&&a<q.options.length){st.reviewAnswers=st.reviewAnswers||{};st.reviewAnswers[q.id]=a;pinnedQuestionId=q.id;window.MasarCoach?.record(st,'bank',q.id,a===q.correct_option_index);ctx.save();ctx.render(true)}return true}
 if(action==='hub-retry'){st.reviewAnswers=st.reviewAnswers||{};delete st.reviewAnswers[el.dataset.qid];pinnedQuestionId=null;var idx=filteredQuestions(c,st).findIndex(function(q){return q.id===el.dataset.qid});if(idx>=0)quizIndex=idx;ctx.save();ctx.render(true);return true}
 if(action==='hub-pick'){var input=document.getElementById('hub-file');if(input){input.dataset.source=el.dataset.source;input.value='';input.click()}return true}
 if(action==='hub-inline-open'||action==='hub-open-page'||action==='hub-open'){
  var id=el.dataset.source,pg=Number(el.dataset.page)||1;
  if(!Number.isInteger(pg)||pg<1||pg>500)return true;
  var area=el.closest('.source-chapter,.hub-source,.source-topic-index')?.querySelector('.source-inline-preview');
  if(!area){
   var doc=el.closest('.hub-source');
   area=doc&&doc.querySelector('.source-inline-preview');
  }
  if(!area){ctx.toast('افتحي قسم المرجع لعرض صفحات الكتاب هنا');return true}
  area.replaceChildren();
  var status=document.createElement('p');status.className='source-inline-loading';status.textContent='جارٍ تجهيز صفحات المرجع داخل الموقع…';area.appendChild(status);
  if(!ctx.db){status.textContent='التخزين المحلي غير متاح على هذا المتصفح حاليًا';return true}
  ctx.db.getPersonalFile(id).then(function(f){
   area.replaceChildren();
   if(!f||!f.blob){
    var message=document.createElement('p');message.className='source-inline-info';
    message.textContent='الكتاب مفهرس في المنهج، لكن ملفه غير موجود بعد على هذا المتصفح. أضيفي نسختك هنا مرة واحدة، وبعدها افتحي الصفحات من داخل مِسار.';
    var pick=document.createElement('button');pick.type='button';pick.className='btn btn-outline';pick.dataset.action='hub-pick';pick.dataset.source=id;pick.textContent='إضافة ملف الكتاب';
    area.append(message,pick);return;
   }
   var url=URL.createObjectURL(f.blob);
   var viewer=document.createElement('iframe');viewer.className='source-embedded-file';viewer.title='عرض المرجع داخل مِسار، صفحة '+pg;
   viewer.loading='lazy';viewer.src=url+(f.mime==='application/pdf'?'#page='+pg:'');
   area.appendChild(viewer);
   var caption=document.createElement('p');caption.className='source-inline-info';
   caption.textContent='المصدر مفتوح داخل مِسار من نسختك الشخصية. إذا لم يعرض متصفحك PDF داخل الإطار، جربي متصفح كمبيوتر حديثًا.';
   area.appendChild(caption);
   setTimeout(function(){URL.revokeObjectURL(url)},1800000);
  }).catch(function(){status.textContent='تعذر قراءة المرجع من التخزين المحلي. أعيدي إضافة الملف من المكتبة.'});
  return true;
 }
 if(action==='hub-delete'){if(confirm('حذف نسختك المحلية من هذا المرجع؟ الملف الأصلي على الكمبيوتر لن يتأثر.'))ctx.db.deletePersonalFile(el.dataset.source).then(function(){delete cachedFiles[el.dataset.source];ctx.render(true);ctx.toast('أزلنا الملف من المتصفح فقط')}).catch(function(){ctx.toast('تعذّر حذف الملف')});return true}
 return false;
}
async function upload(input,ctx){
 var file=input.files&&input.files[0],id=input.dataset.source;
 if(!file||!id)return;
 if(file.size>80*1024*1024){ctx.toast('هذا الملف كبير جدًا لهذا المتصفح، احتفظي بنسختك على الكمبيوتر');return}
 try{await ctx.db.savePersonalFile(id,file);await refreshFiles(ctx.db);ctx.render(true);ctx.toast('حُفظ الملف الخاص في متصفحك؛ لم يُرفع إلى GitHub')}
 catch(e){console.warn(e);ctx.toast('لم يُحفظ الملف؛ قد لا تكون المساحة كافية. أبقي النسخة الأصلية على الكمبيوتر.')}
}
window.MasarHub=Object.freeze({quizPage,practicePage,docsPage,paperPage,lessonReadings,videoNotes,notesPage,refreshFiles,click,upload,sign});
})();