/* MASAR original learning toolkit: personal documents, quizzes, practical checklists. */
(function(){
'use strict';
var cachedFiles={}, quizFilter='all',quizIndex=0,pinnedQuestionId=null;
var sourceFilter='all';
function E(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function sign(k){
 var red='#cf1522',blue='#1b578b',black='#19232d',steel='#6f8797',paper='#f7fafb',green='#2b7a5f',amber='#d79b2b',shape='',label='';
 var road='<rect x="10" y="18" width="130" height="96" rx="15" fill="#dfe7eb"/><path d="M75 23V109" stroke="white" stroke-width="4" stroke-dasharray="11 9"/>';
 var car=function(x,y,color){return '<g transform="translate('+x+' '+y+')"><rect x="0" y="0" width="30" height="48" rx="9" fill="'+color+'"/><rect x="5" y="7" width="20" height="14" rx="5" fill="#bcd0dc"/><rect x="-3" y="9" width="4" height="11" rx="2" fill="#17242c"/><rect x="29" y="9" width="4" height="11" rx="2" fill="#17242c"/><rect x="-3" y="29" width="4" height="11" rx="2" fill="#17242c"/><rect x="29" y="29" width="4" height="11" rx="2" fill="#17242c"/></g>'};
 if(k==='stop'){shape='<polygon points="75,5 113,20 130,57 113,94 75,110 36,94 20,57 36,20" fill="'+red+'" stroke="white" stroke-width="4"/><text x="75" y="66" text-anchor="middle" fill="white" font-weight="900" font-size="22">قف</text>';label='إشارة الوقوف التام'}
 else if(k==='yield'){shape='<polygon points="75,116 8,8 142,8" fill="white" stroke="'+red+'" stroke-width="13" stroke-linejoin="round"/>';label='إفساح الطريق'}
 else if(k==='no-entry'){shape='<circle cx="75" cy="64" r="53" fill="'+red+'"/><rect x="38" y="57" width="74" height="15" rx="3" fill="white"/>';label='ممنوع الدخول'}
 else if(k==='speed60'){shape='<circle cx="75" cy="64" r="53" fill="white" stroke="'+red+'" stroke-width="11"/><text x="75" y="79" font-size="45" text-anchor="middle" fill="'+black+'">60</text>';label='السرعة القصوى'}
 else if(k==='no-parking'){shape='<circle cx="75" cy="64" r="54" fill="'+blue+'" stroke="'+red+'" stroke-width="10"/><path d="M35 25L116 106" stroke="'+red+'" stroke-width="12"/>';label='منع الوقوف'}
 else if(k==='no-uturn'){shape='<circle cx="75" cy="64" r="54" fill="white" stroke="'+red+'" stroke-width="10"/><path d="M102 92V47Q102 22 76 22T48 47V78M48 78L36 64M48 78L62 64" fill="none" stroke="'+black+'" stroke-width="10" stroke-linejoin="round"/><path d="M33 24L116 106" stroke="'+red+'" stroke-width="10"/>';label='منع الدوران للخلف'}
 else if(k==='traffic-light'){shape='<polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><rect x="65" y="44" width="20" height="62" rx="6" fill="'+black+'"/><circle cx="75" cy="55" r="7" fill="#ed333a"/><circle cx="75" cy="74" r="7" fill="#f4c02d"/><circle cx="75" cy="93" r="7" fill="#28a35e"/>';label='إشارة ضوئية أمامك'}
 else if(k==='roundabout'){shape='<polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><circle cx="75" cy="73" r="25" fill="none" stroke="'+black+'" stroke-width="6" stroke-dasharray="31 12"/><path d="M56 52L50 67L68 66M86 96L101 93L90 79" fill="none" stroke="'+black+'" stroke-width="5"/>';label='الدوار'}
 else if(k==='blue-direction'){shape='<circle cx="75" cy="64" r="52" fill="'+blue+'"/><path d="M41 65H109M109 65L87 43M109 65L87 87" fill="none" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>';label='سهم اتجاه إلزامي توضيحي'}
 else if(k==='warning'){shape='<polygon points="75,8 9,116 141,116" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><path d="M75 42V78" stroke="'+black+'" stroke-width="10" stroke-linecap="round"/><circle cx="75" cy="96" r="6" fill="'+black+'"/>';label='علامة تحذير تعليمية'}
 else if(k==='intersection'){shape='<polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><path d="M75 39V101M45 69H105" stroke="'+black+'" stroke-width="10" stroke-linecap="round"/>';label='تقاطع أمامك — رسم تعليمي'}
 else if(k==='distance'){shape=road+car(28,30,'#86152d')+car(93,50,'#587995')+'<path d="M62 82H87M65 76L59 82L65 88M84 76L90 82L84 88" fill="none" stroke="'+amber+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';label='مسافة الأمان بين مركبتين'}
 else if(k==='lane'){shape=road+car(29,47,'#587995')+'<path d="M103 94V44M103 44L91 57M103 44L115 57" fill="none" stroke="'+blue+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M58 74C70 74 79 67 88 58" fill="none" stroke="'+red+'" stroke-width="4" stroke-dasharray="6 5"/>';label='تغيير مسار — رسم تعليمي'}
 else if(k==='parking'){shape='<rect x="13" y="15" width="124" height="98" rx="15" fill="#e6edf1"/><path d="M28 24V104M122 24V104M75 24V104" stroke="white" stroke-width="4"/><text x="48" y="62" text-anchor="middle" fill="'+blue+'" font-size="30" font-weight="900">P</text>'+car(87,54,'#86152d')+'<path d="M98 47Q88 37 77 48" fill="none" stroke="'+amber+'" stroke-width="4"/><path d="M79 42L75 49L83 51" fill="none" stroke="'+amber+'" stroke-width="4"/>';label='الرجوع إلى موقف — رسم تعليمي'}
 else if(k==='seatbelt'){shape='<rect x="19" y="13" width="112" height="102" rx="20" fill="#21343f"/><circle cx="53" cy="38" r="11" fill="#d8e4ea"/><path d="M52 52V91M52 65L86 95M86 54L60 92" stroke="#d8e4ea" stroke-width="9" stroke-linecap="round"/><rect x="84" y="88" width="15" height="10" rx="3" fill="'+red+'"/>';label='رمز حزام الأمان — رسم لوحة قيادة تعليمي'}
 else if(k==='tpms'){shape='<rect x="17" y="14" width="116" height="100" rx="20" fill="#21343f"/><path d="M43 80Q34 57 45 39M107 80Q116 57 105 39M43 80Q75 101 107 80" fill="none" stroke="'+amber+'" stroke-width="9" stroke-linecap="round"/><path d="M75 46V70" stroke="'+amber+'" stroke-width="7" stroke-linecap="round"/><circle cx="75" cy="84" r="4" fill="'+amber+'"/>';label='رمز مراقبة ضغط الإطارات — رسم تعليمي'}
 else if(k==='check-engine'){shape='<rect x="17" y="14" width="116" height="100" rx="20" fill="#21343f"/><path d="M39 52H53L62 41H96L104 50H113V84H104L97 93H55L47 84H36V59H39Z" fill="none" stroke="'+amber+'" stroke-width="7" stroke-linejoin="round"/><path d="M80 41V32M94 41V33" stroke="'+amber+'" stroke-width="6"/>';label='مؤشر فحص المحرك — رسم تعليمي'}
 else if(k==='book'){shape='<rect x="11" y="15" width="128" height="98" rx="16" fill="'+paper+'" stroke="#b7c8d2" stroke-width="3"/><path d="M75 29C57 20 37 23 24 30V94C40 88 59 90 75 100M75 29C93 20 113 23 126 30V94C110 88 91 90 75 100V29Z" fill="white" stroke="'+blue+'" stroke-width="4"/><path d="M91 55L101 65L119 45" fill="none" stroke="'+green+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';label='كتاب مراجعة — رسم تعليمي'}
 else if(k==='construction'){shape='<polygon points="75,7 8,119 142,119" fill="#fff6e6" stroke="#e28a1b" stroke-width="10" stroke-linejoin="round"/><circle cx="66" cy="49" r="9" fill="'+black+'"/><path d="M64 61L55 84M63 68L84 76M57 82L44 101M58 82L77 100M83 78L104 101" fill="none" stroke="'+black+'" stroke-width="7" stroke-linecap="round"/>';label='منطقة عمل — رسم تعليمي'}
 else if(k==='road'){shape=road+'<path d="M28 33H62M28 98H62M88 33H122M88 98H122" stroke="'+steel+'" stroke-width="4" stroke-linecap="round"/><path d="M105 82V47M105 47L94 58M105 47L116 58" fill="none" stroke="'+blue+'" stroke-width="6" stroke-linecap="round"/>'+car(29,47,'#86152d');label='اختيار مسار وطريق — رسم تعليمي'}
 else if(k==='pedestrians'){shape='<polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><circle cx="74" cy="47" r="8" fill="'+black+'"/><path d="M73 57L64 77M73 61L88 72M64 77L52 96M65 76L82 95" fill="none" stroke="'+black+'" stroke-width="7" stroke-linecap="round"/><path d="M37 103H113" stroke="'+black+'" stroke-width="5" stroke-dasharray="11 7"/>';label='عبور مشاة — رسم تعليمي'}
 else if(k==='overtake'){shape=road+car(28,39,'#587995')+car(91,49,'#86152d')+'<path d="M54 94C70 104 88 102 99 91" fill="none" stroke="'+amber+'" stroke-width="5" stroke-linecap="round"/><path d="M91 88L102 90L99 79" fill="none" stroke="'+amber+'" stroke-width="4"/>';label='مناورة تجاوز — رسم تعليمي'}
 else if(k==='fog'){shape='<rect x="12" y="15" width="126" height="98" rx="16" fill="#d9e1e5"/>'+car(61,30,'#587995')+'<path d="M23 86H127M33 99H116M18 72H57M96 72H134" stroke="white" stroke-width="7" stroke-linecap="round" opacity=".95"/><path d="M53 59L31 66M97 59L119 66" stroke="#f3d272" stroke-width="5" stroke-linecap="round"/>';label='قيادة في الضباب — رسم تعليمي'}
 else {shape='<rect x="8" y="12" width="134" height="108" rx="17" fill="#eff5f9" stroke="#85a0b4" stroke-width="3"/><path d="M44 83L65 61L80 74L105 45" fill="none" stroke="'+blue+'" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';label='رسم تعليمي للموقف'}
 return '<svg class="masar-sign masar-review-visual" data-visual-key="'+E(k||'generic')+'" viewBox="0 0 150 128" role="img" aria-label="'+E(label)+'" xmlns="http://www.w3.org/2000/svg">'+shape+'</svg>';
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
 return '<div class="eyebrow">PRACTICE BANK / EXAM TRAINING</div><h1 class="page-title">تجميعات وأسئلة المراجعة</h1><p class="sub">بنك أصلي من '+all.length+' سؤالًا تعليميًا مستوحى من موضوعات المصادر، وليس نسخة من أسئلة الامتحان الرسمي. بعد الإجابة يظهر تفسير السبب، وتُحفظ النتيجة على جهازك.</p><div class="hub-metrics"><div><strong>'+answered+' / '+all.length+'</strong><small>أجبتي عنها</small></div><div><strong>'+correct+'</strong><small>إجابات صحيحة</small></div></div><div class="hub-filters">'+topics.map(function(t){return '<button class="hub-filter '+(quizFilter===t[0]?'on':'')+'" data-action="hub-filter" data-topic="'+t[0]+'" aria-pressed="'+(quizFilter===t[0])+'">'+t[1]+'</button>'}).join('')+'</div>'+(q?'<section class="hub-question card"><div class="hub-q-top"><span>سؤال '+(quizIndex+1)+' / '+bank.length+'</span><span>مرجع الفكرة: '+E(q.source_id==='DOC-TRAINEE'?'كتاب المتدربة':q.source_id==='DOC-NAZAWI'?'مجموعة النزاوي (غير رسمية)':q.source_id)+(q.source_pdf_page?' · PDF ص'+q.source_pdf_page:'')+'</span></div><div class="hub-sign-scene">'+sign(q.visual_key)+'</div><h2>'+E(q.question)+'</h2><div class="hub-options">'+q.options.map(function(o,i){return '<button type="button" class="hub-choice '+(done?(i===q.correct_option_index?'right':i===a?'wrong':''):'')+'" data-action="hub-answer" data-qid="'+E(q.id)+'" data-answer="'+i+'" '+(done?'disabled':'')+' aria-label="الخيار '+(i+1)+'">'+E(o)+'</button>'}).join('')+'</div>'+(done?'<div class="hub-explain" role="status"><strong>'+(a===q.correct_option_index?'إجابتك صحيحة':'راجعي المعلومة')+'</strong><p>'+E(q.explanation)+'</p></div>':'')+'<div class="hub-q-links"><a class="inline-link" href="#/lesson/'+Number(q.lesson_id.slice(-3))+'">راجعي الدرس المرتبط ←</a>'+(done?'<button type="button" class="btn btn-outline" data-action="hub-retry" data-qid="'+E(q.id)+'">إعادة محاولة السؤال</button>':'')+'</div><label class="hub-source-note">ملاحظتي على السؤال<textarea data-source-note="QUESTION-'+E(q.id)+'" placeholder="ليش اخترت الإجابة؟ وش القاعدة اللي أبي أتذكرها؟">'+E((state.sourceNotes||{})['QUESTION-'+q.id]||'')+'</textarea></label><div class="hub-q-nav"><button type="button" class="btn btn-outline" data-action="hub-prev">السابق</button><button type="button" class="btn btn-primary" data-action="hub-next">التالي ←</button></div><p class="hub-legal">الرسم والأمثلة مبسّطة للمذاكرة، وقد تختلف اللوحات بتفاصيلها. للمراجعة النظامية راجعي دليل الإشارات الصادر عن المرور.</p></section>':'<p>لا توجد أسئلة هنا حاليًا. إذا اخترتِ «أخطائي» فمعناه أنكِ ما عندك إجابات خاطئة محفوظة في بنك المراجعة.</p>')+'<section class="hub-supplement"><h3>تجميع النزاوي والصور الـ39</h3><p>يمكنك ربط ملف النزاوي الشخصي من قسم المصادر. أضفنا كذلك فهرس روابط الصور الـ39 التي أرسلتِها، دون إعادة نشر الصور في المستودع العام.</p><a class="btn btn-outline" href="#/sources">مكتبة المصادر والصور</a></section>';
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
   +'<div class="source-chapter-actions"><button type="button" class="btn btn-primary" data-action="hub-inline-open" data-source="'+E(a.source_id)+'" data-page="'+page+'">اعرضي صفحات الكتاب هنا</button><button type="button" class="btn btn-outline" data-action="hub-extract-text" data-source="'+E(a.source_id)+'" data-from="'+page+'" data-to="'+a.pdf_page_end+'">اظهري نص صفحات الكتاب</button>'
   +(!loaded?'<button type="button" class="btn btn-outline" data-action="hub-pick" data-source="'+E(a.source_id)+'">أضيفي ملفك مرة واحدة</button>':'<span class="chip tiny success">ملفك محفوظ على هذا المتصفح</span>')
   +'</div><div class="source-text-preview" aria-live="polite"></div><div class="source-inline-preview" data-source-preview="'+E(a.source_id)+'" aria-live="polite"></div>'
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
function sourceVisual(item){
 var kind=item.category||'',inside='',label='مرجع تعليمي';
 if(kind==='traffic_signs'){
  inside='<polygon points="58,16 17,88 99,88" fill="white" stroke="#cf1522" stroke-width="8"/><circle cx="135" cy="57" r="37" fill="white" stroke="#cf1522" stroke-width="8"/><path d="M119 57H151" stroke="#19232d" stroke-width="8" stroke-linecap="round"/>';
  label='إشارات مرور — رسم توضيحي';
 }else if(kind==='intersections'){
  inside='<rect x="18" y="15" width="144" height="90" rx="16" fill="#dfe7eb"/><path d="M90 20V100M27 60H153" stroke="white" stroke-width="20"/><path d="M90 20V100M27 60H153" stroke="#7893a3" stroke-width="3" stroke-dasharray="9 8"/>';
  label='تقاطع طرق — رسم توضيحي';
 }else if(kind==='dashboard_symbols'){
  inside='<rect x="18" y="17" width="144" height="86" rx="21" fill="#21343f"/><circle cx="55" cy="59" r="18" fill="none" stroke="#d79b2b" stroke-width="6"/><path d="M55 45V64" stroke="#d79b2b" stroke-width="5"/><circle cx="55" cy="75" r="3.5" fill="#d79b2b"/><path d="M92 48H113L121 57H137V76H128L122 84H99L92 76H85V56H92Z" fill="none" stroke="#d79b2b" stroke-width="5"/>';
  label='رموز لوحة القيادة — رسم توضيحي';
 }else if(kind==='assessment_sheet'){
  inside='<rect x="31" y="12" width="118" height="98" rx="12" fill="white" stroke="#b9c9d2" stroke-width="4"/><path d="M51 39H127M51 61H127M51 83H127" stroke="#9fb0ba" stroke-width="4" stroke-linecap="round"/><path d="M41 38L45 42L52 33M41 60L45 64L52 55M41 82L45 86L52 77" fill="none" stroke="#2b7a5f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
  label='نموذج تقييم — رسم توضيحي';
 }else if(kind.includes('question')){
  inside='<rect x="32" y="13" width="116" height="96" rx="12" fill="white" stroke="#b9c9d2" stroke-width="4"/><text x="90" y="72" text-anchor="middle" font-size="50" font-weight="900" fill="#587995">؟</text><path d="M49 92H131" stroke="#d7e1e6" stroke-width="4"/>';
  label='تجميع أسئلة — رسم توضيحي';
 }else if(kind.includes('practical')||kind.includes('individual')){
  inside='<rect x="15" y="16" width="150" height="90" rx="17" fill="#dfe7eb"/><path d="M90 22V100" stroke="white" stroke-width="5" stroke-dasharray="10 8"/><rect x="54" y="45" width="31" height="48" rx="9" fill="#86152d"/><path d="M109 75V42M109 42L98 53M109 42L120 53" fill="none" stroke="#587995" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
  label='مرجع تدريب عملي — رسم توضيحي';
 }else{
  inside='<path d="M30 27C52 17 72 20 90 31C108 20 128 17 150 27V99C127 91 108 93 90 104C72 93 53 91 30 99V27Z" fill="white" stroke="#587995" stroke-width="4"/><path d="M90 31V104M46 48H76M46 65H76M104 48H134M104 65H134" stroke="#b2c1c9" stroke-width="4" stroke-linecap="round"/>';
  label='كتاب أو مرجع — رسم توضيحي';
 }
 return '<div class="source-card-visual" role="img" aria-label="'+E(label)+'"><svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">'+inside+'</svg><span>'+E(item.pages?item.pages+' صفحة':'مرجع بصري')+'</span></div>';
}
function sourceReferences(course,item){
 var lessonById=Object.fromEntries((course.lessons||[]).map(function(l){return [l.id,l]}));
 return (course.lesson_reading_map||[]).flatMap(function(row){
  return (row.resources||[]).filter(function(ref){return ref.source_id===item.id}).map(function(ref){
   return {lesson:lessonById[row.lesson_id],start:ref.pdf_page_start,end:ref.pdf_page_end,note:ref.note||''};
  });
 }).filter(function(x){return !!x.lesson});
}
function sourceBriefHtml(course,item,lessonId,start,end){
 var lesson=(course.lessons||[]).find(function(l){return l.id===lessonId});
 if(!lesson)return '<p class="source-inline-info">تعذر العثور على الدرس المرتبط بهذا الموضع.</p>';
 var s=lesson.study_content||{},points=(s.key_points||[]).slice(0,5);
 var pg='PDF '+start+(end&&end!==start?'–'+end:'');
 return '<section class="source-built-in-brief"><div class="source-brief-top"><div><span class="bento-overline">محتوى جاهز داخل مِسار</span><h4>'+E(item.title)+'</h4></div><span class="chip tiny blue">'+E(pg)+'</span></div><strong>'+E(lesson.title)+'</strong><p>'+E(s.introduction||s.goal||'هذا الموضع مرتبط بموضوع الدرس الحالي.')+'</p>'+(points.length?'<ul>'+points.map(function(x){return '<li>'+E(x)+'</li>'}).join('')+'</ul>':'')+'<div class="source-brief-actions"><a class="btn btn-primary" href="#/lesson/'+lesson.order+'">افتحي الدرس الكامل ←</a></div><small>هذا تلخيص تعليمي أصلي من مِسار للموضع المفهرس، وليس نسخة حرفية من صفحة الكتاب.</small></section>';
}
function studySourceDetails(course,item){
 if(!item.pages)return '';
 var references=sourceReferences(course,item);
 var status=item.verification==='practice_unverified'?'تجميع غير مؤكد':item.verification==='reference_only'?'مرجع يحتاج التحقق':'خطوات تدريب مرتبطة بالمصدر';
 var loaded=!!cachedFiles[item.id];
 var linked=references.map(function(r){
  var pg='PDF '+r.start+(r.end&&r.end!==r.start?'–'+r.end:'');
  return '<div class="source-topic-row"><a href="#/lesson/'+r.lesson.order+'">'+E(r.lesson.title)+'</a><span>'+E(pg)+'</span><div class="source-topic-actions"><button type="button" data-action="hub-source-brief" data-source="'+E(item.id)+'" data-lesson="'+E(r.lesson.id)+'" data-start="'+E(r.start)+'" data-end="'+E(r.end||r.start)+'">عرض المحتوى</button>'+(loaded?'<button type="button" data-action="hub-open-page" data-source="'+E(item.id)+'" data-page="'+E(r.start)+'">فتح PDF</button>':'')+'</div></div>';
 }).join('');
 return '<div class="source-role"><span>'+E(item.pages)+' صفحة</span><span>'+E(item.publisher||'مرجع إضافي')+'</span><span>'+E(status)+'</span></div><details class="source-topic-index"><summary>مواضع القراءة في دروس مِسار · '+references.length+'</summary><div class="source-topic-list">'+(linked||'<p>لم تُضف لهذا المرجع إحالات صفحات بعد.</p>')+'</div><small>زر «عرض المحتوى» يعمل بدون رفع أي ملف ويعرض خلاصة مِسار المرتبطة بالموضع. أرقام الصفحات فهرسة مرجعية وليست إعادة نشر للكتاب.</small></details>';
}
function docsPage(course,state){
 var files=(course.personal_documents||[]).concat(course.uploaded_image_index||[]),byKind=(course.external_study_sources||[]);
 var mapped=(course.personal_documents||[]).filter(function(x){return sourceReferences(course,x).length}).length;
 var filteredFiles=files.filter(function(item){return sourceFilter==='all'||(sourceFilter==='books'?!!item.pages:!item.pages)});
 var cards=filteredFiles.map(function(item,i){
  var file=cachedFiles[item.id],isBook=!!item.pages,prev=i?!!filteredFiles[i-1].pages:null;
  var header=i===0||prev!==isBook?'<h2 class="hub-library-subtitle">'+(isBook?'الكتب ومراجع القيادة · '+(course.personal_documents||[]).length:'الصور والملصقات المرجعية · '+(course.uploaded_image_index||[]).length)+'</h2>':'';
  var stateLabel=file?'المحتوى + PDF محلي':'جاهز داخل مِسار';
  return header+'<article class="hub-source card">'+sourceVisual(item)+'<div class="flexline"><div><span class="bento-overline">'+(item.pages?E(item.pages)+' صفحة · ':'مرجع بصري · ')+'فهرسة تعليمية</span><h3>'+E(item.title)+'</h3></div><span class="chip '+(file?'success':'blue')+'">'+stateLabel+'</span></div><p>'+E(item.scope||item.note||'صورة للتعلم والمقارنة')+'</p>'+studySourceDetails(course,item)+'<p class="hub-filename">'+E(item.filename)+'</p>'+(file?'<div class="hub-source-buttons"><button type="button" class="btn btn-primary" data-action="hub-open" data-source="'+E(item.id)+'">فتح النسخة الكاملة المحفوظة</button><button type="button" class="btn btn-outline" data-action="hub-delete" data-source="'+E(item.id)+'">إزالة النسخة المحلية</button></div>':'')+'<div class="source-inline-preview" data-source-preview="'+E(item.id)+'" aria-live="polite"></div><label class="hub-source-note">ملاحظاتي على المرجع<textarea data-source-note="'+E(item.id)+'" placeholder="وش فهمت؟ وش أحتاج أراجع؟">'+E((state.sourceNotes||{})[item.id]||'')+'</textarea></label></article>';
 }).join('');
 var urls=byKind.map(function(x){return '<div class="hub-online-source"><div><strong>'+E(x.title)+'</strong><small>'+E(x.note)+'</small></div><a href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">زيارة المصدر ↗</a></div>'}).join('');
 var links=course.community_pages&&course.community_pages.image_links||[];
 return '<div class="eyebrow">SOURCE LIBRARY / BUILT INTO MASAR</div><h1 class="page-title">المصادر داخل مِسار</h1><div class="source-library-summary"><strong>'+(course.personal_documents||[]).length+' كتب ومراجع · '+(course.uploaded_image_index||[]).length+' مراجع بصرية · '+byKind.length+' مصادر إلكترونية</strong><span>المذاكرة لا تتطلب منك رفع الملفات. مواضع القراءة وملخصاتها مرتبطة بالدروس وتفتح مباشرة داخل مِسار.</span></div><p class="sub">رتبت المراجع التي أرسلتيها كفهرس تعلم داخل الموقع: كل كتاب يوضح موضوعاته، الصفحات المرتبطة، والدروس التي تستخدمه. النسخ الكاملة المحمية أو مجهولة الترخيص لا ننشرها في مستودع GitHub العام؛ لذلك يعرض مِسار محتوى تعليميًا أصليًا مرتبطًا بها بدل زر رفع إجباري.</p><div class="hub-warning"><strong>وش صار بدل «غير مرفوع بعد»؟</strong><p>ألغينا اعتماد صفحة المصادر على رفعك للملفات. «عرض المحتوى» يعمل مباشرة من الفهرسة الموجودة. إذا كان متصفحك يحتوي أصلًا نسخة PDF محلية من إصدار سابق، سيظهر أيضًا زر فتح النسخة الكاملة.</p></div><div class="hub-metrics"><div><strong>'+files.length+'</strong><small>مرجعًا منظّمًا</small></div><div><strong>'+mapped+' / '+(course.personal_documents||[]).length+'</strong><small>كتب مرتبطة بالدروس</small></div><div><strong>'+((course.lesson_reading_map||[]).length)+'</strong><small>درسًا له خريطة قراءة</small></div></div><div class="source-filter-tabs" role="group" aria-label="تصنيف مكتبة المراجع">'+[['all','الكل'],['books','الكتب السبعة'],['images','المراجع البصرية']].map(function(o){return '<button type="button" data-action="hub-source-filter" data-filter="'+o[0]+'" class="source-filter-tab '+(sourceFilter===o[0]?'selected':'')+'" aria-pressed="'+(sourceFilter===o[0])+'">'+o[1]+'</button>'}).join('')+'</div><div class="hub-source-grid">'+cards+'</div><h2 class="hub-section-title">المصادر الإلكترونية</h2><div class="hub-online-list">'+urls+'</div>'+(links.length?'<details class="hub-page-list"><summary>فهرس صور تجميع النزاوي · '+links.length+' رابطًا</summary><p>هذه روابط طرف ثالث وليست صورًا معتمدة للاختبار. داخل بنك المراجعة يستخدم مِسار رسومًا تعليمية أصلية بدل ترك الأسئلة بلا صورة.</p><div>'+links.map(function(it){return '<a href="'+E(it.url)+'" target="_blank" rel="noopener noreferrer">صفحة '+it.page+'</a>'}).join('')+'</div></details>':'');
}
function paperPage(course){
 var arr=course.review_questions||[];
 return '<div class="eyebrow">PAPER PRACTICE / SELF ASSESSMENT</div><h1 class="page-title">اختبار ورقي تجريبي — '+arr.length+' سؤالًا</h1><p class="sub">ورقة مُعدّة من أسئلة تعليمية أصلية وليست أسئلة الامتحان الرسمي. طبعيها وحليها بالقلم قبل فتح مفتاح الحل. وإذا كنتِ على الجوال، افتحي نفس بنك الأسئلة في الوضع التفاعلي ليظهر لك صح/خطأ والشرح فورًا.</p><div class="paper-actions"><a class="btn btn-primary" href="#/practice-quiz">حل تفاعلي على الجوال · تصحيح فوري</a><button class="btn btn-outline paper-print-btn" type="button" data-action="paper-print">طباعة نموذج الأسئلة</button></div><section class="paper-sheet"><header><strong>مسار BMW — ورقة تقييم تدريبية</strong><span>الاسم: ______________ التاريخ: ______________</span><p>حددي إجابة واحدة لكل سؤال؛ استخدمي قلمًا مختلفًا لمراجعة الأخطاء بعد الحل.</p></header>'+arr.map(function(q,i){return '<article class="paper-item"><strong>'+(i+1)+'. '+E(q.question)+'</strong><div>'+q.options.map(function(o,n){return '<span>□ '+['أ','ب','ج','د'][n]+' — '+E(o)+'</span>'}).join('')+'</div></article>'}).join('')+'</section><details class="hub-page-list paper-key"><summary>عرض مفتاح الحل بعد إنهاء الورقة</summary><ol>'+arr.map(function(q,i){return '<li><strong>'+(i+1)+' — '+['أ','ب','ج','د'][q.correct_option_index]+'</strong>: '+E(q.explanation)+'</li>'}).join('')+'</ol></details>';
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

var pdfTextLibraryPromise=null;
function loadPdfTextLibrary(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(pdfTextLibraryPromise)return pdfTextLibraryPromise;
 pdfTextLibraryPromise=new Promise(function(resolve,reject){
  var script=document.createElement('script');
  script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.async=true;script.referrerPolicy='no-referrer';
  script.onload=function(){
   if(!window.pdfjsLib){reject(Error('PDF reader missing'));return}
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   resolve(window.pdfjsLib);
  };
  script.onerror=function(){reject(Error('PDF text reader unavailable'))};
  document.head.appendChild(script);
 }).catch(function(e){pdfTextLibraryPromise=null;throw e});
 return pdfTextLibraryPromise;
}
var pdfDocumentCache={};
function appleMobilePdf(){
 try{return /iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1}catch(_){return false}
}
async function localPdfDocument(id,file){
 var cached=pdfDocumentCache[id];
 if(cached&&cached.size===file.blob.size&&cached.modified===(file.lastModified||0))return cached.pdf;
 var pdfjs=await loadPdfTextLibrary(),bytes=new Uint8Array(await file.blob.arrayBuffer());
 var pdf=await pdfjs.getDocument({data:bytes}).promise;
 pdfDocumentCache[id]={size:file.blob.size,modified:file.lastModified||0,pdf:pdf};
 return pdf;
}
async function renderPdfCanvas(area,file,id,pageNo){
 area.replaceChildren();
 var shell=document.createElement('section');shell.className='source-canvas-reader';shell.setAttribute('aria-label','قارئ PDF داخل مِسار');
 var toolbar=document.createElement('div');toolbar.className='source-canvas-toolbar';
 var status=document.createElement('span');status.className='source-canvas-status';status.textContent='جارٍ تجهيز الصفحة…';
 var viewport=document.createElement('div');viewport.className='source-canvas-viewport';
 var canvas=document.createElement('canvas');canvas.className='source-pdf-canvas';viewport.appendChild(canvas);
 toolbar.appendChild(status);shell.append(toolbar,viewport);area.appendChild(shell);
 try{
  var pdf=await localPdfDocument(id,file),safe=Math.max(1,Math.min(Number(pageNo)||1,pdf.numPages));
  var page=await pdf.getPage(safe),base=page.getViewport({scale:1});
  var available=Math.max(280,Math.min(940,(area.clientWidth||820)-20)),scale=Math.min(2.2,Math.max(.82,available/base.width));
  var view=page.getViewport({scale:scale}),dpr=Math.min(2,window.devicePixelRatio||1),ctx=canvas.getContext('2d');
  canvas.width=Math.floor(view.width*dpr);canvas.height=Math.floor(view.height*dpr);canvas.style.width=Math.floor(view.width)+'px';canvas.style.height=Math.floor(view.height)+'px';
  await page.render({canvasContext:ctx,viewport:view,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null}).promise;
  toolbar.replaceChildren();
  var prev=document.createElement('button');prev.type='button';prev.className='btn btn-outline';prev.dataset.action='hub-mobile-reader';prev.dataset.source=id;prev.dataset.page=String(Math.max(1,safe-1));prev.textContent='→ السابقة';prev.disabled=safe<=1;
  var label=document.createElement('span');label.className='source-canvas-status';label.textContent='صفحة '+safe+' من '+pdf.numPages;
  var next=document.createElement('button');next.type='button';next.className='btn btn-outline';next.dataset.action='hub-mobile-reader';next.dataset.source=id;next.dataset.page=String(Math.min(pdf.numPages,safe+1));next.textContent='التالية ←';next.disabled=safe>=pdf.numPages;
  toolbar.append(prev,label,next);
  var note=document.createElement('p');note.className='source-inline-info';note.textContent='قارئ متوافق مع الجوال باستخدام PDF.js. ملفك يبقى محليًا في المتصفح؛ تُحمّل مكتبة العرض فقط من CDN عند الحاجة.';
  shell.appendChild(note);
 }catch(err){
  console.warn(err);area.replaceChildren();
  var fail=document.createElement('p');fail.className='source-inline-info';fail.textContent='تعذّر تشغيل القارئ المتوافق على هذا المتصفح. جربي قارئ PDF المدمج أو استخراج النص.';
  area.appendChild(fail);
 }
}
function click(action,el,ctx){
 var c=ctx.course,st=ctx.state;
 if(action==='hub-source-filter'){sourceFilter=el.dataset.filter||'all';ctx.render(true);return true}
 if(action==='hub-filter'){quizFilter=el.dataset.topic||'all';quizIndex=0;pinnedQuestionId=null;ctx.render(true);return true}
 if(action==='hub-prev'){quizIndex=Math.max(0,quizIndex-1);pinnedQuestionId=null;ctx.render(true);return true}
 if(action==='hub-next'){var remaining=filteredQuestions(c,st),stillThere=remaining.some(function(q){return q.id===pinnedQuestionId});quizIndex=Math.max(0,Math.min(remaining.length-1,quizIndex+(pinnedQuestionId&&!stillThere?0:1)));pinnedQuestionId=null;ctx.render(true);return true}
 if(action==='hub-answer'){var q=(c.review_questions||[]).find(function(x){return x.id===el.dataset.qid});var a=Number(el.dataset.answer);if(q&&Number.isInteger(a)&&a>=0&&a<q.options.length){st.reviewAnswers=st.reviewAnswers||{};st.reviewAnswers[q.id]=a;pinnedQuestionId=q.id;window.MasarCoach?.record(st,'bank',q.id,a===q.correct_option_index);ctx.save();ctx.render(true)}return true}
 if(action==='hub-retry'){st.reviewAnswers=st.reviewAnswers||{};delete st.reviewAnswers[el.dataset.qid];pinnedQuestionId=null;var idx=filteredQuestions(c,st).findIndex(function(q){return q.id===el.dataset.qid});if(idx>=0)quizIndex=idx;ctx.save();ctx.render(true);return true}
 if(action==='hub-batch-pick'){var batchInput=document.getElementById('hub-batch');if(batchInput){batchInput.value='';batchInput.click()}return true}
 if(action==='hub-pick'){var input=document.getElementById('hub-file');if(input){input.dataset.source=el.dataset.source;input.value='';input.click()}return true}
 if(action==='hub-mobile-reader'){
  var mobileId=el.dataset.source,mobilePg=Number(el.dataset.page)||1,mobileArea=el.closest('.source-inline-preview')||el.closest('.source-chapter,.hub-source,.source-topic-index')?.querySelector('.source-inline-preview');
  if(!mobileArea||!ctx.db||!Number.isInteger(mobilePg)||mobilePg<1)return true;
  var waiting=document.createElement('p');waiting.className='source-inline-loading';waiting.textContent='جارٍ فتح القارئ المتوافق مع الجوال…';mobileArea.replaceChildren(waiting);
  ctx.db.getPersonalFile(mobileId).then(function(file){
   if(!file||file.mime!=='application/pdf'){waiting.textContent='هذا القارئ مخصص لملفات PDF المحلية.';return}
   renderPdfCanvas(mobileArea,file,mobileId,mobilePg);
  }).catch(function(){waiting.textContent='تعذر قراءة ملف PDF المحلي.'});
  return true;
 }
 if(action==='hub-extract-text'){
  var id=el.dataset.source,from=Number(el.dataset.from),to=Number(el.dataset.to);
  var parent=el.closest('.source-chapter'),region=parent&&parent.querySelector('.source-text-preview');
  if(!region||!Number.isInteger(from)||!Number.isInteger(to)||from<1||from>to)return true;
  if(!ctx.db){ctx.toast('القراءة المحلية غير متاحة على هذا المتصفح');return true}
  el.disabled=true;el.textContent='جارٍ قراءة نص الصفحات…';
  (async function(){
    try{
      var file=await ctx.db.getPersonalFile(id);
      if(!file||file.mime!=='application/pdf'){region.textContent='أضيفي نسخة PDF الأصلية إلى مكتبتك أولًا، ثم افتحي النص من هنا.';return}
      var pdfjs=await loadPdfTextLibrary();
      var bytes=new Uint8Array(await file.blob.arrayBuffer());
      var pdf=await pdfjs.getDocument({data:bytes}).promise;
      region.replaceChildren();
      var last=Math.min(pdf.numPages,to,from+7),hadText=false;
      for(var pageNo=from;pageNo<=last;pageNo++){
        var page=await pdf.getPage(pageNo),contents=await page.getTextContent();
        var readable=(contents.items||[]).map(function(x){return x.str||''}).join(' ').replace(/\s+/g,' ').trim();
        var section=document.createElement('section');section.className='source-text-page';
        var heading=document.createElement('h4');heading.textContent='نص صفحة PDF '+pageNo;section.appendChild(heading);
        var body=document.createElement('p');body.dir='auto';body.textContent=readable||'هذه الصفحة مصورة أو ليس لها نص قابل للاستخراج. اعرضي الصفحة الأصلية في قارئ الكتاب أعلاه.';section.appendChild(body);
        region.appendChild(section);
        if(readable)hadText=true;
      }
      var info=document.createElement('p');info.className='source-inline-info';info.textContent='هذا نص مستخرج آليًا من ملفك على جهازك، وليس تصحيحًا لغويًا معتمدًا؛ ارجعي لصورة الصفحة عند تشوّه ترتيب الكلمات. النص لا يُنشر على GitHub.';region.appendChild(info);
      if(last<Math.min(pdf.numPages,to)){
        var next=document.createElement('button');next.type='button';next.className='btn btn-outline';next.dataset.action='hub-extract-text';next.dataset.source=id;next.dataset.from=last+1;next.dataset.to=to;next.textContent='اقرئي الصفحات التالية ('+(last+1)+'–'+Math.min(last+8,to)+')';region.appendChild(next);
      }
      await pdf.destroy();
    }catch(err){
      console.warn(err);region.textContent='تعذّر استخراج النص تلقائيًا. يمكنك قراءة الصفحات الأصلية من قارئ PDF داخل الدرس؛ بعض الكتب عبارة عن صور ممسوحة ضوئيًا.';
    }finally{el.disabled=false;el.textContent='إظهار نص الصفحات مجددًا'}
  })();
  return true;
 }
 if(action==='hub-inline-open'||action==='hub-open-page'||action==='hub-open'){
  var id=el.dataset.source,pg=Number(el.dataset.page)||1;
  if(!Number.isInteger(pg)||pg<1||pg>500)return true;
  var area=el.closest('.source-chapter,.hub-source,.source-topic-index')?.querySelector('.source-inline-preview');
  if(!area){var doc=el.closest('.hub-source');area=doc&&doc.querySelector('.source-inline-preview');}
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
   if(f.mime==='application/pdf'&&appleMobilePdf()){
    renderPdfCanvas(area,f,id,pg);return;
   }
   var url=URL.createObjectURL(f.blob);
   var viewer=document.createElement('iframe');viewer.className='source-embedded-file';viewer.title='عرض المرجع داخل مِسار، صفحة '+pg;
   viewer.loading='lazy';viewer.src=url+(f.mime==='application/pdf'?'#page='+pg:'');
   area.appendChild(viewer);
   var caption=document.createElement('p');caption.className='source-inline-info';
   caption.textContent='المصدر مفتوح داخل مِسار من نسختك الشخصية. إذا كان قارئ PDF في المتصفح غير مريح، استخدمي القارئ المتوافق مع الجوال.';
   area.appendChild(caption);
   if(f.mime==='application/pdf'){
    var mobileReader=document.createElement('button');mobileReader.type='button';mobileReader.className='btn btn-outline source-mobile-reader-btn';mobileReader.dataset.action='hub-mobile-reader';mobileReader.dataset.source=id;mobileReader.dataset.page=String(pg);mobileReader.textContent='فتح قارئ PDF المتوافق مع الجوال';
    area.appendChild(mobileReader);
   }
   setTimeout(function(){URL.revokeObjectURL(url)},1800000);
  }).catch(function(){status.textContent='تعذر قراءة المرجع من التخزين المحلي. أعيدي إضافة الملف من المكتبة.'});
  return true;
 }
 if(action==='hub-delete'){if(confirm('حذف نسختك المحلية من هذا المرجع؟ الملف الأصلي على الكمبيوتر لن يتأثر.'))ctx.db.deletePersonalFile(el.dataset.source).then(function(){if(pdfDocumentCache[el.dataset.source]){try{pdfDocumentCache[el.dataset.source].pdf.destroy()}catch(_){}delete pdfDocumentCache[el.dataset.source]}delete cachedFiles[el.dataset.source];ctx.render(true);ctx.toast('أزلنا الملف من المتصفح فقط')}).catch(function(){ctx.toast('تعذّر حذف الملف')});return true}
 return false;
}
function normalizedFileName(filename){
 return String(filename||'').normalize('NFKC').replace(/\s*\(\d+\)(?=\.[^.]+$)/g,'').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase();
}
async function upload(input,ctx){
 if(input.dataset.source==='batch'){
  var picked=Array.from(input.files||[]);
  if(!picked.length)return;
  var library=ctx.course.personal_documents||[],success=[],unknown=[],failed=[];
  for(const file of picked){
   var expected=library.find(function(x){return normalizedFileName(x.filename)===normalizedFileName(file.name)});
   if(!expected){unknown.push(file.name);continue}
   try{await ctx.db.savePersonalFile(expected.id,file);success.push(expected.title)}
   catch(err){console.warn(err);failed.push(file.name)}
  }
  try{await refreshFiles(ctx.db)}catch(err){console.warn(err)}
  ctx.render(true);
  ctx.toast('أضفنا '+success.length+' كتب محليًا'+(unknown.length?' · '+unknown.length+' اسم غير مطابق':'')+(failed.length?' · تعذر حفظ '+failed.length:''));
  return;
 }
 var file=input.files&&input.files[0],id=input.dataset.source;
 if(!file||!id)return;
 if(file.size>80*1024*1024){ctx.toast('هذا الملف كبير جدًا لهذا المتصفح، احتفظي بنسختك على الكمبيوتر');return}
 try{await ctx.db.savePersonalFile(id,file);await refreshFiles(ctx.db);ctx.render(true);ctx.toast('حُفظ المرجع في متصفحك، وافتحي قسمه الآن لقراءة الصفحات هنا')}
 catch(e){console.warn(e);ctx.toast('لم يُحفظ الملف؛ قد لا تكون المساحة كافية. أبقي النسخة الأصلية على الكمبيوتر.')}
}

window.MasarHub=Object.freeze({quizPage,practicePage,docsPage,paperPage,lessonReadings,videoNotes,notesPage,refreshFiles,click,upload,sign});
})();