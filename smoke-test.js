const fs=require('fs'), vm=require('vm');
const course=JSON.parse(fs.readFileSync(__dirname+'/data/course.json','utf8'));
if(course.weeks.length!==16||course.lessons.length!==48||course.questions.length!==48) throw Error('Curriculum count mismatch');
const lessons=new Set(course.lessons.map(l=>l.id)), weeks=new Set(course.weeks.map(w=>w.id));
for(const l of course.lessons) if(!weeks.has(l.week_id)) throw Error('Orphan lesson: '+l.id);
for(const q of course.questions) if(!lessons.has(q.lesson_id)||!Array.isArray(q.options)||q.correct_option_index<0||q.correct_option_index>=q.options.length) throw Error('Invalid question: '+q.id);
const text=fs.readFileSync(__dirname+'/app.js','utf8');
const elements={};let documentHandlers={},windowHandlers={},saved={};
function element(id){return elements[id]|| (elements[id]={id,innerHTML:'',textContent:id==='course-data'?JSON.stringify(course):'',classList:{add(){},remove(){}},scrollIntoView(){},focus(){}})}
const context={console,Math,Date,Number,String,Array,Set,Object,JSON,URL,Blob,
 document:{getElementById:element,addEventListener(t,fn){documentHandlers[t]=fn},createElement(){return element('tmp')},body:{append(){}}},
 window:{scrollTo(){},addEventListener(t,fn){windowHandlers[t]=fn}},
 location:{hash:'#/home'},localStorage:{getItem(k){return saved[k]||null},setItem(k,v){saved[k]=v}},
 setInterval(){return 1},setTimeout(){return 1},clearTimeout(){},confirm(){return true}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/visuals.js','utf8'),context,{timeout:3000});vm.runInContext(fs.readFileSync(__dirname+'/study-hub.js','utf8'),context,{timeout:3000});vm.runInContext(fs.readFileSync(__dirname+'/traffic-signs.js','utf8'),context,{timeout:3000});vm.runInContext(fs.readFileSync(__dirname+'/study-coach.js','utf8'),context,{timeout:3000});vm.runInContext(text,context,{timeout:3000});
for(const [hash,label] of [['#/home','خلف المقود'],['#/weeks','خريطة مشوارك'],['#/week/7','أولوية الدخول إلى الدوار'],['#/lesson/26','مسافة التوقف'],['#/quiz','مركز الاختبارات'],['#/cards','بطاقات تثبيت المعلومات'],['#/notes','دفتر مذاكرتي'],['#/visuals','المكتبة المرئية'],['#/settings','إعدادات المذاكرة']]){
 context.location.hash=hash;windowHandlers.hashchange();
 if(!element('app').innerHTML.includes(label))throw Error('Missing route '+hash);
 console.log('PASS',hash);
}
context.location.hash='#/lesson/1';windowHandlers.hashchange();
const click=(dataset)=>documentHandlers.click({target:{closest(selector){return selector==='[data-action]'?{dataset}:null}}});
click({action:'mark',id:'1'});if(!saved['masar-driving-v1'].includes('"done":[1]'))throw Error('Save progress failed');
click({action:'lesson-answer',id:'1',choice:'1'});if(!saved['masar-driving-v1'].includes('"QUIZ-001":1'))throw Error('Save answer failed');
console.log('PASS progress and answer persistence');
context.location.hash='#/weeks';windowHandlers.hashchange();
const clickFilter=value=>click({action:'filter-weeks',filter:value});
clickFilter('current');
if(!element('app').innerHTML.includes('data-week="1"')||element('app').innerHTML.includes('data-week="2"'))throw Error('In-progress week filter failed');
clickFilter('completed');
if(!element('app').innerHTML.includes('ما فيه أسابيع هنا حاليًا'))throw Error('Completed filter empty state failed');
clickFilter('all');
if(!element('app').innerHTML.includes('data-week="16"'))throw Error('All weeks filter failed');
console.log('PASS interactive catalog filters');
context.location.hash='#/lesson/19';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('VISUAL LEARNING')||!element('app').innerHTML.includes('مركبة على مدخل الدوار'))throw Error('Roundabout lesson diagram missing');
click({action:'visual-step',visual:'VIS-ROUNDABOUT',step:'2'});
if(!element('app').innerHTML.includes('المرحلة 3 من 3'))throw Error('Diagram stage interaction failed');
context.location.hash='#/lesson/14';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('خط متقطع'))throw Error('Road-marking diagram missing');
context.location.hash='#/lesson/31';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('حركة السيارة عند الرجوع'))throw Error('Parking diagram missing');
console.log('PASS visual learning diagrams and stage navigation');

context.location.hash='#/visuals';windowHandlers.hashchange();if(!element('app').innerHTML.includes('مكتبات الفيديو الخارجية')||!element('app').innerHTML.includes('موقف تفاعلي'))throw Error('Visual library missing');console.log('PASS visual learning library');

