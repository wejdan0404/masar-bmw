/* MASAR Study Coach — learning activities, spaced reflection and non-official mock exam.
   Source-of-truth: course.json. This is study support, not accredited driving evaluation. */
(function(){
'use strict';
const E=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=24*60*60*1000;
const toId=l=>String(l.id||'').replace('LES-','ACT-');
const nOf=id=>Number(String(id).split('-').pop());
const allQuestions=c=>(c.review_questions||[]).concat(c.questions||[]);
let mockPosition=0;
function record(state,kind,id,correct,now=Date.now()){
 const key=kind+':'+id;state.reviewHistory=state.reviewHistory||{};
 const old=state.reviewHistory[key]||{correctStreak:0,attempts:0,wrong:0};
 const streak=correct?Math.min(10,(old.correctStreak||0)+1):0;
 const days=correct?[0,1,3,7,14,30,60][Math.min(streak,6)]:0;
 state.reviewHistory[key]={kind,id,attempts:(old.attempts||0)+1,wrong:(old.wrong||0)+(correct?0:1),correctStreak:streak,lastCorrect:!!correct,lastReviewedAt:new Date(now).toISOString(),nextDueAt:new Date(now+days*DAY).toISOString()};
}
function activityBlock(course,lesson,state){
 const a=(course.lesson_activities||[]).find(x=>x.lesson_id===lesson.id);
 if(!a)return '';
 const done=!!state.activityChecks?.[a.id],note=state.activityNotes?.[a.id]||'';
 return '<section class="coach-activity" id="coach-activity"><div class="coach-overline">PRACTICE / تطبيق معرفتك</div><div class="coach-activity-head"><h2>تدريب الدرس: '+E(a.title)+'</h2><span class="coach-state '+(done?'done':'')+'">'+(done?'راجعتِ التمرين':'قيد المذاكرة')+'</span></div><p class="coach-activity-intro">الهدف فهم القرار، مو حفظ جواب جاهز. اكتبي ما لاحظتِه بصياغتك.</p><div class="coach-prompts"><div><span>01 · لاحظي</span><p>'+E(a.observation)+'</p></div><div><span>02 · فكّري</span><p>'+E(a.reasoning)+'</p></div><div><span>03 · تحققي</span><p>'+E(a.verification)+'</p></div></div><label class="coach-notes">إجابتي وملاحظاتي<textarea data-activity-note="'+E(a.id)+'" placeholder="وش لاحظت؟ وش القرار الأنسب؟ وش أحتاج أتأكد منه قبل التطبيق؟" rows="4">'+E(note)+'</textarea></label><label class="coach-check"><input type="checkbox" data-activity-check="'+E(a.id)+'" '+(done?'checked':'')+'/><span>راجعت الأسئلة وكتبت ما فهمته (ليست شهادة إتقان قيادة عملية)</span></label><p class="coach-disclaimer">هذا نشاط تفكير ذاتي غير مصحّح آليًا؛ المواقف العملية تحتاج إشرافًا ومصدرًا معتمدًا.</p></section>';
}
function masterySnapshot(course,state){
 const history=state.reviewHistory||{};
 return (course.lessons||[]).map(lesson=>{
  const activity=(course.lesson_activities||[]).find(a=>a.lesson_id===lesson.id);
  const question=(course.questions||[]).find(q=>q.lesson_id===lesson.id);
  const practiced=!!(activity&&state.activityChecks?.[activity.id]);
  const result=question?history['lesson:'+question.id]:null;
  const correctStreak=result?.correctStreak||0;
  const level=!result?(practiced?'تمرين ذاتي فقط':'لم يُختبر'):!result.lastCorrect?'يحتاج مراجعة':correctStreak>=3?'إجابات متكررة':'فهم قيد التثبيت';
  return {lesson,level,practiced,correctStreak};
 });
}
function reviewPage(course,state){
 const all=state.reviewHistory||{},now=Date.now(),items=Object.values(all);
 const due=items.filter(x=>new Date(x.nextDueAt).getTime()<=now || !x.lastCorrect).sort((a,b)=>(Number(a.lastCorrect)-Number(b.lastCorrect))||new Date(a.nextDueAt)-new Date(b.nextDueAt));
 const weak=items.filter(x=>!x.lastCorrect || x.correctStreak===0).length;
 const completed=(course.lesson_activities||[]).filter(x=>state.activityChecks?.[x.id]).length;
 const mastery=masterySnapshot(course,state);
 const stable=mastery.filter(x=>x.level==='إجابات متكررة').length;
 const building=mastery.filter(x=>x.level==='فهم قيد التثبيت').length;
 const untested=mastery.filter(x=>x.level==='لم يُختبر'||x.level==='تمرين ذاتي فقط').length;
 const overdue=due.slice(0,24).map(x=>{
 let t='',link='';
 if(x.kind==='sign'){const sg=(course.sign_library||[]).find(y=>y.id===x.id);t=sg?'لوحة: '+sg.title:'إشارة '+x.id;link='#/traffic-signs'}
 else if(x.kind==='bank'){const q=(course.review_questions||[]).find(y=>y.id===x.id);t=q?'سؤال: '+q.question:'سؤال '+x.id;link='#/practice-quiz'}
 else {const q=(course.questions||[]).find(y=>y.id===x.id);const l=(course.lessons||[]).find(y=>y.id===q?.lesson_id);t=l?'درس: '+l.title:'سؤال الدرس '+x.id;link='#/lesson/'+(l?.order||1)}
 return '<a class="coach-review-item" href="'+link+'"><span class="coach-review-symbol">'+(x.lastCorrect?'↺':'!')+'</span><span><strong>'+E(t)+'</strong><small>'+(x.lastCorrect?'حان وقت المراجعة':'إجابة خاطئة تحتاج فهمًا')+' · '+x.attempts+' محاولة</small></span><span class="coach-review-arrow">←</span></a>';
 }).join('');
 const notDone=(course.lesson_activities||[]).filter(x=>!state.activityChecks?.[x.id]).slice(0,5);
 return '<section class="coach-page"><div class="eyebrow">PERSONAL REVIEW / SMART REPETITION</div><h1 class="page-title">خطتي لمراجعة أخطائي</h1><p class="sub">يعتمد ترتيب المراجعة على نتائج الأسئلة التي حلّيتيها داخل الموقع؛ المواعيد مقترحة للتثبيت وليست معيارًا رسميًا للجاهزية.</p><div class="coach-summary"><article><strong>'+due.length+'</strong><span>بطاقة حان وقتها</span></article><article><strong>'+weak+'</strong><span>مفاهيم أخطأتِ فيها</span></article><article><strong>'+completed+' / '+(course.lesson_activities||[]).length+'</strong><span>تدريبات تفكير تمت مراجعتها</span></article></div><div class="coach-guidance"><strong>مؤشر تثبيت الفهم — غير رسمي</strong><p>إجابات صحيحة متكررة: '+stable+' درسًا · فهم قيد التثبيت: '+building+' · دون إجابات صحيحة مسجلة: '+untested+'. يعتمد المؤشر على آخر إجابة وعدد مرات الإجابة الصحيحة المتتالية على سؤال الدرس ذاته. تكرار السؤال لا يثبت إتقان المفهوم أو القدرة على تطبيقه في موقف جديد، ولا يقيس القيادة العملية. إكمال نشاط التفكير وحده لا يعني الإتقان.</p></div><div class="coach-section-top"><h2>راجعي الآن</h2><span>تظهر النتائج بعد بدء حل الأسئلة</span></div><div class="coach-review-list">'+(overdue||'<div class="coach-empty">ما عندك مراجعات مستحقة حاليًا. خذي اختبارًا أو افتحي مكتبة اللوحات لتنشئين أول دورة مراجعة.</div>')+'</div><div class="coach-section-top"><h2>أنشطة دروس ما راجعتيها</h2><span>ابدئي بأول نشاط غير مكتمل</span></div><div class="coach-review-list">'+notDone.map(a=>'<a class="coach-review-item" href="#/lesson/'+nOf(a.lesson_id)+'"><span class="coach-review-symbol">✓</span><span><strong>'+E(a.title)+'</strong><small>تدريب التفكير والملاحظات</small></span><span class="coach-review-arrow">←</span></a>').join('')+'</div><div class="coach-guidance"><strong>كيف تعمل المراجعة؟</strong><p>بعد الإجابة الصحيحة نذكّرك بالتدريج بعد يوم، ثم 3 أيام، ثم أسبوع، ثم فترة أطول. وبعد الخطأ يعود الموضوع إلى «راجع الآن». يمكن تصدير هذه البيانات من الإعدادات.</p><a href="#/mock-exam" class="btn btn-primary">ابدئي محاكاة اختبار غير رسمي ←</a></div></section>';
}
function makeMock(course){
 const review=(course.review_questions||[]).slice(),lesson=(course.questions||[]).slice();
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 const ids=shuffle([...shuffle(review).slice(0,10),...shuffle(lesson).slice(0,10)]).map(x=>x.id);
 return {id:'MOCK-'+Date.now(),questionIds:ids,answers:{},startedAt:Date.now(),timeLimitMs:25*60*1000,finishedAt:null,score:null,status:'active'};
}
function elapsed(m,now=Date.now()){return Math.max(0,Math.ceil((m.startedAt+m.timeLimitMs-now)/1000))}
function finishMock(state,course,now=Date.now()){
 const m=state.mockSession;if(!m||m.status!=='active')return false;
 const qs=new Map(allQuestions(course).map(q=>[q.id,q]));
 const score=m.questionIds.reduce((sum,id)=>sum+(Number.isInteger(m.answers[id])&&m.answers[id]===qs.get(id)?.correct_option_index?1:0),0);
 m.finishedAt=now;m.score=score;m.status='finished';
 for(const id of m.questionIds){const q=qs.get(id);if(q&&Number.isInteger(m.answers[id]))record(state,course.review_questions.some(x=>x.id===id)?'bank':'lesson',id,m.answers[id]===q.correct_option_index,now)}
 state.mockHistory=state.mockHistory||[];state.mockHistory.push({id:m.id,score,total:m.questionIds.length,finishedAt:new Date(now).toISOString(),durationSec:Math.round((now-m.startedAt)/1000)});
 state.mockHistory=state.mockHistory.slice(-20);
 return true;
}
function pageMock(course,state){
 let m=state.mockSession;
 const past=state.mockHistory||[];
 let head='<div class="eyebrow">NON-OFFICIAL SIMULATION / تدريب</div><h1 class="page-title">محاكاة اختبار نظري</h1><p class="sub">20 سؤالًا تدريبيًا في 25 دقيقة (إعداد داخل «مسار» وليس مدة أو عددًا رسميًا للاختبار السعودي). الخيارات من بنكنا التعليمي، ولم نؤكد تطابقها مع أسئلة المدارس.</p>';
 if(!m){return '<section class="coach-page">'+head+'<div class="coach-mock-intro"><h2>قبل ما تبدئين</h2><p>الاختبار يجمع 10 أسئلة من الدروس و10 أسئلة مراجعة. لا يعرض التصحيح إلا في النهاية، ثم يربط كل خطأ بالدرس المناسب.</p><button type="button" class="btn btn-primary" data-action="coach-mock-start">ابدئي المحاكاة · 20 سؤالًا</button></div>'+history(past)+'</section>'}
 if(m.status==='finished'){
  const all=new Map(allQuestions(course).map(q=>[q.id,q]));const wrong=m.questionIds.filter(id=>!Number.isInteger(m.answers[id])||m.answers[id]!==all.get(id)?.correct_option_index);
  return '<section class="coach-page">'+head+'<div class="coach-mock-result"><strong>'+m.score+' <small>/ '+m.questionIds.length+'</small></strong><h2>نتيجة تدريبية شخصية</h2><p>لا تساوي نجاحًا أو رسوبًا رسميًا. هذه الملاحظات تساعدك على فهم الإجابات.</p><button type="button" class="btn btn-primary" data-action="coach-mock-new">محاكاة جديدة</button></div><h2 class="coach-section-heading">الأسئلة التي تحتاج مراجعة ('+wrong.length+')</h2><div class="coach-review-list">'+(wrong.length?wrong.map(id=>{const q=all.get(id);if(!q)return '';return '<article class="coach-mock-mistake"><strong>'+E(q.question)+'</strong><p>الإجابة: '+E(q.options[q.correct_option_index])+'</p><small>'+E(q.rationale||q.explanation||'راجعي درس المفهوم.')+'</small><a href="#/lesson/'+nOf(q.lesson_id)+'">الدرس المرتبط ←</a></article>'}).join(''):'<div class="coach-empty">جميع إجاباتك صحيحة في هذا النموذج. جربي نموذجًا آخر لأن تذكر هذه الأسئلة لا يضمن تغطية الاختبار الحقيقي.</div>')+'</div>'+history(past)+'</section>';
 }
 const qs=new Map(allQuestions(course).map(q=>[q.id,q])),idx=Math.max(0,Math.min(m.questionIds.length-1,mockPosition));const q=qs.get(m.questionIds[idx]);if(!q)return '<p>تعذر العثور على سؤال من هذه الجلسة. يُرجى بدء نموذج جديد.</p>';
 const remain=elapsed(m),chosen=m.answers[q.id],answered=Object.keys(m.answers).length;
 return '<section class="coach-page">'+head+'<div class="coach-mock-top"><div><strong>سؤال '+(idx+1)+' من '+m.questionIds.length+'</strong><small>'+answered+' سؤال تمت الإجابة عنه</small></div><div class="coach-clock" id="coach-mock-clock" role="timer" aria-live="off">'+formatTime(remain)+'</div></div><div class="coach-mock-progress"><span style="width:'+(answered/m.questionIds.length*100)+'%"></span></div><article class="coach-mock-question"><h2>'+E(q.question)+'</h2><div class="coach-mock-options">'+q.options.map((answer,j)=>'<button type="button" data-action="coach-mock-answer" data-option="'+j+'" class="'+(chosen===j?'active':'')+'" aria-pressed="'+(chosen===j)+'">'+String.fromCharCode(65+j)+' · '+E(answer)+'</button>').join('')+'</div><div class="coach-mock-nav"><button data-action="coach-mock-prev" type="button" class="btn btn-outline" '+(idx===0?'disabled':'')+'>السابق</button><button data-action="coach-mock-next" type="button" class="btn btn-outline" '+(idx===m.questionIds.length-1?'disabled':'')+'>التالي ←</button></div><div class="coach-mock-tiles" aria-label="الانتقال بين الأسئلة">'+m.questionIds.map((id,i)=>'<button type="button" aria-label="السؤال '+(i+1)+'" class="'+(i===idx?'selected ':'')+(Number.isInteger(m.answers[id])?'done':'')+'" data-action="coach-mock-jump" data-index="'+i+'">'+(i+1)+'</button>').join('')+'</div><p class="coach-disclaimer">ينتهي المؤقت بعد 25 دقيقة حسب ساعة جهازك؛ يمكن إنهاء النموذج قبلها. لن يظهر التصحيح قبل التسليم.</p><button type="button" class="btn btn-primary" data-action="coach-mock-finish">إنهاء وتصحيح المحاكاة ('+answered+'/'+m.questionIds.length+')</button></article></section>';
}
function history(past){return past.length?'<section class="coach-mock-history"><h2>محاولاتي السابقة</h2>'+past.slice(-5).reverse().map(x=>'<div><strong>'+x.score+' / '+x.total+'</strong><span>'+E(new Date(x.finishedAt).toLocaleDateString('ar-SA'))+'</span></div>').join('')+'</section>':''}
function formatTime(seconds){let s=Math.max(0,Number(seconds)||0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function tick(course,state,save,render){
 const m=state.mockSession;if(!m||m.status!=='active')return;
 const seconds=elapsed(m);const el=document.getElementById('coach-mock-clock');if(el)el.textContent=formatTime(seconds);
 if(seconds===0){finishMock(state,course);save();if(location.hash==='#/mock-exam')render(true)}
}
function click(action,el,ctx){
 const s=ctx.state,c=ctx.course,m=s.mockSession;
 if(action==='coach-mock-start'||action==='coach-mock-new'){s.mockSession=makeMock(c);mockPosition=0;ctx.save();ctx.render(false);return true}
 if(!m||m.status!=='active')return false;
 if(action==='coach-mock-answer'){
  const qid=m.questionIds[mockPosition],q=allQuestions(c).find(q=>q.id===qid),option=Number(el.dataset.option);
  if(q&&Number.isInteger(option)&&option>=0&&option<q.options.length){m.answers[qid]=option;ctx.save();ctx.render(true)}return true
 }
 if(action==='coach-mock-next'){mockPosition=Math.min(m.questionIds.length-1,mockPosition+1);ctx.render(true);return true}
 if(action==='coach-mock-prev'){mockPosition=Math.max(0,mockPosition-1);ctx.render(true);return true}
 if(action==='coach-mock-jump'){mockPosition=Math.max(0,Math.min(m.questionIds.length-1,Number(el.dataset.index)||0));ctx.render(true);return true}
 if(action==='coach-mock-finish'){if(confirm('إنهاء النموذج وإظهار النتيجة؟')){finishMock(s,c);ctx.save();ctx.render(false)}return true}
 return false;
}
window.MasarCoach=Object.freeze({activityBlock,reviewPage,pageMock,record,tick,click,finishMock,masterySnapshot});
})();