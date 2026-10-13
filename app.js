(() => {
'use strict';
const COURSE=JSON.parse(document.getElementById('course-data').textContent);
const lessons=COURSE.lessons, weeks=COURSE.weeks, questions=COURSE.questions, sourceById=Object.fromEntries(COURSE.sources.map(s=>[s.id,s]));
const baseKey='masar-driving-v1';
let state={done:[],answers:{},notes:{},bookmarks:[],history:[],lastOpened:1,visited:[],readingPositions:{},videoNotes:{},videoWatched:{},sourceNotes:{},reviewAnswers:{},practiceChecks:{},signPractice:{},activityNotes:{},activityChecks:{},reviewHistory:{},mockSession:null,mockHistory:[]};
try { const saved=JSON.parse(localStorage.getItem(baseKey)||'null'); if(saved && typeof saved==='object') state={...state,...saved}; } catch(e){console.warn('Local data unavailable',e)}
let session=null, filterText='', catalogFilter='all', flashFlips=new Set(), visualStages={}, timer={seconds:30*60,active:false}, tickInterval=null, mobileOpen=false;
let savedMirrorPresent=false;try{savedMirrorPresent=localStorage.getItem(baseKey)!==null}catch(e){console.warn('Storage unavailable',e)}
let databaseReady=false, dirtyBeforeReady=false, databaseStatus='جارٍ تجهيز قاعدة البيانات';
let displayedRoute='', scrollWriteTimer=null, restoringScroll=false;
const APP=document.getElementById('app');
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=x=>String(x).padStart(2,'0');
const icon=(name)=>{const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
 layers:'<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
 quiz:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
 cards:'<rect x="3" y="6" width="15" height="15" rx="2"/><path d="M7 3h13a2 2 0 0 1 2 2v12"/>',
 note:'<path d="M16 4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/><path d="m8 12 8-8 3 3-8 8-4 1z"/>',
 link:'<path d="m10 13 4-4"/><path d="M11 6H7a5 5 0 0 0 0 10h3M13 18h4a5 5 0 0 0 0-10h-3"/>',
 setting:'<circle cx="12" cy="12" r="3"/><path d="m19 13.5 2-1.5-2-1.5-.5-2 1-2.3-2.7-1.8-2 1-2-.5L12 2l-1.7 2.9-2 .5-2-1-2.7 1.8 1 2.3-.5 2-2 1.5 2 1.5.5 2-1 2.3 2.7 1.8 2-1 2 .5L12 22l1.7-2.9 2-.5 2 1 2.7-1.8-1-2.3z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 left:'<path d="m9 18 6-6-6-6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 play:'<path d="m8 5 11 7-11 7z"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 reset:'<path d="M3 12a9 9 0 1 0 3-7M3 4v5h5"/>',
 star:'<path d="m12 2 3.1 6.5 7.1 1-5.1 5 1.2 7.1L12 18.2l-6.3 3.4 1.2-7.1-5.1-5 7.1-1z"/>',
 road:'<path d="m8 3-4 18M16 3l4 18M12 3v3m0 4v4m0 4v3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
 trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0zM7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4M12 14v5M8 21h8"/>',
 alert:'<path d="m12 2 10 18H2zM12 9v4m0 4h.01"/>'};return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.book}</svg>`};
const linkTo=(url,label,klass='')=>`<a href="${url}" class="${klass}">${label}</a>`;
const completed=()=>new Set(state.done.filter(n=>Number.isInteger(n)&&n>=1&&n<=48));
const isDone=n=>state.done.includes(n);
const save=()=>{
  try{localStorage.setItem(baseKey,JSON.stringify(state))}catch(e){console.warn('Local mirror unavailable',e)}
  if(databaseReady){window.MasarDB.saveUser(state).catch(e=>{console.warn('IndexedDB write failed',e); databaseStatus='تعذّر الحفظ في قاعدة البيانات';});}
  else dirtyBeforeReady=true;
};
const route=()=>{let v=decodeURI(location.hash.slice(1));return v.startsWith('/')?v:'/home'};
const weekForLesson=n=>Math.ceil(n/3);
const getLesson=n=>lessons[n-1];
const getQuestion=n=>questions[n-1];
const questionReferenceNote=n=>{
 const lessonId='LES-'+String(n).padStart(3,'0');
 const map=(COURSE.lesson_reading_map||[]).find(x=>x.lesson_id===lessonId);
 const ref=map?.resources?.[0];
 if(!ref)return '';
 const page=ref.printed_page_start||ref.pdf_page_start;
 return '<small class="feedback-source">مرجع للمراجعة: '+ESC(ref.source_title||'مرجع الدرس')+(page?' · ص '+page:'')+'<span> · ربط موضوعي للدرس، وليس اعتمادًا رسميًا للسؤال.</span></small>';
};
const questionReferenceByQuestion=q=>questionReferenceNote(Number(String(q?.lesson_id||'').split('-').pop()));
const weeklyDone=w=>lessons.filter(l=>l.week===w&&isDone(l.order)).length;
const progress=()=>Math.round(completed().size/48*100);
const nextLesson=()=>lessons.find(l=>!isDone(l.order))||lessons[47];
const resumeLesson=()=>Number.isInteger(state.lastOpened)&&state.lastOpened>=1&&state.lastOpened<=48&&(state.visited||[]).includes(state.lastOpened)?getLesson(state.lastOpened):null;
const navSections=[
 {title:'ابدئي من هنا',icon:'home',links:[['/home','home','الرئيسية'],['/study-guide','book','كيف أذاكر؟']]},
 {title:'تعلمي النظري',icon:'layers',links:[['/weeks','layers','الخطة الدراسية'],['/traffic-signs','road','إشارات المرور']]},
 {title:'شاهدي وتدرّبي',icon:'road',links:[['/videos','play','مقاطع القيادة'],['/visuals','layers','الرسوم التفاعلية'],['/practice-checklist','cards','المهارات العملية']]},
 {title:'الاختبارات والتطبيق',icon:'quiz',links:[['/quiz','quiz','اختبارات الدروس'],['/practice-quiz','quiz','أسئلة التجميعات'],['/paper-practice','cards','الاختبار الورقي'],['/mock-exam','quiz','محاكاة النظري']]},
 {title:'راجعي وثبّتي',icon:'book',links:[['/review','book','مراجعتي الذكية'],['/cards','cards','بطاقات المراجعة'],['/notes','note','دفتر الملاحظات']]},
 {title:'مكتبتي وإعداداتي',icon:'link',links:[['/sources','link','المصادر والملفات'],['/settings','setting','الإعدادات']]}
];
const navData=navSections.flatMap(section=>section.links);
function sidebar(){
 const path=route();
 const sections=navSections.map(section=>{
  const current=section.links.some(([href])=>path===href||(href==='/weeks'&&(path.startsWith('/week/')||path.startsWith('/lesson/'))));
  return '<details class="sidebar-nav-group"'+(current?' open':'')+'><summary class="sidebar-group-title">'+icon(section.icon)+'<span>'+ESC(section.title)+'</span><span class="nav-section-chevron" aria-hidden="true">⌄</span></summary><div class="sidebar-group-links">'+section.links.map(([href,ic,title])=>'<a href="#'+href+'" class="'+(path===href||(href==='/weeks'&&(path.startsWith('/week/')||path.startsWith('/lesson/')))?'active':'')+'" '+(path===href?'aria-current="page"':'')+'>'+icon(ic)+'<span>'+ESC(title)+'</span>'+(href==='/weeks'?'<span class="tag">16</span>':'')+'</a>').join('')+'</div></details>';
 }).join('');
 return '<aside class="sidebar '+(mobileOpen?'open':'')+'" id="sidebar" aria-label="التنقل الرئيسي"><a href="#/home" class="logo" aria-label="مِسار الرئيسية"><span class="logo-icon">م</span><span><strong>مِسار<span style="color:#d5a1b0">.</span></strong><small>M A S A R &nbsp; / &nbsp; DRIVE</small></span></a><div class="side-label">اختاري القسم، ثم افتحي الدرس أو التدريب</div><nav class="nav sidebar-section-nav" aria-label="أقسام مِسار">'+sections+'</nav><div class="sidebar-bottom"><div class="mini-progress"><div class="mini-progress-top"><div><small>مشوارك إلى الثقة</small><br><strong>'+progress()+'%</strong></div><div style="font-size:30px;color:#9eb5c8">'+icon('road')+'</div></div><div class="line"><i style="width:'+progress()+'%"></i></div><small>'+completed().size+' من 48 درسًا مكتملًا</small></div><div class="foot-note">تعلّم نظري سعودي · نسخة شخصية تجريبية</div></div></aside>';
}
function topbar(title){return `<header class="topbar"><div class="top-actions"><button type="button" class="chip menu-btn" data-action="menu" aria-label="فتح القائمة">${icon('menu')}</button><div class="crumb">لوحة التعلم <span style="padding:0 6px;color:#a8b5bd">/</span> <strong>${ESC(title)}</strong></div></div><div class="top-actions"><span class="chip">${icon('clock')} <span>30–45 دقيقة للجلسة</span></span></div></header>`}
function footerNote(){return `<div class="warning" role="note">${icon('alert')} <strong>ملاحظة تعليمية:</strong> هذا محتوى مذاكرة شخصي أولي، وليس مرجعًا نظاميًا معتمدًا أو بديلًا عن مدرسة قيادة مرخصة. التعليمات المتغيرة تُراجع لدى المرور والمدرسة، وأزرار هوندا حسب سنة وفئة السيارة.</div>`}
function carArt(){return `<div class="hero-art" aria-hidden="true"><div class="hero-road"></div><svg class="hero-car" viewBox="0 0 85 163"><rect x="3" y="5" width="79" height="153" rx="28" fill="#800C1F"/><rect x="10" y="20" width="65" height="123" rx="22" fill="#a51832"/><path d="M16 33Q42 14 69 33L65 67H20Z" fill="#7994a6"/><path d="M18 109L23 91H62L67 109 59 130H25Z" fill="#4e6678"/><path d="M18 75H67M26 136H59" stroke="#e6edf2" stroke-width="3"/><rect x="-1" y="36" width="8" height="24" rx="3" fill="#111b22"/><rect x="78" y="36" width="8" height="24" rx="3" fill="#111b22"/><rect x="-1" y="107" width="8" height="24" rx="3" fill="#111b22"/><rect x="78" y="107" width="8" height="24" rx="3" fill="#111b22"/><path d="M17 9h16M52 9h16" stroke="#fbe8cd" stroke-width="4" stroke-linecap="round"/><path d="M17 152h15M53 152h15" stroke="#ec8893" stroke-width="4" stroke-linecap="round"/></svg><span class="hero-no">16</span></div>`}
function stat(text,value,extra,ic,variant='') {return `<div class="stat stat-${variant} card-premium-interactive"><div class="stat-top"><span class="stat-label">${text}</span><span class="stat-icon">${icon(ic)}</span></div><div class="stat-content"><div class="val" data-count-value="${Number(value)}">${value}</div><div class="stat-caption">${extra}</div></div><span class="stat-decoration" aria-hidden="true"></span></div>`}
const studyDays=[['السبت','درس 01','فهم أساسي'],['الثلاثاء','درس 02','شرح + مثال'],['الخميس','درس 03','تطبيق قصير'],['الجمعة','مراجعة','ثبتي المعلومات']];
function schedule(){return `<div class="schedule">${studyDays.map((x,i)=>`<div class="day ${i===3?'is-review':''}"><small>${x[0]}</small><b>${x[1]}</b><strong>${x[2]}</strong></div>`).join('')}</div><div class="note-preview">جدول مقترح غير نهائي: يمكنك المذاكرة في أي يوم ومن أي درس.</div>`}
function studyStars(){
 const today=new Date(),dates=state.studyStars||{};
 const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-(6-i));const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');return {day:d.toLocaleDateString('ar-SA',{weekday:'short'}),date:key,earned:!!dates[key],today:i===6}});
 return '<section class="card study-stars"><div class="card-top"><div><span class="bento-overline">GENTLE PROGRESS / نجوم الإنجاز</span><h3>كل يوم له نجمته ⭐</h3></div><span class="chip tiny blue">'+days.filter(x=>x.earned).length+' / 7 نجوم</span></div><p>إذا أنهيتِ مذاكرتك اليوم اضغطي نجمة اليوم. ما فيه عقوبة ولا خسارة للنجوم لو ارتحتي يوم.</p><div class="study-star-days">'+days.map(x=>'<div class="study-star-day '+(x.earned?'earned':'')+'"><small>'+ESC(x.day)+'</small><span aria-label="'+(x.earned?'نجمة مكتسبة':'لم تُسجل نجمة')+'">'+(x.earned?'★':'☆')+'</span></div>').join('')+'</div><button class="btn btn-outline" type="button" data-action="study-star">'+(days[6].earned?'إلغاء نجمة اليوم':'⭐ خلصت مذاكرتي اليوم')+'</button></section>';
}
function studyRoute(lesson){
 const video=(COURSE.media_resources||[]).find(x=>x.kind==='youtube_video'&&(x.lesson_ids||[]).includes(lesson.id));
 const illustrated=(COURSE.learning_visuals||[]).some(x=>(x.lesson_ids||[]).includes(lesson.id));
 const q=(COURSE.questions||[]).find(x=>x.lesson_id===lesson.id);
 const note=!!String(state.notes?.[lesson.order]||'').trim(),answered=!!q&&Number.isInteger(state.answers[q.id]);
 const read=!!state.studyRead?.[lesson.id];
 const done=[read,note,answered].filter(Boolean).length;
 const steps=[
  ['01','افهمي الدرس','اقرئي الشرح وتعرّفي على الفكرة','reading',read],
  ['02','شاهدي وتخيّلي',video?'يوتيوب مرتبط بهذا الدرس':illustrated?'رسم تفاعلي للموقف':'لا يوجد فيديو محدد بعد','lesson-videos',false],
  ['03','اكتبي ملخصك','ثلاث نقاط وسؤال تحتاجين جوابه','notes',note],
  ['04','اختبري فهمك','جاوبي السؤال وتعلمي من التفسير','practice',answered]
 ];
 return '<section class="card study-route"><div class="study-route-header"><div><span class="bento-overline">YOUR LEARNING STUDIO / جلسة اليوم</span><h2>ابدئي من هنا، خطوة بخطوة</h2><p>الدرس '+String(lesson.order).padStart(2,'0')+' · <strong>'+ESC(lesson.title)+'</strong></p></div><div class="study-route-progress" aria-label="أُنجز '+done+' من ثلاثة مؤشرات"><strong>'+done+'<small>/3</small></strong><span>فهم · ملاحظات · اختبار</span></div></div><div class="study-today-list">'+steps.map(([number,title,description,target,complete])=>'<a class="study-today-item '+(complete?'is-complete':'')+'" href="#/lesson/'+lesson.order+'"><span class="study-today-number">'+(complete?'✓':number)+'</span><span><strong>'+title+'</strong><small>'+ESC(description)+'</small></span><span class="study-today-arrow">↖</span></a>').join('')+'</div><div class="study-route-actions"><a href="#/lesson/'+lesson.order+'" class="btn btn-primary">افتحي مساحة الدرس ←</a><a href="#/study-guide" class="btn btn-outline">كيف أذاكر؟</a></div></section>';
}
function adaptiveStudyPlan(lesson){
 const now=Date.now(),history=Object.values(state.reviewHistory||{});
 const due=history.filter(x=>!x.lastCorrect||new Date(x.nextDueAt||0).getTime()<=now);
 const wrongLessonQs=questions.filter(q=>Number.isInteger(state.answers[q.id])&&state.answers[q.id]!==q.correct_option_index);
 const signs=COURSE.sign_library||[];
 const signFocus=signs.filter(s=>{const x=state.signPractice?.[s.id]||{};return !((x.meaningCorrect||0)>=1&&(x.actionCorrect||0)>=1)});
 const directVideos=(COURSE.media_resources||[]).filter(x=>x.kind==='youtube_video'&&/^[\w-]{11}$/.test(x.youtube_id||''));
 const unwatched=directVideos.filter(x=>!state.videoWatched?.[x.id]);
 const tasks=[];
 if(due.length){
   tasks.push({tone:'review',time:'8–10 د',title:'راجعي المستحق الآن',desc:due.length+' عنصرًا ظهر وقت مراجعته أو كانت آخر إجابته خطأ.',href:'#/review',cta:'افتحي المراجعة'});
 }else{
   tasks.push({tone:'signs',time:'6–8 د',title:'ثبتي إشارات الطريق',desc:signFocus.length?signFocus.length+' لوحة ما زالت تحتاج معنى + تصرف.':'الإشارات التي تدربتِ عليها وصلت لمرحلة التثبيت.',href:'#/traffic-signs',cta:'تدريب الإشارات'});
 }
 tasks.push({tone:'lesson',time:(lesson.estimated_minutes||15)+' د',title:'كمّلي الدرس '+p2(lesson.order),desc:lesson.title+' — اقرئي، لخّصي، ثم جاوبي بدون الرجوع للنص.',href:'#/lesson/'+lesson.order,cta:'افتحي الدرس'});
 if(wrongLessonQs.length){
   tasks.push({tone:'quiz',time:'5–7 د',title:'صححي خطأ قديم',desc:wrongLessonQs.length+' أسئلة دروس ما زالت آخر إجابة مسجلة فيها غير صحيحة.',href:'#/quiz',cta:'اختبار الأخطاء'});
 }else if(unwatched.length){
   tasks.push({tone:'video',time:'5–8 د',title:'شاهدي ثم اكتبي ملاحظة',desc:'عندك '+unwatched.length+' مقطع مباشر لم تسجلي مشاهدته بعد. اكتبي الدقيقة + الخطوة + السبب.',href:'#/videos',cta:'مقاطع القيادة'});
 }else{
   tasks.push({tone:'cards',time:'5 د',title:'استرجاع سريع بدون قراءة',desc:'اختاري عدة بطاقات وحاولي الإجابة قبل قلبها.',href:'#/cards',cta:'بطاقات التذكّر'});
 }
 const score=due.length+wrongLessonQs.length+(signFocus.length?1:0);
 return '<section class="adaptive-plan card" aria-label="جلسة مذاكرة ذكية مقترحة"><div class="adaptive-plan-head"><div><span class="bento-overline">SMART SESSION / مبنية على نشاطك</span><h2>وش تذاكرين الآن؟</h2><p>رتبتها لك من بيانات إجاباتك ومراجعاتك داخل مِسار، بدل ما تختارين عشوائيًا.</p></div><span class="adaptive-priority '+(score?'has-priority':'clear')+'">'+(score?'فيه نقاط تحتاج مراجعة':'الجلسة مفتوحة للتقدم')+'</span></div><div class="adaptive-task-grid">'+tasks.map((t,i)=>'<a href="'+t.href+'" class="adaptive-task '+t.tone+'"><span class="adaptive-task-no">0'+(i+1)+'</span><div><span class="adaptive-task-time">'+t.time+'</span><strong>'+ESC(t.title)+'</strong><p>'+ESC(t.desc)+'</p><small>'+ESC(t.cta)+' ←</small></div></a>').join('')+'</div><div class="adaptive-plan-foot"><span>الخطة تتغير تلقائيًا مع إجاباتك.</span><a href="#/review">ليش ظهر لي هذا؟ راجعي سجل التكرار ←</a></div></section>';
}
function home(){
 const resume=resumeLesson(), n=resume||nextLesson(), next=nextLesson(), week=n.week, done=completed().size, pct=progress();
 return `<section class="hero hero-premium" aria-labelledby="hero-title">
  <div class="hero-glow" aria-hidden="true"></div>${carArt()}
  <div class="hero-copy"><div class="hero-topline"><span class="hero-kicker"><span class="signal-dot"></span> MASAR / THE DRIVING JOURNEY</span><span class="hero-edition">EDITION 2026 — 01</span></div>
   <div class="eyebrow">رحلتك تبدأ من هنا / START HERE</div><h1 id="hero-title">خلف المقود،<br><span>يبدأ الفهم أولًا.</span></h1>
   <p>مساحتك الخاصة لتعلّم القيادة النظرية خطوة بخطوة؛ من معرفة السيارة إلى قراءة الطريق واتخاذ القرار.</p>${resume?`<p class="resume-location" aria-live="polite">آخر مكان حفظتيه: الدرس ${p2(resume.order)} · ${ESC(resume.title)}</p>`:''}
   <div class="hero-actions"><a class="btn btn-primary" href="#/lesson/${n.order}">${icon('play')} ${resume?'ارجعي لآخر درس':done?'واصلي التعلم':'ابدئي أول درس'}</a>${resume&&next.order!==resume.order?`<a class="btn btn-ghost" href="#/lesson/${next.order}">الدرس التالي غير المكتمل ${icon('arrow')}</a>`:`<a class="btn btn-ghost" href="#/weeks">استكشفي الخطة ${icon('arrow')}</a>`}</div>
  </div><div class="hero-gauge" aria-label="أنجزتِ ${pct} بالمئة من الدروس"><div class="gauge-outline" style="--gauge:${pct}"><div class="gauge-inner"><span>إنجازك</span><strong>${pct}<small>%</small></strong></div></div><span class="gauge-note">${done} / 48 درسًا</span></div><span class="hero-serial" aria-hidden="true">MASAR / 001</span>
 </section>
 <div class="study-command-grid">${studyRoute(n)}${studyStars()}</div>
 ${adaptiveStudyPlan(n)}
 <div class="stats stats-bento">${stat('المنهج','16','أسبوعًا منظمًا','layers','weeks')}${stat('الدروس','48','درسًا نظريًا','book','lessons')}${stat('أكملتي',done,'من أصل 48 درسًا','check','completed')}${stat('الأسئلة','48','تدريبًا بتفسير','quiz','questions')}</div>
 <div class="section-head home-section-head"><div><div class="eyebrow">YOUR CURRENT ROUTE</div><h2>مشوارك الحالي</h2><p>لا تحتاجين تكمّلين كل شيء اليوم؛ خطوة واحدة كفاية.</p></div><a href="#/weeks">كل الأسابيع ${icon('arrow')}</a></div>
 <div class="dashboard-grid bento-stage"><section class="card journey-panel"><div class="card-top"><div><div class="bento-overline">NEXT STOP / المحطة التالية</div><h3>الأسبوع ${p2(week)} <span class="muted-separator">/</span> ${ESC(weeks[week-1]?.title||'المرحلة الحالية')}</h3></div><span class="chip blue tiny">${weeklyDone(week)} / 3 مكتمل</span></div>
 <div class="route-line">${lessons.filter(l=>l.week===week).map((l,i)=>`<a href="#/lesson/${l.order}" class="route-stop ${isDone(l.order)?'complete':''} ${n.order===l.order?'current':''}"><span class="route-indicator"><i>${isDone(l.order)?icon('check'):p2(l.order)}</i></span><span class="route-text"><b>${ESC(l.title)}</b><small>الدرس ${p2(l.order)} · ${l.estimated_minutes} دقيقة تقريبًا</small></span><span class="route-go">${icon('arrow')}</span></a>`).join('')}</div>
 <div class="journey-footer"><a href="#/week/${week}" class="btn btn-muted">تفاصيل الأسبوع</a><a href="#/quiz" class="btn btn-outline">اختبريني ${icon('arrow')}</a></div></section>
 <div class="bento-side"><section class="callout card-premium-interactive"><span class="bento-overline">CAR KNOWLEDGE / 01</span><div class="callout-illustration" aria-hidden="true">${icon('road')}<span class="callout-track"></span></div><h3>افهمي سيارتك<br>قبل أي انطلاقة.</h3><p>مبادئ تخص السيارة عمومًا، دون افتراض أزرار أو أنظمة في أكورد قبل تحديد سنة الموديل.</p><a href="#/lesson/1">استكشفي أدوات السيارة ${icon('arrow')}</a></section>
 <section class="card schedule-card"><div class="card-top"><div><span class="bento-overline">STUDY RHYTHM / 02</span><h3>روتينك المرن</h3></div>${icon('clock')}</div>${schedule()}</section></div></div>
 <div class="section-head"><div><div class="eyebrow">PRACTICE MAKES PROGRESS</div><h2>تعلّمي، ثم اختبري نفسك</h2><p>التطبيق القصير يثبت الفهم أكثر من إعادة القراءة فقط.</p></div></div>
 <div class="action-bento"><a href="#/cards" class="action-tile action-tile-blue"><div class="action-visual">${icon('cards')}</div><span class="bento-overline">RECALL / 01</span><h3>بطاقات التذكّر</h3><p>اقلبي البطاقة واسترجعي الإجابة بنفسك.</p><span class="action-link">راجعي البطاقات ${icon('arrow')}</span></a><a href="#/quiz" class="action-tile action-tile-wine"><div class="action-visual">${icon('quiz')}</div><span class="bento-overline">PRACTICE / 02</span><h3>اختبار المواقف</h3><p>سؤال، قرار، وتفسير يشرح لك السبب.</p><span class="action-link">ابدئي اختبارًا ${icon('arrow')}</span></a></div>${footerNote()}`
}
function weekCard(w){const finished=weeklyDone(w.number),percent=Math.round(finished/3*100);return `<article class="week-card card-premium-interactive ${finished===3?'week-complete':''}" data-week="${w.number}"><div class="week-card-head"><span class="week-number"><i class="week-index">${p2(w.number)}</i> / 16 WEEKS</span><span class="chip tiny ${finished===3?'success':'blue'}">${finished===3?'مكتمل':`${finished} من 3`}</span></div><h3>${ESC(w.title)}</h3><p>3 دروس قصيرة · مراجعة نهاية الأسبوع</p><div class="microbar" role="progressbar" aria-valuenow="${finished}" aria-valuemin="0" aria-valuemax="3" aria-label="تقدم الأسبوع ${w.number}"><span style="width:${percent}%"></span></div><div class="week-list">${w.lesson_ids.map(id=>{const l=lessons.find(x=>x.id===id);return `<a href="#/lesson/${l.order}"><i class="dot ${isDone(l.order)?'done':''}"></i> ${ESC(l.title)}</a>`}).join('')}</div><footer><span class="skeleton">${percent}% من الأسبوع</span><a href="#/week/${w.number}" class="inline-link">افتحي الأسبوع ${icon('arrow')}</a></footer></article>`}
function weeksPage(){return `<div class="eyebrow">THE LEARNING ROADMAP / 16 WEEKS</div><h1 class="page-title">خريطة مشوارك</h1><p class="sub">16 أسبوعًا، كل أسبوع فيه 3 دروس متدرجة. اختاري اللي يناسبك، وتابعي تقدمك بدون ضغط.</p><div class="catalog-toolbar"><label class="search">${icon('search')}<input id="catalog-search" placeholder="ابحثي عن دوار، ركن، إشارات..." aria-label="البحث عن درس أو موضوع" value="${ESC(filterText)}"></label><div class="catalog-filter" role="group" aria-label="تصفية الأسابيع">${[['all','الكل'],['current','قيد الدراسة'],['completed','المكتملة']].map(([id,t])=>`<button type="button" data-action="filter-weeks" data-filter="${id}" class="filter-pill ${catalogFilter===id?'selected':''}" aria-pressed="${catalogFilter===id}">${t}</button>`).join('')}</div></div><div class="catalog-progress-caption"><span>خريطة الإنجاز</span><strong>${completed().size} من 48 درسًا</strong></div><div class="catalog-track"><i style="width:${progress()}%"></i></div><div id="week-catalog">${weeksGrid()}</div>${footerNote()}`}
function weeksGrid(){const q=filterText.trim();const matched=weeks.filter(w=>{const finished=weeklyDone(w.number);const matchFilter=catalogFilter==='all'||(catalogFilter==='completed'?finished===3:finished>0&&finished<3);return matchFilter&&(!q||`${w.number} ${w.title} ${w.lesson_ids.map(id=>lessons.find(x=>x.id===id).title).join(' ')}`.includes(q))});return matched.length?'<div class="learning-phases">'+[
 {title:'01 · التأسيس وفهم السيارة',sub:'المقعد والمرايا، الطريق، الإشارات والأولوية',from:1,to:4},
 {title:'02 · قواعد الطريق واتخاذ القرار',sub:'المسارات والتقاطعات والدوارات والتجاوز',from:5,to:8},
 {title:'03 · السلامة ومهارات المركبة',sub:'السرعة والمخاطر والمواقف والرجوع',from:9,to:12},
 {title:'04 · ظروف القيادة والاستعداد للرخصة',sub:'الطقس والطوارئ والمراجعة والاختبارات',from:13,to:16}
].map(section=>{
 const matchedWeeks=matched.filter(w=>w.number>=section.from&&w.number<=section.to);
 return matchedWeeks.length?'<section class="learning-phase"><div class="phase-heading"><h2>'+section.title+'</h2><p>'+section.sub+'</p></div><div class="week-grid">'+matchedWeeks.map(weekCard).join('')+'</div></section>':'';
}).join('')+'</div>':`<div class="empty"><h3>ما فيه أسابيع هنا حاليًا</h3><p>جربي تغيير الفلتر أو كلمة البحث.</p><button class="btn btn-muted" type="button" data-action="filter-weeks" data-filter="all">عرض كل الأسابيع</button></div>`}
function weekPage(n){const w=weeks[n-1];if(!w)return notFound();return `<div class="crumbs"><a href="#/weeks">الخطة الدراسية</a> / الأسبوع ${n}</div><div class="week-hero"><div><span class="eyebrow" style="color:#bbd0dc">WEEK ${p2(n)}</span><h1>${ESC(w.title)}</h1><p>خطة الأسبوع: السبت والثلاثاء والخميس للدروس، والجمعة للمراجعة. الترتيب مقترح وقابل للتغيير.</p></div><span class="rounded-num" style="background:#405969;color:white;border-color:#547082">${weeklyDone(n)} / 3 مكتمل</span></div><div class="section-head"><div><h2>دروس هذا الأسبوع</h2><p>اضغطي أي درس لبدء القراءة والحل وحفظ التقدم.</p></div></div><div class="card">${lessons.filter(l=>l.week===n).map(l=>`<a href="#/lesson/${l.order}" class="lesson-row ${isDone(l.order)?'done':''}"><span class="lesson-no">${isDone(l.order)?icon('check'):p2(l.order)}</span><span class="lesson-info"><b>${ESC(l.title)}</b><small>الهدف: ${ESC(l.study_content.goal)}</small></span><span class="lesson-arrow">${icon('left')}</span></a>`).join('')}</div><div class="section-head"><div><h2>مراجعة الأسبوع</h2><p>ثلاثة أسئلة قصيرة مخصصة لهذه المجموعة.</p></div></div><section class="callout"><h3>تأكدي إن المعلومات ثبتت</h3><p>راجعي المواقف بدل الحفظ السريع. النتيجة خاصة بالتدريب وليست درجة نجاح رسمية.</p><button type="button" class="btn btn-primary" data-action="start-quiz" data-week="${n}">اختبار الأسبوع ${icon('arrow')}</button></section>${footerNote()}`}
function verificationSourceLabel(url){
 if(/laws\.boe\.gov\.sa/.test(url))return 'نظام المرور — هيئة الخبراء';
 if(/moi\.gov\.sa/.test(url))return 'وزارة الداخلية / المرور';
 if(/absher\.sa/.test(url))return 'أبشر — خدمة إصدار الرخصة';
 if(/srca\.org\.sa/.test(url))return 'هيئة الهلال الأحمر السعودي';
 if(/qu\.edu\.sa/.test(url))return 'مدرسة جامعة القصيم لتعليم القيادة';
 return 'المصدر الداعم';
}
function lessonVerificationChip(l){
 const level=l.verification_level||'pending';
 if(level==='official_current_support')return '<span class="chip tiny success verification-chip" title="تمت مراجعة الادعاء المحدد بمصدر رسمي سعودي حالي">موثق رسميًا في نطاق محدد</span>';
 if(level==='school_primary_support')return '<span class="chip tiny blue verification-chip" title="المعلومة منشورة من مدرسة قيادة سعودية محددة وقد لا تنطبق على جميع المدارس">خاص بمدرسة موثقة</span>';
 if(level==='training_reference_support')return '<span class="chip tiny verification-chip">مدعوم بمرجع تدريبي</span>';
 return '<span class="chip tiny red verification-chip" title="يحتاج تدقيقًا إضافيًا قبل اعتباره محتوى نهائيًا">قيد التدقيق</span>';
}
function lessonVerificationPanel(l){
 const urls=Array.isArray(l.verification_urls)?l.verification_urls:[];
 const links=urls.map((url,i)=>'<a class="verification-source-link" href="'+ESC(url)+'" target="_blank" rel="noopener noreferrer">↗ '+ESC(verificationSourceLabel(url))+'</a>').join('');
 const level=l.verification_level||'pending';
 const heading=level==='official_current_support'?'تم التحقق من هذا الجزء':'حالة التحقق';
 const body=l.verification_scope||l.verification_status||'الدرس ما زال ضمن التدقيق التحريري.';
 const date=l.verification_checked_on?'آخر مراجعة: '+ESC(l.verification_checked_on):'';
 return '<div class="lesson-verification '+ESC(level)+'"><div class="lesson-verification-head">'+lessonVerificationChip(l)+'<small>'+date+'</small></div><strong>'+heading+'</strong><p>'+ESC(body)+'</p>'+(links?'<div class="verification-links">'+links+'</div>':'')+'<small class="verification-caveat">حالة الثقة تخص الادعاء المحدد أعلاه، ولا تعني أن الدرس أو السؤال اختبار رسمي معتمد.</small></div>';
}
function sourcesBlock(l){let arr=(l.source_ids_suggested||[]).map(s=>sourceById[s]).filter(Boolean);return arr.map(s=>`<a href="${ESC(s.url)}" class="source-link" target="_blank" rel="noopener noreferrer">↗ ${ESC(s.name)}</a>`).join('')+`<p style="font-size:10px;margin-top:8px">المراجع للاستزادة والتدقيق، وليست إثباتًا لاعتماد كل عبارة في الملخص.</p>`}
function lessonExtraQuestion(l){
 const q=(COURSE.review_questions||[]).find(x=>x.lesson_id===l.id);
 if(!q)return '';
 const ans=state.reviewAnswers?.[q.id],answered=Number.isInteger(ans),correct=answered&&ans===q.correct_option_index;
 const sourceName=q.source_id==='EXT-MOI-SIGNS'?'المرور السعودي':q.source_id==='DOC-TRAINEE'?'كتاب المتدربة':q.source_id==='DOC-DARB'?'درب السلامة':q.source_id==='DOC-NAZAWI'?'تجميع النزاوي':q.source_id==='DOC-NARIMAN'?'ملخص التقييم':q.source_id==='DOC-SHARD'?'مدرسة شرق':q.source_id==='DOC-JEDDAH'?'منهج جدة':q.source_id?.startsWith('IMG-')?'مرجع بصري مرفوع':'بنك المراجعة';
 return '<section class="qbox lesson-extra-question" id="practice-extra"><div class="eyebrow">04 / تثبيت إضافي</div><div class="flexline"><h2>سؤال مراجعة ثاني</h2><span class="chip tiny">'+ESC(sourceName)+'</span></div><p>'+ESC(q.question)+'</p><div class="options">'+q.options.map((opt,i)=>'<button type="button" class="option '+(answered?(i===q.correct_option_index?'correct':i===ans?'wrong':''):'')+'" data-action="hub-answer" data-qid="'+ESC(q.id)+'" data-answer="'+i+'" '+(answered?'disabled':'')+'><span class="bullet">'+p2(i+1)+'</span>'+ESC(opt)+'</button>').join('')+'</div>'+(answered?'<div class="feedback '+(correct?'':'wrong')+'"><strong>'+(correct?'صح ✓':'راجعيها مرة ثانية')+'</strong><span class="feedback-reason">'+ESC(q.explanation||'راجعي قاعدة الدرس ثم أعيدي السؤال من مركز التجميعات.')+'</span><small class="feedback-source">مصدر الفكرة: '+ESC(sourceName)+(q.source_pdf_page?' · PDF ص '+ESC(q.source_pdf_page):'')+' · هذا سؤال تدريبي غير رسمي.</small></div>':'<p class="lesson-extra-hint">جاوبي بدون الرجوع للشرح؛ الهدف نتأكد إن الفكرة ثبتت بشكل مختلف.</p>')+'</section>';
}
function videoCard(m){
 const first=lessons.find(l=>(m.lesson_ids||[]).includes(l.id));
 const watched=!!state.videoWatched?.[m.id];
 return '<article class="study-video video-gallery-item '+(watched?'is-watched':'')+'"><div class="video-title"><span class="bento-overline">مقطع مباشر من مصدر تعليمي</span><strong>'+ESC(m.title)+'</strong><span class="video-watch-status '+(watched?'done':'')+'">'+(watched?'تمت المشاهدة ✓':'لم يُسجل كمشاهَد')+'</span></div>'
 +'<div class="video-player"><button type="button" class="video-load" data-action="video-load" data-video="'+ESC(m.youtube_id)+'" data-title="'+ESC(m.title)+'" aria-label="تشغيل '+ESC(m.title)+'"><span class="video-play-symbol">▶</span><span>تشغيل داخل مِسار</span></button></div>'
 +'<div class="video-learning-actions"><button type="button" class="btn '+(watched?'btn-muted':'btn-outline')+'" data-action="video-watched" data-video-resource="'+ESC(m.id)+'">'+(watched?'✓ شاهدته · إلغاء':'علّميه كمشاهَد')+'</button>'+(first?'<a class="btn btn-outline" href="#/lesson/'+first.order+'">الدرس المرتبط ←</a>':'')+'</div>'
 +'<p class="video-footnote">المشاهدة داخل الصفحة إذا سمحت إعدادات صاحب الفيديو بالتضمين. علامة «شاهدته» للتنظيم الشخصي فقط ولا تعني إتقان المهارة.</p>'
 +window.MasarHub.videoNotes(m,state)+'</article>';
}
function collectionCard(m){
 return '<details class="video-collection-card"><summary><strong>'+ESC(m.title)+'</strong><small>مكتبة من '+ESC(m.provider)+' · تضمين الصفحة حسب سماح الناشر</small></summary>'
 +'<div class="video-collection-body"><p>هذه مكتبة مصادر، وليست رابط فيديو مباشر. إذا منع الموقع الأصلي تضمين صفحته، لن نستطيع تشغيلها هنا من دون رابط مصرح به.</p>'
 +'<button type="button" class="btn btn-outline" data-action="video-collection-load" data-collection="'+ESC(m.id)+'">محاولة عرض المكتبة هنا</button>'
 +'<div class="video-collection-preview" aria-live="polite"></div></div></details>';
}
function mediaBlock(l){
 const items=(COURSE.media_resources||[]).filter(m=>(m.lesson_ids||[]).includes(l.id));
 const clips=items.filter(m=>m.kind==='youtube_video'&&/^[\w-]{11}$/.test(m.youtube_id||''));
 const extra=items.filter(m=>m.kind!=='youtube_video');
 const fallback='<div class="video-resource-gap"><strong>ما فيه فيديو مباشر مؤكد لهذا الدرس بعد</strong><p>المحتوى المكتوب والتمرين التفاعلي موجودان هنا. نضيف مقاطع فقط بعد التأكد من عنوانها وناشرها ورابط تشغيلها.</p><a class="btn btn-outline" href="#/videos">مكتبة المقاطع داخل مِسار</a></div>';
 return '<section class="media-aside on-site-media"><div class="section-head"><div><h2>المقاطع المرتبطة بالدرس</h2><p>شاهدي المقطع واكتبي ملاحظاتك هنا دون فتح صفحة أخرى.</p></div><a href="#/videos" class="inline-link">مكتبة الفيديو كاملة ←</a></div>'
 +(clips.length?'<div class="lesson-video-grid">'+clips.map(videoCard).join('')+'</div>':fallback)
 +(extra.length?'<details class="video-source-collections"><summary>مكتبات فيديو إضافية مرتبطة بهذا الدرس ('+extra.length+')</summary>'+extra.map(collectionCard).join('')+'</details>':'')+'</section>';
}
function videoGalleryPage(){
 const list=(COURSE.media_resources||[]),videos=list.filter(x=>x.kind==='youtube_video'&&/^[\w-]{11}$/.test(x.youtube_id||'')),collections=list.filter(x=>x.kind!=='youtube_video'),watched=videos.filter(x=>state.videoWatched?.[x.id]).length;
 const skills=[['X','الرجوع إلى الخلف في موقف'],['90','الصف الأمامي والخلفي بين سيارتين'],['T','الانعطاف لليسار والرجوع للخلف'],['الكراج','دخول الموقف'],['Y','الانعطاف ثلاثي النقاط'],['المخاطر','القيادة الوقائية'],['أخرى','ثلاثة فيديوهات مدرسية بعناوين عامة']];
 return '<div class="eyebrow">VIDEO STUDIO / مِسار</div><h1 class="page-title">مقاطع تعليم القيادة</h1>'
 +'<p class="sub">هنا نجمع مشغلات الفيديو وملاحظاتك في مكان واحد. ثلاثة مقاطع مرتبطة بروابط YouTube مباشرة، وتعرض مدرسة جامعة القصيم تسعة عناوين في مكتبتها؛ لا نعدّ الفيديوهات الأخرى قابلة للتشغيل داخل مِسار حتى نعثر على روابطها المباشرة المصرّح بتضمينها.</p>'
 +'<div class="video-hub-summary"><div><strong>'+videos.length+'</strong><span>مقاطع مباشرة</span></div><div><strong>'+watched+' / '+videos.length+'</strong><span>سجلتِ مشاهدتها</span></div><div><strong>'+collections.length+'</strong><span>مكتبات تعليمية</span></div><div><strong>9</strong><span>عناوين في مكتبة القصيم (ليست كلها مستخرجة)</span></div></div>'
 +'<div class="section-head"><div><h2>المقاطع القابلة للتشغيل داخل الصفحة</h2><p>اضغطي زر التشغيل داخل البطاقة؛ احفظي ملاحظة مرتبطة بالمقطع تحتها.</p></div></div>'
 +'<div class="video-gallery-grid">'+videos.map(videoCard).join('')+'</div>'
 +'<div class="section-head"><div><h2>فهرس فيديوهات مدرسة جامعة القصيم</h2><p>تصنيف كامل للعناوين المذكورة في مكتبة المدرسة، وليس ادعاء بوجود رابط صالح لكل واحد.</p></div></div>'
 +'<div class="video-topics-index">'+skills.map((x,i)=>'<div class="video-topic-pill"><strong>'+ESC(x[0])+'</strong><span>'+ESC(x[1])+'</span><small>'+(i===0||i===3||i===4?'يوجد مثال مباشر أعلاه':'بانتظار رابط فيديو مباشر موثوق')+'</small></div>').join('')+'</div>'
 +'<div class="section-head"><div><h2>مكتبات أخرى داخل الصفحة</h2><p>نحاول عرض موقع المصدر داخل مساحة مِسار عندما يسمح صاحبه بتضمينه.</p></div></div>'
 +'<div class="video-gallery-collections">'+collections.map(collectionCard).join('')+'</div>'
 +'<p class="warning">إذا رفض YouTube أو موقع المدرسة التضمين فلن يعمل المشغل، وهذا قيد من الناشر وليس من تنقل الموقع. لا نعرض تشغيلًا وهميًا ولا نرفع نسخة من مقطع لا نملك حقوقها.</p>'+footerNote();
}
function visualBlock(l){
 const items=(COURSE.learning_visuals||[]).filter(v=>(v.lesson_ids||[]).includes(l.id));
 if(!items.length)return '';
 return '<div id="visual-learning">'+items.map(v=>{
   const k=Math.min((v.steps||[]).length-1,Math.max(0,Number(visualStages[v.id])||0));
   const stage=v.steps[k];
   const diagram=window.MasarVisuals?window.MasarVisuals.render(v,k):'<p>تعذر تحميل الرسم، يمكنك قراءة الشرح النصي.</p>';
   return '<section class="visual-card" aria-label="شرح بصري تفاعلي"><div class="visual-header"><span class="bento-overline">VISUAL LEARNING / تعلّم بالموقف</span><h2>'+ESC(v.title)+'</h2><p>بدّلي بين المراحل وشوفي ما الذي يتغير في الطريق.</p></div><div class="visual-scene">'+diagram+'</div><div class="visual-steps" role="group" aria-label="مراحل '+ESC(v.title)+'">'+v.steps.map((x,i)=>'<button type="button" class="visual-step '+(k===i?'is-current':'')+'" data-action="visual-step" data-visual="'+ESC(v.id)+'" data-step="'+i+'" aria-pressed="'+(k===i?'true':'false')+'"><span>'+(i+1)+'</span>'+ESC(x.label)+'</button>').join('')+'</div><div class="visual-caption"><strong>المرحلة '+(k+1)+' من '+v.steps.length+': '+ESC(stage.label)+'</strong><p>'+ESC(stage.body)+'</p></div><p class="visual-disclaimer">رسم مفاهيمي مبسّط وغير متناسب مع أبعاد الطريق الفعلية. ليس محاكاة للقيادة أو تعليمات لتنفيذ المناورة في سيارة حقيقية.</p></section>';
 }).join('')+'</div>';
}

function lessonJourney(l,q){
 const read=!!state.studyRead?.[l.id],note=!!String(state.notes?.[l.order]||'').trim(),answered=Number.isInteger(state.answers[q.id]);
 const visual=(COURSE.learning_visuals||[]).some(x=>(x.lesson_ids||[]).includes(l.id));
 const video=(COURSE.media_resources||[]).some(x=>x.kind==='youtube_video'&&(x.lesson_ids||[]).includes(l.id));
 const mediaAvailable=visual||video;
 const watchedVideo=video&&(COURSE.media_resources||[]).filter(x=>x.kind==='youtube_video'&&(x.lesson_ids||[]).includes(l.id)).some(x=>state.videoWatched?.[x.id]);
 const seen=!!state.studySeen?.[l.id]||!!watchedVideo;
 const count=[read,mediaAvailable?seen:false,note,answered].filter(Boolean).length;
 const total=mediaAvailable?4:3;
 const progress=Math.round(count/total*100);
 const steps=[
  {num:'01',title:'اقرئي',desc:'الفكرة والنقاط',target:'reading',done:read},
  {num:'02',title:'شاهدي',desc:video?'فيديو تعليمي':visual?'رسم تفاعلي':'مقطع موثوق غير متوفر',target:'lesson-videos',done:mediaAvailable&&seen,unavailable:!mediaAvailable},
  {num:'03',title:'لخّصي',desc:'ملاحظاتك الخاصة',target:'notes',done:note},
  {num:'04',title:'اختبري',desc:'السؤال والتفسير',target:'practice',done:answered}
 ];
 return '<section class="lesson-journey" aria-label="خطوات المذاكرة"><div class="lesson-journey-head"><div><span class="bento-overline">FOCUS MODE / خطوة بخطوة</span><h2>مسار المذاكرة لهذا الدرس</h2><p>ابدئي بالشرح، ثم التدريب، واختبري فهمك. لا يلزم إكمالها كلها في جلسة واحدة.</p></div><div class="lesson-journey-score"><strong>'+count+' / '+total+'</strong><small>خطوات متابعة</small></div></div><div class="lesson-journey-track" role="progressbar" aria-label="متابعة الدرس" aria-valuenow="'+count+'" aria-valuemin="0" aria-valuemax="'+total+'"><span style="width:'+progress+'%"></span></div><div class="lesson-journey-steps">'+steps.map(x=>'<button type="button" class="lesson-journey-step '+(x.done?'done ':'')+(x.unavailable?'unavailable':'')+'" data-action="scroll" data-target="'+x.target+'"><span class="lesson-journey-stepnum">'+(x.done?'✓':x.num)+'</span><span><strong>'+x.title+'</strong><small>'+x.desc+'</small></span></button>').join('')+'</div><div class="lesson-journey-actions"><button type="button" class="btn '+(read?'btn-muted':'btn-primary')+'" data-action="study-read" data-lesson="'+ESC(l.id)+'">'+(read?'✓ تم تسجيل قراءة الدرس · إلغاء':'✓ قرأت الشرح وفهمت فكرته')+'</button>'+(mediaAvailable?'<button type="button" class="btn '+(seen?'btn-muted':'btn-outline')+'" data-action="study-seen" data-lesson="'+ESC(l.id)+'">'+(seen?'✓ اطلعت على الشرح المرئي · إلغاء':'اطلعت على الرسم أو المقطع')+'</button>':'<span class="lesson-video-gap">الفيديو غير متوفر لهذا الدرس حاليًا؛ لا يُحسب ضمن التقدم.</span>')+'</div></section>';
}
function lessonPage(n){const l=getLesson(n);if(!l)return notFound();const changed=state.lastOpened!==n||!(state.visited||[]).includes(n);state.lastOpened=n;state.visited=state.visited||[];if(!state.visited.includes(n))state.visited.push(n);if(changed&&(savedMirrorPresent||databaseReady||dirtyBeforeReady))save();let c=l.study_content,q=getQuestion(n),ans=state.answers[q.id],answered=Number.isInteger(ans),correct=ans===q.correct_option_index;return `<div class="crumbs"><a href="#/weeks">الخطة</a> / <a href="#/week/${l.week}">الأسبوع ${l.week}</a> / الدرس ${p2(n)}</div><div class="lesson-layout"><div class="lesson-main">${lessonJourney(l,q)}<section class="lesson-hero"><div class="flexline"><span class="chip tiny dark">LESSON ${p2(n)} / 48</span><span class="chip tiny">${l.estimated_minutes} دقيقة مقترحة</span>${lessonVerificationChip(l)}</div><h1>${ESC(l.title)}</h1><p>${ESC(c.goal)}</p></section>${[7,8,9,43].includes(n)?'<a class="btn btn-outline" style="margin:12px 0" href="#/traffic-signs">افتحي مكتبة إشارات المرور المصورة ←</a>':''}<section class="lesson-body" id="reading"><div class="eyebrow">01 / الفكرة الأساسية</div><h2>نفهمها أولًا</h2><p>${ESC(c.introduction)}</p><div class="eyebrow" style="margin-top:24px">02 / معلومات تثبّتينها</div>${c.key_points.map((t,i)=>`<div class="point"><i>${i+1}</i><span>${ESC(t)}</span></div>`).join('')}</section>${window.MasarGuides.render(l)}${window.MasarHub.lessonReadings(COURSE,l)}${visualBlock(l)}<div id="lesson-videos">${mediaBlock(l)}</div><section class="lesson-quick-recap"><h2>ملخص الدرس في دقيقة</h2><p>${ESC(c.recap||c.goal)}</p><p class="sub">اسألي نفسك: وش القاعدة؟ متى أطبقها؟ وش الخطأ اللي لازم أتجنبه؟ اكتبي الإجابة في ملاحظاتك تحت.</p></section>${window.MasarCoach.activityBlock(COURSE,l,state)}<section class="scenario" id="scenario"><div class="tag-s">DRIVE THINKING · تمرين تفكير</div><h2>تخيّلي الموقف</h2><p>${ESC(c.scenario)}</p></section><section class="qbox" id="practice"><div class="eyebrow">03 / اختبري الفهم</div><h2>قرار واحد صحيح</h2><p>${ESC(q.question)}</p><div class="options">${q.options.map((opt,i)=>`<button type="button" class="option ${answered?(i===q.correct_option_index?'correct':i===ans?'wrong':''):''}" data-action="lesson-answer" data-id="${n}" data-choice="${i}" ${answered?'disabled':''}><span class="bullet">${p2(i+1)}</span>${ESC(opt)}</button>`).join('')}</div>${answered?`<div class="feedback ${correct?'':'wrong'}"><strong>${correct?'إجابة صحيحة!':'خلينا نفهم السبب:'}</strong><span class="feedback-reason">${ESC(q.rationale)}</span>${questionReferenceNote(n)}</div>`:''}<div class="lesson-footer"><button type="button" class="btn ${isDone(n)?'btn-muted':'btn-primary'}" data-action="mark" data-id="${n}">${icon('check')} ${isDone(n)?'تم إكمال الدرس · إلغاء العلامة':'أكملت هذا الدرس'}</button><button type="button" class="btn btn-outline" data-action="bookmark" data-id="${n}">${icon('star')} ${state.bookmarks.includes(n)?'إزالة الحفظ':'حفظ للمراجعة'}</button></div></section>${lessonExtraQuestion(l)}<section class="lesson-body note-box" id="notes"><div class="eyebrow">04 / دفتر ملاحظاتي</div><h2>اكتبيها بطريقتك</h2><p>ملاحظاتك تُحفظ محليًا على نفس المتصفح، ويمكنك تصديرها من الإعدادات.</p><textarea data-note="${n}" placeholder="وش أهم شيء فهمتيه؟ أو وش تبغين تراجعينه؟">${ESC(state.notes[n]||'')}</textarea></section><div class="lesson-footer" style="margin-top:20px"><a href="#/lesson/${Math.max(1,n-1)}" class="btn btn-outline" ${n===1?'aria-disabled="true"':''}>← الدرس السابق</a><a href="${n===48?'#/weeks':`#/lesson/${n+1}`}" class="btn btn-primary">${n===48?'العودة للخطة':'الدرس التالي'} ${icon('left')}</a></div></div><aside class="lesson-aside"><section class="aside-card"><h3>في هذا الدرس</h3><button type="button" class="toc-item" data-action="scroll" data-target="reading">الفكرة الأساسية</button><button type="button" class="toc-item" data-action="scroll" data-target="lesson-deep-dive">الشرح خطوة بخطوة</button><button type="button" class="toc-item" data-action="scroll" data-target="source-reading">مراجع وصفحات الدرس</button><button type="button" class="toc-item" data-action="scroll" data-target="coach-activity">تطبيق عملي للفهم</button>${(COURSE.learning_visuals||[]).some(v=>(v.lesson_ids||[]).includes(l.id))?'<button type="button" class="toc-item" data-action="scroll" data-target="visual-learning">الشرح المرئي</button>':''}<button type="button" class="toc-item" data-action="scroll" data-target="scenario">الموقف التطبيقي</button><button type="button" class="toc-item" data-action="scroll" data-target="practice">سؤال الفهم</button>${(COURSE.review_questions||[]).some(x=>x.lesson_id===l.id)?'<button type="button" class="toc-item" data-action="scroll" data-target="practice-extra">سؤال مراجعة إضافي</button>':''}<button type="button" class="toc-item" data-action="scroll" data-target="notes">ملاحظاتي</button><div class="microbar"><span style="width:${isDone(n)?100:0}%"></span></div><span style="font-size:11px;color:var(--muted)">${isDone(n)?'أحسنتِ، الدرس مكتمل':'حددي إكمال الدرس بعد الانتهاء'}</span></section><section class="aside-card"><h3>المصادر والمرجع</h3>${sourcesBlock(l)}</section><section class="aside-card"><h3>حالة المحتوى والثقة</h3>${lessonVerificationPanel(l)}</section></aside></div>`}
function flashcardsPage(){
 const cards=[
 ['قف','يجب التوقف التام ثم العبور عندما يسمح التنظيم وتتوفر السلامة.','SG-01'],
 ['أعطِ الأفضلية','خففي السرعة وأفسحي المجال لمن له الأفضلية، وتوقفي عند الحاجة.','SG-02'],
 ['النقطة العمياء','منطقة قد لا تظهر بالكامل في المرايا، وتحتاج تحققًا مباشرًا آمنًا.','VIS-LANES'],
 ['مسافة التوقف','مسافة رد الفعل + مسافة الفرملة.','VIS-FOLLOW'],
 ['الدوار','في الدوار المعتاد، الأولوية للمركبات التي تسير داخله.','VIS-ROUNDABOUT'],
 ['النور العالي','يستخدم عندما تسمح الظروف دون إبهار المركبات الأخرى.','LIGHT'],
 ['الخط المتقطع','قد يسمح بعبوره إذا كانت المناورة مسموحة وآمنة.','VIS-MARKINGS'],
 ['الركن P','وضع ناقل الحركة للركن، وليس مرادفًا لفرامل التوقف.','PARK'],
 ['Brake Hold','مساعدة على تثبيت الفرامل وقت التوقف المؤقت، لا بدلًا عن تأمين ركن السيارة.','HOLD'],
 ['القيادة الوقائية','ألاحظ ← أتوقع ← أقرر ← أتصرف.','DEFENSIVE'],
 ['إشارة خضراء','تسمح بالحركة ضمن التنظيم دون إغلاق تقاطع مزدحم.','GREEN'],
 ['الرخصة','حجز أبشر ليس إصدارًا تلقائيًا للرخصة؛ هناك متطلبات وفحوص واختبارات.','LICENSE']
 ];
 const pictograms={
 LIGHT:'<svg viewBox="0 0 160 110" role="img" aria-label="سيارة بأضواء أمامية" xmlns="http://www.w3.org/2000/svg"><path d="M30 69h81l-10-29H47Z" fill="#7794a8" stroke="#334e60" stroke-width="3"/><path d="M23 69h96v21H23Z" fill="#395269"/><circle cx="46" cy="90" r="10" fill="#223646"/><circle cx="98" cy="90" r="10" fill="#223646"/><path d="M120 51l29-14M121 65l33-2M121 79l29 12" stroke="#d7ac48" stroke-width="5" stroke-linecap="round"/></svg>',
 PARK:'<svg viewBox="0 0 160 110" role="img" aria-label="مؤشر ناقل الحركة على P" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="10" width="64" height="92" rx="17" fill="#344e62"/><rect x="59" y="20" width="42" height="25" rx="8" fill="#fff"/><text x="80" y="39" fill="#263b50" font-size="23" font-weight="bold" text-anchor="middle">P</text><text x="80" y="65" fill="#b8c9d5" font-size="14" text-anchor="middle">R</text><text x="80" y="82" fill="#b8c9d5" font-size="14" text-anchor="middle">N</text><text x="80" y="99" fill="#b8c9d5" font-size="14" text-anchor="middle">D</text></svg>',
 HOLD:'<svg viewBox="0 0 160 110" role="img" aria-label="رمز تعليمي لـ Brake Hold" xmlns="http://www.w3.org/2000/svg"><circle cx="80" cy="55" r="39" fill="#e6eef3" stroke="#5c788b" stroke-width="4"/><text x="80" y="50" font-size="21" font-weight="bold" fill="#263b50" text-anchor="middle">HOLD</text><text x="80" y="71" font-size="12" fill="#557185" text-anchor="middle">BRAKE</text></svg>',
 DEFENSIVE:'<svg viewBox="0 0 160 110" role="img" aria-label="عين للملاحظة وأسهم لاتخاذ القرار" xmlns="http://www.w3.org/2000/svg"><path d="M23 48Q80-10 137 48Q80 100 23 48Z" fill="#e3edf3" stroke="#496778" stroke-width="4"/><circle cx="80" cy="48" r="19" fill="#799bb0"/><circle cx="80" cy="48" r="9" fill="#30495b"/><path d="M45 94h70l-9-8m9 8-9 8" fill="none" stroke="#ae6675" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 GREEN:'<svg viewBox="0 0 160 110" role="img" aria-label="إشارة مرورية خضراء" xmlns="http://www.w3.org/2000/svg"><rect x="61" y="3" width="38" height="102" rx="10" fill="#334657"/><circle cx="80" cy="23" r="12" fill="#81676d"/><circle cx="80" cy="54" r="12" fill="#958464"/><circle cx="80" cy="84" r="12" fill="#3bb785"/></svg>',
 LICENSE:'<svg viewBox="0 0 160 110" role="img" aria-label="بطاقة رخصة قيادة تعليمية" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="130" height="74" rx="10" fill="#f8fbfd" stroke="#57768a" stroke-width="4"/><rect x="26" y="35" width="37" height="42" rx="6" fill="#b7cbd7"/><circle cx="44" cy="49" r="9" fill="#6d91a4"/><path d="M30 70q14-18 28 0" fill="#6d91a4"/><path d="M75 42h55M75 55h44M75 68h37" stroke="#678797" stroke-width="5" stroke-linecap="round"/></svg>'
 };
 function art(ref){
  const sign=(COURSE.sign_library||[]).find(x=>x.id===ref);
  if(sign&&window.MasarSigns)return window.MasarSigns.draw(sign);
  const visual=(COURSE.learning_visuals||[]).find(x=>x.id===ref);
  if(visual&&window.MasarVisuals)return window.MasarVisuals.render(visual,0);
  return pictograms[ref]||'';
 }
 return `<div class="eyebrow">ACTIVE RECALL</div><h1 class="page-title">بطاقات تثبيت المعلومات</h1><p class="sub">12 بطاقة فيها رسومات تعليمية تساعدك تتذكرين المعنى. شوفي الصورة، وحاولي تجاوبين قبل ما تقلبين البطاقة. الرسومات التوضيحية ليست بديلًا عن الصور واللوحات الرسمية.</p><div class="flashcards">${cards.map(([title,answer,ref],i)=>`<button type="button" class="flashcard ${flashFlips.has(i)?'flipped':''}" data-action="flip" data-id="${i}" aria-label="قلب بطاقة ${ESC(title)}" aria-pressed="${flashFlips.has(i)?'true':'false'}"><span class="fc-visual" aria-hidden="true">${art(ref)}</span><span class="fc-title">${ESC(flashFlips.has(i)?answer:title)}</span><span class="fc-hint">${flashFlips.has(i)?'اضغطي للعودة للسؤال':'اضغطي لإظهار الإجابة'} ${icon('reset')}</span></button>`).join('')}</div>${footerNote()}`
}
function visualLibraryPage(){
 const scenarios=COURSE.learning_visuals||[];
 return '<div class="eyebrow">VISUAL LEARNING LIBRARY</div><h1 class="page-title">المكتبة المرئية</h1><p class="sub">رسومات أصلية تتبدل مراحلها داخل الدروس، مع روابط مصادر الفيديو الخارجية التي تمكنّا من تحديدها. الرسومات للفهم النظري وليست تدريب قيادة عمليًا.</p><div class="catalog-progress-caption"><span>رسومات تفاعلية</span><strong>'+scenarios.length+' مواضيع · '+new Set(scenarios.flatMap(v=>v.lesson_ids)).size+' دروس مرتبطة</strong></div><div class="visual-index-grid">'+scenarios.map(v=>{const first=lessons.find(l=>l.id===v.lesson_ids[0]);return '<article class="visual-index-tile"><div class="visual-index-media">'+(window.MasarVisuals?window.MasarVisuals.render(v,0):'')+'</div><div class="visual-index-text"><span class="bento-overline">موقف تفاعلي · '+v.steps.length+' مراحل</span><h2>'+ESC(v.title)+'</h2><p>'+ESC(v.steps[0].body)+'</p><a class="inline-link" href="#/lesson/'+first.order+'">افتحي التدريب في الدرس '+p2(first.order)+' '+icon('arrow')+'</a></div></article>'}).join('')+'</div><div class="section-head"><div><h2>مقاطع الفيديو في مِسار</h2><p>المقاطع والمكتبات لها مساحة خاصة دون مغادرة الموقع.</p></div><a href="#/videos" class="inline-link">افتحي المقاطع ←</a></div>'+footerNote();
}
function studyGuidePage(){
return '<div class="eyebrow">HOW TO STUDY / STUDY GUIDE</div><h1 class="page-title">كيف أذاكر وأفهم السواقة؟</h1><p class="sub">ما تحتاجين تحفظين الصور فقط. المطلوب تفهمين: وش العلامة؟ وش الخطر؟ وش القرار الصحيح؟ وكيف تتذكرين القاعدة إذا تغير شكل السؤال؟</p>'+
'<div class="hub-guide-steps">'+
'<section class="card hub-guide-step"><span>01 / إشارات الطريق</span><h2>احفظي المعنى والتصرف، مو الاسم فقط</h2><p>ابدئي بالشكل واللون: مثلث تحذيري، دائرة تنظيمية، لوحة إرشادية. اسألي نفسك: هل تُحذّر أم تمنع أم تُلزم؟ وبعدها: ماذا أفعل إذا شاهدتها؟</p><p><strong>مثال:</strong> المثلث الذي بداخله رسم إشارة ضوئية يحذّرك من إشارة قادمة؛ ليس ضوءًا أحمر فعليًا يأمرك بالتوقف فور رؤية المثلث.</p><a href="#/practice-quiz" class="btn btn-outline">اختبري إشارات الطريق</a></section>'+
'<section class="card hub-guide-step"><span>02 / مشاهدة الفيديو</span><h2>شوفي المقطع مرتين، واكتبي الدقيقة</h2><p>الأولى لفهم الموقف كاملًا؛ في الثانية أوقفي الفيديو عند الخطوة غير الواضحة، ثم اكتبي في ملاحظات الفيديو: الزمن، ماذا فعلت المدربة، لماذا فعلته، وما السؤال الذي ستسألينه.</p><div class="hub-note-example"><strong>مثال لملاحظة</strong><p>01:20 — فحص المرآة والنقطة العمياء قبل الحركة.<br/>أفهم لماذا، لكن أبي أسأل المدربة متى أعيد الفحص؟</p></div><a href="#/visuals" class="btn btn-outline">افتحي المقاطع والرسومات</a></section>'+
'<section class="card hub-guide-step"><span>03 / السؤال الورقي</span><h2>اقرئي السؤال أولًا ثم الخيارات</h2><p>ضعي خطًا تحت كلمات مثل: «ليس»، «ممنوع»، «الأولوية»، «العبارة الخاطئة». استبعدي الخيارات غير المنطقية، ثم اختاري جوابًا واحدًا، واكتبي سبب اختيارك بكلماتك.</p><p>إذا أخطأتِ، لا تعيدي حفظ الخيار (ب)؛ اكتبي القاعدة الصحيحة حتى لو غيّروا ترتيب الإجابات.</p><a href="#/paper-practice" class="btn btn-outline">نموذج قابل للطباعة</a></section>'+
'<section class="card hub-guide-step"><span>04 / مهارات القيادة</span><h2>افصلي النظري عن التطبيق</h2><p>راجعي خطوات الملاحظة والإشارة وفحص المنطقة المحجوبة نظريًا، لكن لا تعتبرين علامة «تم» دليل إتقان قيادة حقيقية. نقاط اللف والركن تتغير حسب أبعاد السيارة والتدريب.</p><a href="#/practice-checklist" class="btn btn-outline">قائمة المهارات العملية</a></section>'+
'</div><section class="hub-week-plan"><h2>جلسة مذاكرة مقترحة: 35 دقيقة</h2><div class="hub-time-row"><span>5 د</span> استرجاع ما تعلمتيه أمس دون فتح الدرس</div><div class="hub-time-row"><span>12 د</span> قراءة الدرس ورسم/لوحة مرتبطة به</div><div class="hub-time-row"><span>8 د</span> فيديو أو موقف عملي مع كتابة ملاحظة</div><div class="hub-time-row"><span>7 د</span> حل أسئلة متنوعة وفهم التفسير</div><div class="hub-time-row"><span>3 د</span> تسجيل خطأ واحد للعودة له يوم الجمعة</div><p>السبت والثلاثاء والخميس للدروس، والجمعة لمراجعة الأخطاء. خطة مرنة، وليست شرطًا.</p></section>';
}
function sourcesPage(){return window.MasarHub.docsPage(COURSE,state)+`<div class="eyebrow" style="margin-top:32px">REFERENCE LIBRARY / OFFICIAL</div><h1 class="page-title">المراجع والمصادر</h1><p class="sub">مراجع رسمية سعودية ومصادر تعليمية مساعدة. الروابط للإثراء والرجوع إلى النصوص الأصلية؛ اختلاف سنة الموديل أو تحديث الأنظمة قد يغير بعض التفاصيل.</p><div class="sources-disclaimer">${COURSE.sources.map(s=>`<section class="ref-card"><div class="flexline"><h3>${ESC(s.name)}</h3><span class="chip tiny">${ESC(s.category||'مرجع')}</span></div><p>${ESC(s.scope||s.notes||'مصدر للقراءة والتحقق')}</p><a href="${ESC(s.url)}" target="_blank" rel="noopener noreferrer">افتحي المصدر الرسمي / التعليمي ↗</a></section>`).join('')}</div>${footerNote()}`}
function notesPage(){const entries=Object.keys(state.notes).map(Number).filter(n=>state.notes[n]?.trim()).sort((a,b)=>a-b);const marks=state.bookmarks.filter(n=>n>=1&&n<=48);return `<div class="eyebrow">MY NOTEBOOK</div><h1 class="page-title">دفتر مذاكرتي</h1><p class="sub">كلامك وملاحظاتك على الدروس، والموضوعات التي حفظتيها للمراجعة لاحقًا.</p><div class="section-head"><h2>دروس محفوظة (${marks.length})</h2></div><div class="card">${marks.length?marks.map(n=>`<a class="lesson-row" href="#/lesson/${n}"><span class="lesson-no">${p2(n)}</span><span class="lesson-info"><b>${ESC(getLesson(n).title)}</b><small>الأسبوع ${weekForLesson(n)}</small></span>${icon('star')}</a>`).join(''):'<div class="empty">ما حفظتِ أي درس للمراجعة. اضغطي «حفظ للمراجعة» من داخل أي درس.</div>'}</div><div class="section-head"><h2>ملاحظاتي (${entries.length})</h2></div>${entries.length?entries.map(n=>`<div class="ref-card"><div class="flexline"><h3>${ESC(getLesson(n).title)}</h3><a class="inline-link" href="#/lesson/${n}">فتح الدرس ←</a></div><p style="white-space:pre-wrap">${ESC(state.notes[n])}</p></div>`).join(''):'<div class="empty">دفترك لسه فاضي. اكتبي أول ملاحظة من داخل الدروس.</div>'}${window.MasarHub.notesPage(state,COURSE)}${footerNote()}`}
function quizPage(){const options=weeks.map(w=>`<option value="${w.number}">${w.number} — ${ESC(w.title)}</option>`).join(''); const wrong=Object.entries(state.answers).filter(([id,v])=>{const q=questions.find(q=>q.id===id);return q&&q.correct_option_index!==v}).length;return `<div class="eyebrow">KNOWLEDGE CHECK</div><h1 class="page-title">مركز الاختبارات</h1><p class="sub">اختاري أسبوعًا لتختبري ثلاثة مفاهيم، أو خوضي اختبارًا شاملًا من 12 سؤالًا متنوعة من المنهج. جميع الدرجات للتدريب الشخصي فقط.</p><div class="quiz-controls"><button class="btn btn-primary" type="button" data-action="start-quiz" data-week="all">اختبار شامل · 12 سؤالًا ${icon('arrow')}</button><button class="btn btn-muted" type="button" data-action="start-quiz" data-week="wrong" ${wrong===0?'disabled':''}>راجعي الأخطاء (${wrong})</button><select class="select" id="choose-week" aria-label="اختيار أسبوع للاختبار"><option value="">اختبار أسبوع معين...</option>${options}</select></div><div id="quiz-stage">${renderQuizStage()}</div><div class="section-head"><div><h2>مراجعة الأسئلة على مستوى الدروس</h2><p>كل درس يحتوي سؤالًا خاصًا به وتفسيرًا بعد الإجابة.</p></div><a href="#/weeks">خطة الدروس ←</a></div>${footerNote()}`}
function renderQuizStage(){if(!session){let hist=state.history.slice(-4).reverse();return `<div class="card"><div class="flexline"><h3>ابدئي اختبارك التالي</h3><span class="chip blue">${icon('quiz')} تمهيد</span></div><p class="sub" style="margin-top:10px">إذا ظهرت لك إجابة خطأ، سترين السبب فورًا. والاختبار الأسبوعي من ثلاث أسئلة، بينما الاختبار الشامل يختار 12 سؤالًا من الأسابيع المختلفة.</p>${hist.length?`<div class="section-head"><h2>المحاولات الأخيرة</h2></div>${hist.map(h=>`<div class="lesson-row"><span class="lesson-no">${h.score}/${h.total}</span><span class="lesson-info"><b>${ESC(h.label)}</b><small>${ESC(h.date)}</small></span></div>`).join('')}`:''}</div>`}
if(session.index>=session.ids.length){const score=session.ids.filter(id=>session.answers[id]===questions.find(q=>q.id===id).correct_option_index).length;const total=session.ids.length;return `<div class="test-results"><div class="eyebrow">RESULTS / النتيجة</div><div class="score">${score}<span style="font-size:30px;color:var(--fog)"> / ${total}</span></div><h2>${score===total?'أبدعتي! كل الإجابات صحيحة.':score>=total*.7?'شغل ممتاز، وراجعي بعض النقاط.':'المهم تعرفين سبب الخطأ وتراجعينه.'}</h2><p>هذه درجة تدريبية داخل الموقع، وليست درجة نجاح رسمية للرخصة.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px"><button class="btn btn-primary" type="button" data-action="quiz-restart">إعادة الاختبار</button><button class="btn btn-outline" type="button" data-action="quiz-end">العودة للمركز</button></div></div>`}
const q=questions.find(x=>x.id===session.ids[session.index]), ans=session.answers[q.id], answered=Number.isInteger(ans),correct=ans===q.correct_option_index;return `<div class="quiz-layout"><div class="test-card"><div class="flexline"><span class="test-index">سؤال ${p2(session.index+1)} من ${p2(session.ids.length)}</span><span class="chip tiny blue">الأسبوع ${q.week}</span></div><div class="microbar" style="margin:18px 0 9px"><span style="width:${session.index/session.ids.length*100}%"></span></div><h2>${ESC(q.question)}</h2><div class="options">${q.options.map((t,i)=>`<button type="button" class="option ${answered?(i===q.correct_option_index?'correct':i===ans?'wrong':''):''}" data-action="test-answer" data-choice="${i}" ${answered?'disabled':''}><span class="bullet">${p2(i+1)}</span>${ESC(t)}</button>`).join('')}</div>${answered?`<div class="feedback ${correct?'':'wrong'}"><strong>${correct?'ممتاز، صحيح.':'الإجابة الصحيحة موضحة بالأخضر.'}</strong><span class="feedback-reason">${ESC(q.rationale)}</span>${questionReferenceByQuestion(q)}</div>`:''}<div class="lesson-footer"><span class="note-preview">اسألي نفسك: ليش هذا الخيار أفضل من البقية؟</span><button type="button" class="btn btn-primary" data-action="quiz-next" ${answered?'':'disabled'}>${session.index+1===session.ids.length?'اعرضي النتيجة':'السؤال التالي'} ${icon('arrow')}</button></div></div><div class="aside-card"><h3>تفاصيل الاختبار</h3><p>${ESC(session.label)}</p><div class="microbar"><span style="width:${Math.round(session.index/session.ids.length*100)}%"></span></div><p>${session.ids.length} سؤالًا · يصحح كل سؤال عند الإجابة</p><button type="button" class="btn btn-outline" data-action="quiz-end">إنهاء الجلسة</button></div></div>`}
function settingsPage(){return `<div class="eyebrow">YOUR SPACE</div><h1 class="page-title">إعدادات المذاكرة</h1><p class="sub">قاعدة البيانات المستخدمة IndexedDB محلية داخل هذا المتصفح، دون حساب أو قاعدة بيانات سحابية؛ لا توجد مزامنة بين الأجهزة.</p><section class="card settings-card"><h3>خط ثمانية في مِسار</h3><p>ضبطنا تصميم الموقع لاستخدام «ثمانية سانس» عند تثبيته على جهازك. ترخيص ثمانية لا يسمح برفع ملفات الخط إلى GitHub أو توزيعه للتنزيل من الموقع؛ إذا لم يكن الخط مثبتًا، سيظهر خط احتياطي واضح. ولا تُرسل ملفات الخط أو ملاحظاتك إلى خادم خارجي.</p><p><a class="source-link" href="https://font.thmanyah.com/" target="_blank" rel="noopener noreferrer">تحميل الخط من المصدر الرسمي وتثبيته على جهازك ↗</a> <a class="source-link" href="https://font.thmanyah.com/licenses" target="_blank" rel="noopener noreferrer">قراءة الترخيص ↗</a></p></section><section class="card settings-card"><h3>حفظ المذاكرة على هذا الكمبيوتر</h3><p>يُحفظ تقدمك وآخر درس قرأتِه ومكان وصولك في الصفحة تلقائيًا داخل المتصفح نفسه. عند العودة اضغطي «ارجعي لآخر درس» من الرئيسية.</p><div class="settings-actions"><button type="button" class="btn btn-outline" data-action="persist-storage">طلب حماية بيانات الموقع من الحذف التلقائي</button></div><p class="note-preview">التخزين قد يُحذف يدويًا أو بسياسات المتصفح؛ احتفظي بنسخة احتياطية. لا يتزامن Chrome وEdge.</p><h3>تثبيت مِسار على جهازك والعمل دون إنترنت</h3><p>افتحي الموقع المنشور على Chrome أو Edge، ثم اختاري «تثبيت التطبيق» من قائمة المتصفح إذا ظهرت لك. بعد الزيارة الأولى والتحميل الناجح يمكن فتح الدروس الأساسية دون اتصال. الفيديوهات وملفات PDF الخارجية تحتاج إنترنت، أما الملفات التي أضفتِها للمتصفح فتظل محلية.</p><div class="settings-actions"><button type="button" class="btn btn-outline" data-action="storage-health">فحص حالة الحفظ والمساحة</button></div><h3>النسخ الاحتياطي</h3><p class="note-preview" id="db-status">${ESC(databaseStatus)}</p><p>حملي ملف بياناتك لحفظ علامات إنجاز الدروس والإجابات والملاحظات، أو أعيدي استيراده على نفس الجهاز أو جهاز آخر.</p><div class="settings-actions"><button type="button" class="btn btn-primary" data-action="export">${icon('download')} تصدير تقدمي (JSON)</button><button type="button" class="btn btn-outline" data-action="import">استيراد نسخة احتياطية</button><input type="file" id="import-file" accept="application/json,.json" hidden></div></section><section class="card settings-card"><h3>ماذا يتضمن هذا الإصدار؟</h3><div class="point"><i>1</i>48 درسًا مع 48 تدريب تفكير مستقلًا؛ النصوص ما زالت تحتاج مراجعة المصدر المعتمد.</div><div class="point"><i>2</i>48 سؤال درس، و36 سؤال مراجعة إضافيًا، ومحاكاة اختبار تدريبي غير رسمي، و12 بطاقة مراجعة.</div><div class="point"><i>3</i>المذاكرة والملاحظات ومحاولات المراجعة تُحفظ في IndexedDB على هذا المتصفح؛ PDF والملفات الخاصة لا تدخل ضمن النسخة الاحتياطية JSON ولا توجد مزامنة سحابية.</div><div class="point"><i>4</i>ليس فيه خطوات أزرار دقيقة لأكورد دون معرفة سنة الموديل والفئة.</div></section><section class="card settings-card"><h3>البدء من جديد</h3><p>حذف البيانات المحلية سيزيل العلامات والإجابات والملاحظات الموجودة على هذا المتصفح. حملي نسخة احتياطية أولًا إذا احتجتيها.</p><button type="button" class="btn btn-outline" data-action="clear" style="color:var(--crimson)">حذف تقدم هذا المتصفح</button></section>${footerNote()}`}
function notFound(){return `<div class="empty"><h3>الصفحة غير موجودة</h3><p>ممكن ترجعين للرئيسية وتتابعين من هناك.</p><a href="#/home" class="btn btn-primary">العودة للرئيسية</a></div>`}
function resolvePage(){const r=route();if(r==='/home')return ['الرئيسية',home()];if(r==='/weeks')return ['الخطة الدراسية',weeksPage()];if(r.startsWith('/week/')){const n=Number(r.split('/')[2]);return ['الأسبوع '+n,weekPage(n)]}if(r.startsWith('/lesson/')){const n=Number(r.split('/')[2]);return ['الدرس '+n,lessonPage(n)]}if(r==='/quiz')return ['الاختبارات',quizPage()];if(r==='/practice-quiz')return ['أسئلة التجميعات',window.MasarHub.quizPage(COURSE,state)];if(r==='/traffic-signs')return ['إشارات المرور',window.MasarSigns.page(COURSE,state)];if(r==='/review')return ['مراجعتي',window.MasarCoach.reviewPage(COURSE,state)];if(r==='/mock-exam')return ['محاكاة الاختبار',window.MasarCoach.pageMock(COURSE,state)];if(r==='/practice-checklist')return ['مهارات التقييم',window.MasarHub.practicePage(COURSE,state)];if(r==='/paper-practice')return ['اختبار ورقي',window.MasarHub.paperPage(COURSE)];if(r==='/study-guide')return ['كيف أذاكر؟',studyGuidePage()];if(r==='/cards')return ['بطاقات المراجعة',flashcardsPage()];if(r==='/notes')return ['ملاحظاتي',notesPage()];if(r==='/visuals')return ['الرسوم التفاعلية',visualLibraryPage()];if(r==='/videos')return ['مقاطع القيادة',videoGalleryPage()];if(r==='/sources')return ['المصادر',sourcesPage()];if(r==='/settings')return ['الإعدادات',settingsPage()];return ['غير موجودة',notFound()]}
function timerHTML(){return `<div class="floating-timer" aria-label="مؤقت مذاكرة"><span style="font-size:11px;color:var(--steel);font-weight:850">${icon('clock')}</span><b id="timer-text">${p2(Math.floor(timer.seconds/60))}:${p2(timer.seconds%60)}</b><button type="button" data-action="timer-toggle" aria-label="${timer.active?'إيقاف المؤقت':'بدء المؤقت'}">${icon(timer.active?'pause':'play')}</button><button type="button" data-action="timer-reset" aria-label="إعادة ضبط المؤقت">${icon('reset')}</button></div>`}
function render(keepScroll=false){const [title,content]=resolvePage();APP.innerHTML=`${sidebar()}<div class="mobile-backdrop ${mobileOpen?'open':''}" data-action="menu"></div><main class="app-main" id="main">${topbar(title)}<div class="page">${content}</div></main>${timerHTML()}`;if(!keepScroll)window.scrollTo(0,0);document.title=`${title} | مِسار`;displayedRoute=route();updateTimer();if(!keepScroll&&route()==='/home')animateStats()}
function animateStats(){if(!window.matchMedia||!document.querySelectorAll||typeof performance==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.querySelectorAll('.stat .val[data-count-value]').forEach(el=>{const to=Number(el.dataset.countValue);if(!to||to>100)return;const begin=performance.now(),duration=650;function frame(t){if(!el.isConnected)return;const k=Math.min((t-begin)/duration,1);el.textContent=Math.round(to*(1-(1-k)**3));if(k<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)})}
let toastTimer;function toast(s){const el=document.getElementById('toast');el.textContent=s;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3100)}
function updateTimer(){const el=document.getElementById('timer-text');if(el)el.textContent=p2(Math.floor(timer.seconds/60))+':'+p2(timer.seconds%60)}
function startTest(week){let pool,label; if(week==='all'){pool=questions.map(q=>q.id); // seeded daily shuffle for consistent mix
 const bucket=Array.from({length:16},(_,i)=>questions.filter(q=>q.week===i+1));pool=bucket.flatMap((arr,i)=>arr[(Math.floor(i*7+Date.now()/86400000))%arr.length]?.id||arr[0]?.id).filter(Boolean);pool=pool.sort((a,b)=>((+a.match(/\d+/)[0]*13)%47)-((+b.match(/\d+/)[0]*13)%47)).slice(0,12);label='الاختبار الشامل · 12 سؤالًا';
} else if(week==='wrong'){pool=questions.filter(q=>state.answers[q.id]!==undefined&&state.answers[q.id]!==q.correct_option_index).map(q=>q.id);label='مراجعة الأخطاء';}
else{const n=Number(week);pool=questions.filter(q=>q.week===n).map(q=>q.id);label=`اختبار الأسبوع ${n}`}
if(!pool.length){toast('ما عندك أسئلة في هذه المجموعة الآن');return}session={ids:pool,label,index:0,answers:{},saved:false};if(route()!='/quiz'){location.hash='#/quiz'}else render(true)}
function recordTest(){if(!session||session.saved)return;const score=session.ids.filter(id=>session.answers[id]===questions.find(q=>q.id===id).correct_option_index).length;state.history.push({label:session.label,score,total:session.ids.length,date:new Date().toLocaleDateString('ar-SA')});state.history=state.history.slice(-30);session.saved=true;save()}
function eventClick(e){let el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,n=Number(el.dataset.id);
 if(action==='paper-print'){window.print();return}
 if(action.startsWith('coach-')&&window.MasarCoach.click(action,el,{course:COURSE,state,save,render,toast}))return;
 if(action.startsWith('sign-')&&window.MasarSigns.click(action,el,{course:COURSE,state,save,render,toast}))return;
 if(action.startsWith('hub-')&&window.MasarHub.click(action,el,{course:COURSE,state,save,render,toast,db:window.MasarDB}))return;
 if(action==='storage-health'){Promise.all([window.MasarDB?.connect().then(()=>true).catch(()=>false)||Promise.resolve(false),navigator.storage?.estimate?.()||Promise.resolve(null)]).then(([db,est])=>{const textMsg=(db?'IndexedDB متصلة':'IndexedDB غير متاحة')+(est?' · الاستخدام التقريبي '+Math.round(est.usage/1024/1024*10)/10+' م.ب من '+Math.round(est.quota/1024/1024)+' م.ب':'')+' · لا توجد مزامنة سحابية';const info=document.getElementById('db-status');if(info)info.textContent=textMsg;toast('تم فحص حالة التخزين')}).catch(()=>toast('تعذّر فحص حالة التخزين'));return}
 if(action==='persist-storage'){if(!navigator.storage?.persist){toast('المتصفح لا يدعم طلب تثبيت التخزين؛ احفظي نسخة احتياطية');return}navigator.storage.persist().then(granted=>toast(granted?'المتصفح وافق على التخزين المستمر في هذا الجهاز':'المتصفح لم يمنح ضمانًا ضد الحذف التلقائي')).catch(()=>toast('لم نتمكن من طلب التخزين المستمر'));return}
 if(action==='video-collection-load'){
  const resource=(COURSE.media_resources||[]).find(x=>x.id===el.dataset.collection&&x.kind!=='youtube_video');
  if(!resource)return;
  let parsed;try{parsed=new URL(resource.url)}catch(_){return}
  if(!['sites.qu.edu.sa','quds.qu.edu.sa','qyadati.com'].includes(parsed.hostname))return;
  const place=el.closest('.video-collection-body')?.querySelector('.video-collection-preview');if(!place)return;
  place.replaceChildren();
  const frame=document.createElement('iframe');frame.className='video-external-frame';frame.title=resource.title;frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='lazy';frame.src=resource.url;
  place.appendChild(frame);
  const note=document.createElement('p');note.className='video-footnote';note.textContent='قد تمنع بعض المواقع عرض هذه الصفحة داخل موقع آخر. إذا ظهرت فارغة، فهذه المكتبة لا تسمح بالتضمين هنا.';place.appendChild(note);
  return;
 }
 if(action==='video-watched'){
  const id=el.dataset.videoResource,resource=(COURSE.media_resources||[]).find(x=>x.id===id&&x.kind==='youtube_video');
  if(!resource)return;
  state.videoWatched=state.videoWatched||{};
  if(state.videoWatched[id])delete state.videoWatched[id];else state.videoWatched[id]=new Date().toISOString();
  save();render(true);toast(state.videoWatched[id]?'تم تسجيل مشاهدة المقطع':'أزلنا علامة المشاهدة');return
 }
 if(action==='video-load'){const id=el.dataset.video;if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;const holder=el.closest('.video-player');if(!holder)return;const iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/'+id;iframe.title=el.dataset.title||'فيديو تعليمي في القيادة';iframe.loading='lazy';iframe.setAttribute('allow','encrypted-media; picture-in-picture; fullscreen');iframe.setAttribute('allowfullscreen','');iframe.referrerPolicy='strict-origin-when-cross-origin';holder.replaceChildren(iframe);return}
 if(action==='visual-step'){const id=el.dataset.visual;const v=(COURSE.learning_visuals||[]).find(x=>x.id===id);if(v){visualStages[id]=Math.max(0,Math.min(v.steps.length-1,Number(el.dataset.step)||0));render(true);document.querySelector?.('[data-action="visual-step"][data-visual="'+id+'"][data-step="'+visualStages[id]+'"]')?.focus?.({preventScroll:true});document.getElementById('visual-learning')?.scrollIntoView({block:'nearest'});}return}
 if(action==='filter-weeks'){catalogFilter=el.dataset.filter||'all';render(true);return}
 if(action==='menu'){mobileOpen=!mobileOpen;render(true);return}
 if(action==='scroll'){document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});return}
 if(action==='study-read'||action==='study-seen'){
  const lessonId=el.dataset.lesson;
  if(!lessons.some(x=>x.id===lessonId))return;
  const key=action==='study-read'?'studyRead':'studySeen';
  state[key]=state[key]||{};
  if(state[key][lessonId])delete state[key][lessonId];else state[key][lessonId]=true;
  save();render(true);toast(action==='study-read'?'تم تحديث متابعة القراءة':'تم تحديث متابعة الشرح المرئي');return
 }
 if(action==='study-star'){const t=new Date(),key=[t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-');state.studyStars=state.studyStars||{};if(state.studyStars[key])delete state.studyStars[key];else state.studyStars[key]=true;save();render(true);return}
 if(action==='mark'){const s=new Set(state.done);s.has(n)?s.delete(n):s.add(n);state.done=[...s].sort((a,b)=>a-b);save();render(true);toast(isDone(n)?'تم حفظ إنجاز الدرس':'أزلنا علامة الإكمال');return}
 if(action==='bookmark'){const s=new Set(state.bookmarks);s.has(n)?s.delete(n):s.add(n);state.bookmarks=[...s];save();render(true);return}
 if(action==='lesson-answer'){const q=getQuestion(n),choice=Number(el.dataset.choice);if(state.answers[q.id]===undefined){state.answers[q.id]=choice;window.MasarCoach.record(state,'lesson',q.id,choice===q.correct_option_index);save();render(true);const a=document.getElementById('practice');a?.scrollIntoView({behavior:'instant',block:'center'})}return}
 if(action==='flip'){flashFlips.has(n)?flashFlips.delete(n):flashFlips.add(n);render(true);return}
 if(action==='start-quiz'){startTest(el.dataset.week);return}
 if(action==='test-answer'){if(session){const q=questions.find(x=>x.id===session.ids[session.index]);if(session.answers[q.id]===undefined){session.answers[q.id]=Number(el.dataset.choice);state.answers[q.id]=Number(el.dataset.choice);save();render(true)}}return}
 if(action==='quiz-next'){if(session){session.index++;if(session.index>=session.ids.length)recordTest();render(true)}return}
 if(action==='quiz-restart'){const old=session;if(old){const which=old.label.startsWith('اختبار الأسبوع')?String(questions.find(q=>q.id===old.ids[0]).week):old.label.includes('الأخطاء')?'wrong':'all';startTest(which)}return}
 if(action==='quiz-end'){session=null;render(true);return}
 if(action==='timer-toggle'){timer.active=!timer.active;render(true);toast(timer.active?'بدأت جلسة التركيز':'تم إيقاف المؤقت');return}
 if(action==='timer-reset'){timer.active=false;timer.seconds=1800;render(true);return}
 if(action==='export'){const data=JSON.stringify({format:'masar-progress-v1',exportedAt:new Date().toISOString(),state},null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='masar-my-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تجهيز نسخة بياناتك الاحتياطية');return}
 if(action==='import'){document.getElementById('import-file')?.click();return}
 if(action==='clear'){if(confirm('سيتم حذف تقدم الدروس والإجابات وملاحظاتك في هذا المتصفح فقط. هل أنت متأكدة؟')){state={done:[],answers:{},notes:{},bookmarks:[],history:[],lastOpened:1,visited:[],readingPositions:{},videoNotes:{},videoWatched:{},sourceNotes:{},reviewAnswers:{},practiceChecks:{},signPractice:{},activityNotes:{},activityChecks:{},reviewHistory:{},mockSession:null,mockHistory:[]};save();render(true);toast('تمت إعادة التقدم للبداية')}return}
}
document.addEventListener('click',e=>{if(e.target.closest('.skip')){e.preventDefault();document.getElementById('main')?.focus();return}if(e.target.closest('[data-action]'))eventClick(e);else if(e.target.closest('.sidebar a'))mobileOpen=false});
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const card=e.target.closest('.card-premium-interactive');if(!card)return;const rect=card.getBoundingClientRect();card.style.setProperty('--mx',((e.clientX-rect.left)/rect.width*100).toFixed(1)+'%');card.style.setProperty('--my',((e.clientY-rect.top)/rect.height*100).toFixed(1)+'%')},{passive:true});
document.addEventListener('input',e=>{if(e.target.id==='catalog-search'){filterText=e.target.value;const el=document.getElementById('week-catalog');if(el)el.innerHTML=weeksGrid();}if(e.target.dataset.note){state.notes[e.target.dataset.note]=e.target.value;save()}if(e.target.dataset.videoNote){state.videoNotes=state.videoNotes||{};state.videoNotes[e.target.dataset.videoNote]=e.target.value;save()}if(e.target.dataset.sourceNote){state.sourceNotes=state.sourceNotes||{};state.sourceNotes[e.target.dataset.sourceNote]=e.target.value;save()}if(e.target.dataset.activityNote){state.activityNotes=state.activityNotes||{};state.activityNotes[e.target.dataset.activityNote]=e.target.value;save()}});
document.addEventListener('change',async e=>{if(e.target.id==='choose-week'&&e.target.value){startTest(e.target.value)}if((e.target.id==='hub-file'||e.target.id==='hub-batch')&&e.target.files?.[0]){await window.MasarHub.upload(e.target,{db:window.MasarDB,render,toast,course:COURSE});return}if(e.target.dataset.practiceId){state.practiceChecks=state.practiceChecks||{};state.practiceChecks[e.target.dataset.practiceId]=e.target.checked;save();render(true)}if(e.target.dataset.activityCheck){state.activityChecks=state.activityChecks||{};state.activityChecks[e.target.dataset.activityCheck]=e.target.checked;save();render(true)}if(e.target.id==='import-file'&&e.target.files?.[0]){try{const obj=JSON.parse(await e.target.files[0].text());if(e.target.files[0].size>5*1024*1024||obj.format!=='masar-progress-v1'||!obj.state||!Array.isArray(obj.state.done)||!obj.state.done.every(n=>Number.isInteger(n)&&n>=1&&n<=48)||!obj.state.answers||typeof obj.state.answers!=='object'||Array.isArray(obj.state.answers))throw Error('Invalid');if(confirm('هل تريدين استبدال تقدم هذا المتصفح بالنسخة المستوردة؟')){state={...state,...obj.state};save();render(true);toast('تم استيراد البيانات')}}catch(err){toast('ملف غير صالح لاستيراد تقدم مِسار')}}});
function lessonNumberFromRoute(path){const m=/^\/lesson\/(\d+)$/.exec(path||'');const n=Number(m?.[1]);return n>=1&&n<=48?n:null}
function captureReadingPosition(path=displayedRoute){const n=lessonNumberFromRoute(path);if(!n||restoringScroll)return;const y=Math.max(0,Math.round(window.scrollY||document.documentElement?.scrollTop||0));state.readingPositions=state.readingPositions||{};if(state.readingPositions[n]!==y){state.readingPositions[n]=y;save()}}
function restoreReadingPosition(){const n=lessonNumberFromRoute(route());if(!n)return;const y=Number(state.readingPositions?.[n])||0;if(y<=0)return;restoringScroll=true;requestAnimationFrame(()=>{window.scrollTo(0,y);requestAnimationFrame(()=>{restoringScroll=false})})}
window.addEventListener('scroll',()=>{if(!lessonNumberFromRoute(displayedRoute)||restoringScroll)return;clearTimeout(scrollWriteTimer);scrollWriteTimer=setTimeout(()=>captureReadingPosition(),600)},{passive:true});
window.addEventListener('hashchange',()=>{clearTimeout(scrollWriteTimer);captureReadingPosition(displayedRoute);mobileOpen=false;render();restoreReadingPosition();if(location.hash==='#main'){document.getElementById('main')?.focus()}});
window.addEventListener('pagehide',()=>{clearTimeout(scrollWriteTimer);captureReadingPosition()});
window.addEventListener('storage',e=>{if(e.key===baseKey){try{state={...state,...JSON.parse(e.newValue||'{}')};render(true)}catch(_){}}});
tickInterval=setInterval(()=>{window.MasarCoach?.tick(COURSE,state,save,render);if(timer.active){if(timer.seconds>0)timer.seconds--;updateTimer();if(timer.seconds===0){timer.active=false;toast('خلصت جلسة الـ30 دقيقة، خذي استراحة قصيرة ✨');render(true)}}},1000);
render();restoreReadingPosition();
if(window.MasarDB){
  window.MasarDB.seedReference(COURSE).then(() => window.MasarDB.loadUser()).then(saved => {
    databaseReady=true; databaseStatus='قاعدة IndexedDB جاهزة · حفظ محلي على هذا الجهاز';
    window.MasarHub?.refreshFiles(window.MasarDB,()=>{if(route()==='/sources')render(true)});
    // Preserve edits made in the current page or existing localStorage progress.
    if(!savedMirrorPresent && !dirtyBeforeReady && saved){
      state={...state,...saved};
      try{localStorage.setItem(baseKey,JSON.stringify(state))}catch(_){}
      render(true);restoreReadingPosition();
    } else {
      save();
    }
    const status=document.getElementById('db-status');if(status)status.textContent=databaseStatus;
  }).catch(e=>{databaseStatus='IndexedDB غير متاحة · تم استخدام التخزين الاحتياطي المحلي';console.warn('MASAR database unavailable',e);const el=document.getElementById('db-status');if(el)el.textContent=databaseStatus;});
}
})();