context.location.hash='#/lesson/35';windowHandlers.hashchange();if(!element('app').innerHTML.includes('J36565XrCk4')||!element('app').innerHTML.includes('Peyh1mXONAU')||!element('app').innerHTML.includes('video-load'))throw Error('Verified video resources missing');console.log('PASS direct-source video lesson links');
let loadedFrame=null;
const player={replaceChildren(el){loadedFrame=el}};
const playButton={dataset:{action:'video-load',video:'J36565XrCk4',title:'مهارة X'},closest(selector){return selector==='.video-player'?player:null}};
const oldCreate=context.document.createElement;
context.document.createElement=()=>({setAttribute(){},loading:null,src:'',title:'',referrerPolicy:''});
documentHandlers.click({target:{closest(selector){return selector==='[data-action]'?playButton:null}}});
context.document.createElement=oldCreate;
if(!loadedFrame||loadedFrame.src!=='https://www.youtube-nocookie.com/embed/J36565XrCk4'||loadedFrame.loading!=='lazy')throw Error('Click-to-load video does not work');
console.log('PASS click-to-load privacy-enhanced video player');

context.location.hash='#/practice-quiz';windowHandlers.hashchange();if(!element('app').innerHTML.includes('تجميعات وأسئلة المراجعة')||!element('app').innerHTML.includes('SIG-01'))throw Error('Training bank missing');console.log('PASS original quiz bank');
context.location.hash='#/practice-checklist';windowHandlers.hashchange();if(!element('app').innerHTML.includes('قائمة المهارات العملية')||!element('app').innerHTML.includes('PRA-1:0'))throw Error('Practical checklist missing');if(!element('app').innerHTML.includes('نماذج أخطاء التقييم العملي')||!element('app').innerHTML.includes('FAULT-16') && !element('app').innerHTML.includes('الخروج من الموقف'))throw Error('Practical fault groups missing');console.log('PASS practical checklist');
context.location.hash='#/sources';windowHandlers.hashchange();if(!element('app').innerHTML.includes('المصادر وملفاتي الخاصة')||!element('app').innerHTML.includes('DOC-NAZAWI')||!element('app').innerHTML.includes('صفحة 39'))throw Error('Private source index missing');console.log('PASS private PDF and 39 external-page index');
documentHandlers.input({target:{dataset:{videoNote:'VIDEO-QUDS-X'},value:'الدقيقة 01:20: تعليم خاص'}});if(!saved['masar-driving-v1'].includes('الدقيقة 01:20'))throw Error('Video notes were not persisted');console.log('PASS per-video note persistence');

context.location.hash='#/study-guide';windowHandlers.hashchange();if(!element('app').innerHTML.includes('كيف أذاكر وأفهم السواقة'))throw Error('Study guide missing');
context.location.hash='#/paper-practice';windowHandlers.hashchange();if(!element('app').innerHTML.includes('اختبار ورقي تجريبي')||!element('app').innerHTML.includes('طباعة نموذج الأسئلة'))throw Error('Printable practice missing');if(!element('app').innerHTML.includes('36 سؤالًا'))throw Error('Printed paper count stale');console.log('PASS study guide and 36-question paper assessment');

context.location.hash='#/lesson/19';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('مراجع الدرس')||!element('app').innerHTML.includes('data-action="hub-open-page"'))throw Error('Indexed PDF lesson reading missing');
console.log('PASS per-lesson private PDF reading references');
context.location.hash='#/practice-quiz';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('أخطائي')||!element('app').innerHTML.includes('غير المحلول')||!element('app').innerHTML.includes('راجعي الدرس المرتبط'))throw Error('Mistakes filters and lesson links absent');
console.log('PASS targeted mistakes review, per-question notes, chapter back-links');

context.location.hash='#/traffic-signs';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('TRAFFIC SIGNS')||!element('app').innerHTML.includes('SG-01'))throw Error('Signs gallery not rendered');
click({action:'sign-open',id:'SG-01'});
if(!element('app').innerHTML.includes('توقف كامل')||!element('app').innerHTML.includes('راجعي درسها'))throw Error('Sign detail incomplete');
click({action:'sign-back'});
click({action:'sign-mode',mode:'quiz'});
if(!element('app').innerHTML.includes('وش معنى هذه اللوحة؟'))throw Error('Sign recognition quiz absent');
// First quiz is SG-01. Test a wrong answer persists and is explainable.
click({action:'sign-answer',choice:'SG-03'});
if(!saved['masar-driving-v1'].includes('"SG-01"'))throw Error('Sign review result not persisted');
if(!element('app').innerHTML.includes('الإجابة المناسبة: قف'))throw Error('Wrong-answer explanation absent');
click({action:'sign-filter',filter:'mistakes'});
if(!element('app').innerHTML.includes('وش معنى هذه اللوحة؟'))throw Error('Mistakes-only quiz not available');
click({action:'sign-answer',choice:'SG-01'});
if(!element('app').innerHTML.includes('صح!'))throw Error('Correcting prior mistake failed');
console.log('PASS traffic signs gallery, filtered quizzes, locally saved answers and retry');

