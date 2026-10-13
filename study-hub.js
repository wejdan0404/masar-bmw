/* MASAR original learning toolkit: personal documents, quizzes, practical checklists. */
(function(){
'use strict';
var cachedFiles={}, quizFilter='all',quizIndex=0,pinnedQuestionId=null;
var sourceFilter='all';
function E(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function sign(k){
 var red='#cf1522',blue='#1b578b',black='#19232d',steel='#6f8da2',paper='#f7fafb',yellow='#f1b835',shape='',label='',kind='sign';
 var road='<rect x="18" y="12" width="184" height="126" rx="18" fill="#334b59"/><path d="M110 18V132" stroke="#edf3f6" stroke-width="4" stroke-dasharray="12 10"/>';
 function car(x,y,fill){return '<g transform="translate('+x+' '+y+')"><rect width="36" height="58" rx="11" fill="'+fill+'"/><rect x="6" y="8" width="24" height="15" rx="5" fill="#a9c2d0"/><rect x="6" y="35" width="24" height="14" rx="5" fill="#7893a3"/></g>'}
 if(k==='stop'){shape='<g transform="translate(35 8)"><polygon points="75,5 113,20 130,57 113,94 75,110 36,94 20,57 36,20" fill="'+red+'" stroke="white" stroke-width="4"/><text x="75" y="66" text-anchor="middle" fill="white" font-weight="900" font-size="22">قف</text></g>';label='رسم تعليمي مبسط لإشارة قف'}
 else if(k==='yield'){shape='<g transform="translate(35 9)"><polygon points="75,116 8,8 142,8" fill="white" stroke="'+red+'" stroke-width="13" stroke-linejoin="round"/></g>';label='رسم تعليمي مبسط لإفساح الطريق'}
 else if(k==='no-entry'){shape='<g transform="translate(35 10)"><circle cx="75" cy="64" r="53" fill="'+red+'"/><rect x="38" y="57" width="74" height="15" rx="3" fill="white"/></g>';label='رسم تعليمي مبسط لممنوع الدخول'}
 else if(k==='speed60'){shape='<g transform="translate(35 10)"><circle cx="75" cy="64" r="53" fill="white" stroke="'+red+'" stroke-width="11"/><text x="75" y="79" font-size="45" text-anchor="middle" fill="'+black+'">60</text></g>';label='رسم تعليمي مبسط لحد السرعة 60'}
 else if(k==='no-parking'){shape='<g transform="translate(35 10)"><circle cx="75" cy="64" r="54" fill="'+blue+'" stroke="'+red+'" stroke-width="10"/><path d="M35 25L116 106" stroke="'+red+'" stroke-width="12"/></g>';label='رسم تعليمي مبسط لمنع الوقوف'}
 else if(k==='no-uturn'){shape='<g transform="translate(35 10)"><circle cx="75" cy="64" r="54" fill="white" stroke="'+red+'" stroke-width="10"/><path d="M102 92V47Q102 22 76 22T48 47V78M48 78L36 64M48 78L62 64" fill="none" stroke="'+black+'" stroke-width="10" stroke-linejoin="round"/><path d="M33 24L116 106" stroke="'+red+'" stroke-width="10"/></g>';label='رسم تعليمي مبسط لمنع الدوران للخلف'}
 else if(k==='traffic-light'){shape='<g transform="translate(35 8)"><polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><rect x="65" y="44" width="20" height="62" rx="6" fill="'+black+'"/><circle cx="75" cy="55" r="7" fill="#ed333a"/><circle cx="75" cy="74" r="7" fill="#f4c02d"/><circle cx="75" cy="93" r="7" fill="#28a35e"/></g>';label='رسم تعليمي مبسط للتحذير من إشارة ضوئية'}
 else if(k==='roundabout'){shape='<g transform="translate(35 8)"><polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><circle cx="75" cy="73" r="25" fill="none" stroke="'+black+'" stroke-width="6" stroke-dasharray="31 12"/><path d="M56 52L50 67L68 66M86 96L101 93L90 79" fill="none" stroke="'+black+'" stroke-width="5"/></g>';label='رسم تعليمي مبسط لدوار'}
 else if(k==='blue-direction'){shape='<g transform="translate(35 10)"><circle cx="75" cy="64" r="52" fill="'+blue+'"/><path d="M41 65H109M109 65L87 43M109 65L87 87" fill="none" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></g>';label='رسم تعليمي مبسط لاتجاه إلزامي'}
 else if(k==='warning'){shape='<g transform="translate(35 8)"><polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><path d="M75 42V79" stroke="'+black+'" stroke-width="10" stroke-linecap="round"/><circle cx="75" cy="98" r="6" fill="'+black+'"/></g>';label='رسم تعليمي مبسط لشكل لوحة تحذير'}
 else if(k==='intersection'){shape='<g transform="translate(35 8)"><polygon points="75,7 8,119 142,119" fill="white" stroke="'+red+'" stroke-width="10" stroke-linejoin="round"/><path d="M75 39V100M44 69H106" stroke="'+black+'" stroke-width="11" stroke-linecap="round"/></g>';label='رسم تعليمي مبسط لتقاطع طرق'}
 else if(k==='distance'){kind='scene';shape=road+car(92,18,'#8d1b33')+car(92,82,'#d8e3e9')+'<path d="M73 67H147M73 67l12-9M73 67l12 9M147 67l-12-9M147 67l-12 9" stroke="'+yellow+'" stroke-width="4" fill="none" stroke-linecap="round"/><text x="110" y="61" text-anchor="middle" fill="#fff" font-size="12" font-weight="800">مسافة</text>';label='مشهد تعليمي لمسافة الأمان بين مركبتين'}
 else if(k==='lane'){kind='scene';shape=road+car(132,66,'#8d1b33')+'<path d="M150 62C144 35 113 27 84 38" stroke="'+yellow+'" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M84 38l13-10M84 38l15 7" stroke="'+yellow+'" stroke-width="6" fill="none" stroke-linecap="round"/>';label='مشهد تعليمي لتغيير المسار'}
 else if(k==='parking'){kind='scene';shape='<rect x="12" y="12" width="196" height="126" rx="18" fill="#3a515e"/><path d="M32 28V122M78 28V122M124 28V122M170 28V122" stroke="#eef3f6" stroke-width="3"/>'+car(84,58,'#8d1b33')+'<path d="M102 58C101 39 91 32 73 31" stroke="'+yellow+'" stroke-width="5" fill="none"/><path d="M73 31l11-7M73 31l9 9" stroke="'+yellow+'" stroke-width="5" fill="none"/>';label='مشهد تعليمي للرجوع من موقف'}
 else if(k==='seatbelt'){kind='scene';shape='<rect x="35" y="16" width="150" height="118" rx="26" fill="#263b47"/><circle cx="90" cy="46" r="18" fill="#f2f5f7"/><path d="M71 119V82Q71 65 90 65Q109 65 109 82V119" fill="none" stroke="#f2f5f7" stroke-width="12" stroke-linecap="round"/><path d="M70 67L122 119" stroke="'+red+'" stroke-width="9" stroke-linecap="round"/><rect x="119" y="112" width="18" height="13" rx="3" fill="'+red+'"/>';label='رسم تعليمي لمؤشر حزام الأمان'}
 else if(k==='tpms'){kind='scene';shape='<rect x="28" y="16" width="164" height="118" rx="26" fill="#263b47"/><path d="M66 46Q49 61 51 92Q53 112 73 121M154 46Q171 61 169 92Q167 112 147 121M78 123H142" fill="none" stroke="'+yellow+'" stroke-width="10" stroke-linecap="round"/><path d="M110 58V88" stroke="'+yellow+'" stroke-width="9" stroke-linecap="round"/><circle cx="110" cy="105" r="6" fill="'+yellow+'"/>';label='رسم تعليمي لمؤشر ضغط الإطارات'}
 else if(k==='check-engine'){kind='scene';shape='<rect x="25" y="18" width="170" height="114" rx="25" fill="#263b47"/><path d="M63 65H83L93 53H144L153 65H169V105H61V76H49V62H63Z" fill="none" stroke="'+yellow+'" stroke-width="8" stroke-linejoin="round"/><circle cx="91" cy="85" r="5" fill="'+yellow+'"/><path d="M105 85H146" stroke="'+yellow+'" stroke-width="7" stroke-linecap="round"/>';label='رسم تعليمي لمؤشر عطل المحرك'}
 else if(k==='book'){kind='scene';shape='<rect x="20" y="18" width="180" height="116" rx="22" fill="#edf3f6"/><path d="M110 42Q82 26 48 38V111Q83 102 110 118M110 42Q138 26 172 38V111Q137 102 110 118" fill="#fff" stroke="'+steel+'" stroke-width="5"/><path d="M110 42V118" stroke="'+steel+'" stroke-width="4"/><path d="M61 59H91M61 74H91M128 59H159M128 74H159" stroke="#b2c2cc" stroke-width="4" stroke-linecap="round"/><circle cx="150" cy="98" r="16" fill="'+red+'"/><path d="M143 98l6 6 11-14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';label='رسم تعليمي للمراجعة من كتاب وأسئلة'}
 else if(k==='construction'){kind='scene';shape='<rect x="16" y="22" width="188" height="106" rx="18" fill="#eef2f4"/><path d="M54 111L77 45L101 111Z" fill="#f28a2e"/><path d="M62 88H93M69 69H86" stroke="#fff" stroke-width="7"/><rect x="110" y="58" width="68" height="18" rx="6" fill="'+red+'"/><rect x="110" y="90" width="68" height="18" rx="6" fill="'+red+'"/><path d="M122 58v50M165 58v50" stroke="#fff" stroke-width="5"/>';label='رسم تعليمي لمنطقة أعمال مؤقتة'}
 else if(k==='road'){kind='scene';shape='<rect x="38" y="10" width="144" height="130" rx="18" fill="#344d5b"/><path d="M110 18V132" stroke="#e9f0f4" stroke-width="4" stroke-dasharray="12 10"/><path d="M110 112V70Q110 48 87 48H72M72 48l15-13M72 48l15 13" stroke="'+yellow+'" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';label='رسم تعليمي لسهم اتجاه على المسار'}
 else if(k==='pedestrians'){kind='scene';shape='<rect x="20" y="18" width="180" height="114" rx="18" fill="#3a515e"/><path d="M35 91H185" stroke="#fff" stroke-width="6" stroke-dasharray="15 8"/><path d="M57 54H170" stroke="#fff" stroke-width="5" stroke-dasharray="12 8"/><circle cx="111" cy="39" r="9" fill="'+yellow+'"/><path d="M111 49l-2 27M109 58l-18 13M109 60l17 13M109 76l-14 22M109 76l17 21" stroke="'+yellow+'" stroke-width="6" stroke-linecap="round"/>';label='مشهد تعليمي لعبور مشاة'}
 else if(k==='overtake'){kind='scene';shape=road+car(70,69,'#d8e3e9')+car(126,46,'#8d1b33')+'<path d="M92 100C76 75 82 48 110 36C129 28 149 29 165 38" stroke="'+yellow+'" stroke-width="6" fill="none"/><path d="M165 38l-17-2M165 38l-9 15" stroke="'+yellow+'" stroke-width="6" fill="none" stroke-linecap="round"/>';label='مشهد تعليمي لتجاوز مركبة'}
 else if(k==='fog'){kind='scene';shape='<rect x="15" y="18" width="190" height="114" rx="20" fill="#dce5e9"/><path d="M26 48H194M18 67H174M41 86H202M24 105H182" stroke="#9fb0ba" stroke-width="7" stroke-linecap="round" opacity=".7"/>'+car(92,58,'#8d1b33')+'<path d="M84 82L48 95M136 82L172 95" stroke="#f0d46a" stroke-width="8" stroke-linecap="round" opacity=".9"/>';label='مشهد تعليمي للقيادة في الضباب'}
 else if(k==='assessment'){kind='scene';shape='<rect x="42" y="17" width="136" height="116" rx="12" fill="#fff" stroke="'+steel+'" stroke-width="5"/><path d="M68 48l7 7 14-18M68 77l7 7 14-18M68 106l7 7 14-18" stroke="'+blue+'" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M101 48H151M101 77H151M101 106H151" stroke="#b7c6cf" stroke-width="5" stroke-linecap="round"/>';label='رسم تعليمي لنموذج تقييم مهارات'}
 else {kind='scene';shape='<rect x="24" y="18" width="172" height="114" rx="22" fill="'+paper+'" stroke="'+steel+'" stroke-width="4"/><circle cx="86" cy="75" r="34" fill="none" stroke="'+blue+'" stroke-width="7"/><circle cx="86" cy="75" r="9" fill="'+blue+'"/><path d="M86 41V109M52 75H120" stroke="'+blue+'" stroke-width="6"/><path d="M142 49h27M142 68h27M142 87h27" stroke="'+steel+'" stroke-width="5" stroke-linecap="round"/>';label='رسم تعليمي للمفهوم'}
 return '<svg class="masar-sign masar-question-visual '+kind+'" data-visual-key="'+E(k||'generic')+'" viewBox="0 0 220 150" role="img" aria-label="'+E(label)+'" xmlns="http://www.w3.org/2000/svg">'+shape+'</svg>';
}
function sourceVisualPreview(item){
 var map={
  'IMG-WARNING':['warning','traffic-light','intersection'],
  'IMG-JUNCTION':['intersection'],
  'IMG-REGULATORY':['stop','no-entry','speed60'],
  'IMG-DASHBOARD':['seatbelt','tpms','check-engine'],
  'IMG-EVAL-SHARD':['assessment'],
  'IMG-EVAL-SDS':['assessment']
 };
 var keys=map[item.id]||['book'];
 return '<div class="source-visual-preview" aria-label="معاينة تعليمية بديلة">'+keys.map(function(k){return sign(k)}).join('')+'<small>معاينة تعليمية من مِسار؛ ليست إعادة نشر للصورة الأصلية المرفوعة.</small></div>';
}
function sourceLabel(course,id){
 var all=[].concat(course.personal_documents||[],course.uploaded_image_index||[],course.sources||[]);
 var x=all.find(function(s){return s.id===id});
 return x?x.title||x.name||id:id;
}
function sourceSummaryHTML(course,id,from,to){
 var docs=[].concat(course.personal_documents||[],course.uploaded_image_index||[]),doc=docs.find(function(x){return x.id===id});
 var lessonById=Object.fromEntries((course.lessons||[]).map(function(l){return [l.id,l]}));
 var a=Math.max(1,Number(from)||1),b=Math.max(a,Number(to)||a);
 var hits=(course.lesson_reading_map||[]).flatMap(function(row){
  return (row.resources||[]).filter(function(ref){return ref.source_id===id&&Number(ref.pdf_page_start)<=b&&Number(ref.pdf_page_end)>=a}).map(function(ref){return {lesson:lessonById[row.lesson_id],ref:ref}});
 }).filter(function(x){return !!x.lesson});
 var cards=hits.map(function(x){
  var sc=x.lesson.study_content||{},pts=(sc.key_points||[]).slice(0,4);
  return '<article class="source-summary-lesson"><div><span>الدرس '+String(x.lesson.order).padStart(2,'0')+'</span><strong>'+E(x.lesson.title)+'</strong></div>'+(pts.length?'<ul>'+pts.map(function(p){return '<li>'+E(p)+'</li>'}).join('')+'</ul>':'')+'<a href="#/lesson/'+x.lesson.order+'">فتح الدرس الكامل ←</a></article>';
 }).join('');
 return '<section class="source-page-summary"><div class="source-page-summary-head"><span class="chip tiny blue">'+E(doc&&doc.pages?'PDF ص '+a+(b!==a?'–'+b:''):'مرجع بصري')+'</span><h3>'+E(doc?doc.title:id)+'</h3></div><p>هذا عرض مِسار للمحتوى المرتبط بهذا الموضع، وليس صورة أو نسخًا حرفيًا للصفحة الأصلية.</p><div class="source-summary-lessons">'+(cards||'<div class="empty">لا يوجد درس مربوط بهذه الصفحة بعد.</div>')+'</div></section>';
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
 return '<div class="eyebrow">PRACTICE BANK / EXAM TRAINING</div><h1 class="page-title">تجميعات وأسئلة المراجعة</h1><p class="sub">بنك أصلي من '+all.length+' سؤالًا تعليميًا مستوحى من موضوعات المصادر، وليس نسخة من أسئلة الامتحان الرسمي. بعد الإجابة يظهر تفسير السبب، وتُحفظ النتيجة على جهازك.</p><div class="hub-metrics"><div><strong>'+answered+' / '+all.length+'</strong><small>أجبتي عنها</small></div><div><strong>'+correct+'</strong><small>إجابات صحيحة</small></div></div><div class="hub-filters">'+topics.map(function(t){return '<button class="hub-filter '+(quizFilter===t[0]?'on':'')+'" data-action="hub-filter" data-topic="'+t[0]+'" aria-pressed="'+(quizFilter===t[0])+'">'+t[1]+'</button>'}).join('')+'</div>'+(q?'<section class="hub-question card"><div class="hub-q-top"><span>سؤال '+(quizIndex+1)+' / '+bank.length+'</span><span>مرجع الفكرة: '+E(sourceLabel(course,q.source_id))+(q.source_pdf_page?' · PDF ص'+q.source_pdf_page:'')+'</span></div><div class="hub-sign-scene">'+sign(q.visual_key)+'</div><h2>'+E(q.question)+'</h2><div class="hub-options">'+q.options.map(function(o,i){return '<button type="button" class="hub-choice '+(done?(i===q.correct_option_index?'right':i===a?'wrong':''):'')+'" data-action="hub-answer" data-qid="'+E(q.id)+'" data-answer="'+i+'" '+(done?'disabled':'')+' aria-label="الخيار '+(i+1)+'">'+E(o)+'</button>'}).join('')+'</div>'+(done?'<div class="hub-explain" role="status"><strong>'+(a===q.correct_option_index?'إجابتك صحيحة':'راجعي المعلومة')+'</strong><p>'+E(q.explanation)+'</p></div>':'')+'<div class="hub-q-links"><a class="inline-link" href="#/lesson/'+Number(q.lesson_id.slice(-3))+'">راجعي الدرس المرتبط ←</a>'+(done?'<button type="button" class="btn btn-outline" data-action="hub-retry" data-qid="'+E(q.id)+'">إعادة محاولة السؤال</button>':'')+'</div><label class="hub-source-note">ملاحظتي على السؤال<textarea data-source-note="QUESTION-'+E(q.id)+'" placeholder="ليش اخترت الإجابة؟ وش القاعدة اللي أبي أتذكرها؟">'+E((state.sourceNotes||{})['QUESTION-'+q.id]||'')+'</textarea></label><div class="hub-q-nav"><button type="button" class="btn btn-outline" data-action="hub-prev">السابق</button><button type="button" class="btn btn-primary" data-action="hub-next">التالي ←</button></div><p class="hub-legal">الرسم والأمثلة مبسّطة للمذاكرة، وقد تختلف اللوحات بتفاصيلها. للمراجعة النظامية راجعي دليل الإشارات الصادر عن المرور.</p></section>':'<p>لا توجد أسئلة هنا حاليًا. إذا اخترتِ «أخطائي» فمعناه أنكِ ما عندك إجابات خاطئة محفوظة في بنك المراجعة.</p>')+'<section class="hub-supplement"><h3>الصور والتجميعات</h3><p>كل سؤال في بنك المراجعة صار معه رسم تعليمي واضح. مراجعك الأصلية وفهرس التجميعات موجودة في صفحة المصادر بدون طلب رفع يدوي.</p><a class="btn btn-outline" href="#/sources">مكتبة المصادر والصور</a></section>';
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
  var page=a.pdf_page_start,pg=page===a.pdf_page_end?'PDF صفحة '+page:'PDF صفحات '+page+'–'+a.pdf_page_end;
  return '<details class="source-chapter"><summary><span class="chapter-title">'+E(a.source_title)+'</span><span class="chapter-page">'+pg+'</span><span class="chapter-toggle" aria-hidden="true">⌄</span></summary>'
   +'<div class="source-chapter-inner"><h3>محتوى الدرس المرتبط بهذا الفصل</h3><p>'+intro+'</p><ul>'+keypoints+'</ul>'
   +'<p class="source-honesty">هذا شرح أصلي من مِسار للموضوع المرتبط بالصفحات المحددة، وليس نسخًا حرفيًا أو صورة للكتاب.</p>'
   +'<div class="source-chapter-actions"><button type="button" class="btn btn-primary" data-action="hub-source-summary" data-source="'+E(a.source_id)+'" data-from="'+page+'" data-to="'+a.pdf_page_end+'">فتح ملخص الصفحات داخل مِسار</button></div>'
   +'<div class="source-inline-preview" data-source-preview="'+E(a.source_id)+'" aria-live="polite"></div>'
   +'<p class="source-page-hint">'+E(a.note||'')+'</p></div></details>';
 }).join('');
 return '<section class="lesson-sources card" id="source-reading"><div class="eyebrow">THE BOOKS / مصادر الدرس</div><h2>المرجع داخل مسار — بدون رفع يدوي</h2>'
 +'<p>افتحي اسم المرجع ثم «فتح ملخص الصفحات داخل مِسار». ستظهر لك النقاط والدروس المرتبطة بنفس موضع القراءة من غير ما يطلب منك الموقع رفع PDF.</p>'
 +'<div class="source-chapter-list">'+cards+'</div><p class="hub-legal">الصفحات الأصلية الكاملة لبعض المراجع لا تُنشر في المستودع العام بسبب حقوق النشر؛ مِسار يعرض الفهرسة والشرح المرتبط بها داخل الموقع.</p></section>';
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
  return '<div class="source-topic-row"><a href="#/lesson/'+r.lesson.order+'">'+E(r.lesson.title)+'</a><span>'+E(pg)+'</span><button type="button" data-action="hub-open-page" data-source="'+E(item.id)+'" data-page="'+E(r.start)+'" data-page-end="'+E(r.end||r.start)+'">فتح الصفحة داخل مِسار</button></div>';
 }).join('');
 return '<div class="source-role"><span>'+E(item.pages)+' صفحة</span><span>'+E(item.publisher||'مرجع إضافي')+'</span><span>'+E(status)+'</span></div><details class="source-topic-index"><summary>مواضع القراءة في دروس مِسار · '+references.length+'</summary><div class="source-topic-list">'+(linked||'<p>لم تُضف لهذا المرجع إحالات صفحات بعد.</p>')+'</div><small>الربط بالصفحات لا يعني تدقيق الكتاب كاملًا أو صلاحية الأسئلة للاختبار الحالي.</small></details>';
}
function docsPage(course,state){
 var files=(course.personal_documents||[]).concat(course.uploaded_image_index||[]),byKind=(course.external_study_sources||[]);
 var filteredFiles=files.filter(function(item){return sourceFilter==='all'||(sourceFilter==='books'?!!item.pages:!item.pages)});
 var mappedCount=(course.lesson_reading_map||[]).filter(function(row){return (row.resources||[]).length}).length;
 var cards=filteredFiles.map(function(item,i){
  var isBook=!!item.pages,prev=i?!!filteredFiles[i-1].pages:null,header=i===0||prev!==isBook?'<h2 class="hub-library-subtitle">'+(isBook?'الكتب ومراجع القيادة · '+(course.personal_documents||[]).length:'الصور والملصقات المرجعية · '+(course.uploaded_image_index||[]).length)+'</h2>':'';
  return header+'<article class="hub-source card"><div class="flexline"><div><span class="bento-overline">'+(item.pages?E(item.pages)+' صفحة · ':'مرجع بصري · ')+'مستخدم داخل المنهج</span><h3>'+E(item.title)+'</h3></div><span class="chip success">'+(isBook?'مفهرس في مِسار':'معاينة متاحة')+'</span></div>'+(isBook?'':sourceVisualPreview(item))+'<p>'+E(item.scope||item.note||'مرجع للتعلم والمقارنة')+'</p>'+studySourceDetails(course,item)+'<p class="hub-filename">اسم الملف المرجعي: '+E(item.filename)+'</p><div class="source-inline-preview" data-source-preview="'+E(item.id)+'" aria-live="polite"></div><label class="hub-source-note">ملاحظاتي على المرجع<textarea data-source-note="'+E(item.id)+'" placeholder="وش فهمت؟ وش أحتاج أراجع؟">'+E((state.sourceNotes||{})[item.id]||'')+'</textarea></label></article>';
 }).join('');
 var urls=byKind.map(function(x){return '<div class="hub-online-source"><div><strong>'+E(x.title)+'</strong><small>'+E(x.note)+'</small></div><a href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">زيارة المصدر ↗</a></div>'}).join('');
 var links=course.community_pages&&course.community_pages.image_links||[];
 return '<div class="eyebrow">REFERENCE LIBRARY / مكتبة مِسار</div><h1 class="page-title">المصادر وملفاتي الخاصة</h1><div class="source-library-summary"><strong>'+(course.personal_documents||[]).length+' كتب ومراجع PDF · '+(course.uploaded_image_index||[]).length+' مراجع بصرية · '+byKind.length+' روابط تعليمية</strong><span>المراجع ليست فارغة الآن: الفهرس، مواضع القراءة، المعاينات التعليمية، وروابط الدروس تظهر مباشرة بدون طلب رفع ملف منك.</span></div><p class="sub">كل مرجع أرسلتيه مربوط بالدروس التي تستخدمه. «فتح الصفحة» يعرض داخل مِسار شرح الموضع والدرس المرتبط به بدل زر لا يعمل. النسخ الكاملة للكتب المحمية لا ننشرها داخل مستودع GitHub العام.</p><div class="hub-metrics"><div><strong>'+files.length+'</strong><small>مرجعًا مفهرسًا</small></div><div><strong>'+mappedCount+'</strong><small>درسًا له قراءة مرتبطة</small></div></div><div class="source-filter-tabs" role="group" aria-label="تصنيف مكتبة المراجع">'+[['all','الكل'],['books','الكتب السبعة'],['images','الصور والملصقات']].map(function(o){return '<button type="button" data-action="hub-source-filter" data-filter="'+o[0]+'" class="source-filter-tab '+(sourceFilter===o[0]?'selected':'')+'" aria-pressed="'+(sourceFilter===o[0])+'">'+o[1]+'</button>'}).join('')+'</div><div class="hub-source-grid">'+cards+'</div><h2 class="hub-section-title">روابط المصادر على الإنترنت</h2><div class="hub-online-list">'+urls+'</div><details class="hub-page-list"><summary>روابط تجميع النزاوي الخارجية · '+links.length+'</summary><p>هذه روابط طرف ثالث وليست صورًا نعيد نشرها داخل الموقع. أسئلة مِسار نفسها صارت تحتوي رسومات تعليمية مستقلة.</p><div>'+links.map(function(it){return '<a href="'+E(it.url)+'" target="_blank" rel="noopener noreferrer">صفحة '+it.page+'</a>'}).join('')+'</div></details>';
}
function paperPage(course){
 var arr=course.review_questions||[];
 return '<div class="eyebrow">PAPER PRACTICE / SELF ASSESSMENT</div><h1 class="page-title">اختبار ورقي تجريبي — '+arr.length+' سؤالًا</h1><p class="sub">ورقة مُعدّة من أسئلة تعليمية أصلية وليست أسئلة الامتحان الرسمي. أضفنا الرسم التعليمي لكل سؤال حتى ما تنفصل الصورة عن التدريب.</p><div class="paper-actions"><a class="btn btn-primary" href="#/practice-quiz">حل تفاعلي على الجوال · تصحيح فوري</a><button class="btn btn-outline paper-print-btn" type="button" data-action="paper-print">طباعة نموذج الأسئلة</button></div><section class="paper-sheet"><header><strong>مسار BMW — ورقة تقييم تدريبية</strong><span>الاسم: ______________ التاريخ: ______________</span><p>حددي إجابة واحدة لكل سؤال؛ استخدمي قلمًا مختلفًا لمراجعة الأخطاء بعد الحل.</p></header>'+arr.map(function(q,i){return '<article class="paper-item"><div class="paper-visual">'+sign(q.visual_key)+'</div><strong>'+(i+1)+'. '+E(q.question)+'</strong><div>'+q.options.map(function(o,n){return '<span>□ '+['أ','ب','ج','د'][n]+' — '+E(o)+'</span>'}).join('')+'</div></article>'}).join('')+'</section><details class="hub-page-list paper-key"><summary>عرض مفتاح الحل بعد إنهاء الورقة</summary><ol>'+arr.map(function(q,i){return '<li><strong>'+(i+1)+' — '+['أ','ب','ج','د'][q.correct_option_index]+'</strong>: '+E(q.explanation)+'</li>'}).join('')+'</ol></details>';
}