context.location.hash='#/practice-quiz';windowHandlers.hashchange();
click({action:'hub-filter',topic:'new'});
if(!element('app').innerHTML.includes('SIG-01'))throw Error('First unanswered question missing');
click({action:'hub-answer',qid:'SIG-01',answer:'0'});
if(!element('app').innerHTML.includes('إجابتك صحيحة')||!element('app').innerHTML.includes('SIG-01'))throw Error('Unanswered filter hides explanation immediately');
click({action:'hub-next'});
if(!element('app').innerHTML.includes('SIG-02'))throw Error('Unanswered filter did not advance to next unattempted question');
click({action:'hub-answer',qid:'SIG-02',answer:'0'});
if(!element('app').innerHTML.includes('راجعي المعلومة'))throw Error('Wrong-answer feedback missing');
click({action:'hub-filter',topic:'wrong'});
if(!element('app').innerHTML.includes('SIG-02'))throw Error('Mistakes-only filter cannot revisit saved wrong answer');
click({action:'hub-answer',qid:'SIG-02',answer:'1'});
if(!element('app').innerHTML.includes('إجابتك صحيحة')||!element('app').innerHTML.includes('SIG-02'))throw Error('Correcting a mistake must show explanation before removal');
click({action:'hub-next'});
if(!element('app').innerHTML.includes('لا توجد أسئلة هنا حاليًا'))throw Error('Corrected mistake should leave wrong-answer list');
console.log('PASS practice quiz keeps answer feedback visible across dynamic filters');

context.location.hash='#/lesson/1';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('data-activity-note="ACT-001"')||!element('app').innerHTML.includes('على سيارة مطفأة'))throw Error('Dedicated lesson activity is missing');
documentHandlers.input({target:{id:'',dataset:{activityNote:'ACT-001'},value:'لاحظت الفرامل والحزام قبل القيادة'}});
if(!saved['masar-driving-v1'].includes('لاحظت الفرامل والحزام'))throw Error('Exercise notes not saved');
documentHandlers.change({target:{id:'',dataset:{activityCheck:'ACT-001'},checked:true}});
if(!saved['masar-driving-v1'].includes('"ACT-001":true'))throw Error('Exercise completion not saved');
context.location.hash='#/review';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('خطتي لمراجعة أخطائي')||!element('app').innerHTML.includes('1 / 48'))throw Error('Spaced-review dashboard not loading activity completion');
if(!element('app').innerHTML.includes('راجعي الآن'))throw Error('Review list did not render');
context.location.hash='#/mock-exam';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('محاكاة اختبار نظري'))throw Error('Mock exam page missing');
click({action:'coach-mock-start'});
let mm=JSON.parse(saved['masar-driving-v1']).mockSession;
if(!mm||mm.questionIds.length!==20||mm.timeLimitMs!==1500000||mm.status!=='active')throw Error('Mock exam session not saved');
if(element('app').innerHTML.includes('الإجابة المناسبة:'))throw Error('Exam leaked solution before submission');
click({action:'coach-mock-answer',option:'1'});
mm=JSON.parse(saved['masar-driving-v1']).mockSession;
if(Object.keys(mm.answers).length!==1)throw Error('Mock answer was not saved');
click({action:'coach-mock-next'});
if(!element('app').innerHTML.includes('سؤال 2 من 20'))throw Error('Mock exam next navigation broken');
context.location.hash='#/home';windowHandlers.hashchange();
context.location.hash='#/mock-exam';windowHandlers.hashchange();
if(!element('app').innerHTML.includes('سؤال 2 من 20'))throw Error('Mock exam not resumable on route change');
click({action:'coach-mock-finish'});
let finalState=JSON.parse(saved['masar-driving-v1']);
if(finalState.mockSession.status!=='finished'||finalState.mockHistory.length!==1||typeof finalState.mockSession.score!=='number')throw Error('Mock exam result not persisted');
if(!element('app').innerHTML.includes('نتيجة تدريبية شخصية'))throw Error('Exam feedback not rendered');
console.log('PASS all 48 original lesson activities, saved reflections, spaced-review dashboard, and resumable timed mock exam');


// Regression: repeated answers are not presented as validated driving mastery.
const masteryCourse={
 lessons:[{id:'LES-900'}],
 questions:[{id:'QUIZ-900',lesson_id:'LES-900'}],
 lesson_activities:[{id:'ACT-900',lesson_id:'LES-900'}]
};
const masterySnapshot=context.window.MasarCoach.masterySnapshot;
if(typeof masterySnapshot!=='function')throw Error('Mastery snapshot is unavailable');
const masteryState={activityChecks:{'ACT-900':true},reviewHistory:{}};
const level=()=>masterySnapshot(masteryCourse,masteryState)[0].level;
if(level()!=='تمرين ذاتي فقط')throw Error('An unchecked quiz cannot count as learned');
for(let i=0;i<3;i++)context.window.MasarCoach.record(masteryState,'lesson','QUIZ-900',true,Date.now()+i*1000);
if(level()!=='إجابات متكررة')throw Error('Correct repeats label must not claim validated mastery');
context.window.MasarCoach.record(masteryState,'lesson','QUIZ-900',false);
if(level()!=='يحتاج مراجعة')throw Error('A wrong answer must reset the repeated answer indicator');
console.log('PASS study indicator distinguishes self-study, repeated answers and regression after an error');