function videoTimeLinks(id,note){
 var seen=new Set(),stamps=[],re=/(?:^|[^\d])(\d{1,2}):([0-5]\d)(?!\d)/g,m;
 while((m=re.exec(String(note||'')))&&stamps.length<12){
  var seconds=Number(m[1])*60+Number(m[2]),label=m[1].padStart(2,'0')+':'+m[2];
  if(!seen.has(seconds)){seen.add(seconds);stamps.push({seconds:seconds,label:label})}
 }
 return '<div class="video-time-jumps" aria-label="العودة للحظات الفيديو المحفوظة">'
 +(stamps.length?'<small>ارجعي إلى وقت الملاحظة داخل الفيديو:</small><div class="video-time-list">'
 +stamps.map(function(x){return '<button type="button" data-action="video-seek" data-video-resource="'+E(id)+'" data-seconds="'+x.seconds+'">↪ '+x.label+'</button>'}).join('')+'</div>'
 :'<small>اكتبي في ملاحظتك مثلًا 02:15 لتظهر هنا وصلة إلى نفس اللحظة.</small>')
 +'</div>';
}
function videoNotes(video,state){
 return '<label class="hub-source-note video-learning-notes">ملاحظاتي على هذا الفيديو<textarea data-video-note="'+E(video.id)+'" placeholder="الدقيقة 00:00 — لاحظتِ إيش؟&#10;قاعدة جديدة: ...&#10;سؤالي للمدربة: ...">'+E((state.videoNotes||{})[video.id]||'')+'</textarea><small>احفظي اسم الخطوة ووقتها والسؤال الذي تريدين مراجعته؛ تُحفظ الملاحظة محليًا.</small></label>'+videoTimeLinks(video.id,(state.videoNotes||{})[video.id]||'');
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
 if(action==='hub-open-page'||action==='hub-source-summary'){
  var sid=el.dataset.source,from=Number(el.dataset.page||el.dataset.from)||1,to=Number(el.dataset.pageEnd||el.dataset.to)||from;
  var area=el.closest('.source-chapter,.hub-source,.source-topic-index')?.querySelector('.source-inline-preview');
  if(!area){var card=el.closest('.hub-source');area=card&&card.querySelector('.source-inline-preview')}
  if(!area){ctx.toast('تعذر فتح ملخص الصفحة هنا');return true}
  area.innerHTML=sourceSummaryHTML(c,sid,from,to);
  area.scrollIntoView({behavior:'smooth',block:'nearest'});
  return true;
 }
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
 if(action==='hub-inline-open'||action==='hub-open'){
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

window.MasarHub=Object.freeze({quizPage,practicePage,docsPage,paperPage,lessonReadings,videoNotes,videoTimeLinks,notesPage,refreshFiles,click,upload,sign});
})();