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
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/visuals.js','utf8'),context,{timeout:3000});vm.runInContext(fs.readFileSync(__dirname+'/study-hub.js','utf8'),context,{timeout:3000});vm.runInContext(text,context,{timeout:3000});
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
context.location.hash='#/practice-checklist';windowHandlers.hashchange();if(!element('app').innerHTML.includes('قائمة المهارات العملية')||!element('app').innerHTML.includes('PRA-1:0'))throw Error('Practical checklist missing');console.log('PASS practical checklist');
context.location.hash='#/sources';windowHandlers.hashchange();if(!element('app').innerHTML.includes('المصادر وملفاتي الخاصة')||!element('app').innerHTML.includes('DOC-NAZAWI')||!element('app').innerHTML.includes('صفحة 39'))throw Error('Private source index missing');console.log('PASS private PDF and 39 external-page index');
documentHandlers.input({target:{dataset:{videoNote:'VIDEO-QUDS-X'},value:'الدقيقة 01:20: تعليم خاص'}});if(!saved['masar-driving-v1'].includes('الدقيقة 01:20'))throw Error('Video notes were not persisted');console.log('PASS per-video note persistence');

context.location.hash='#/study-guide';windowHandlers.hashchange();if(!element('app').innerHTML.includes('كيف أذاكر وأفهم السواقة'))throw Error('Study guide missing');
context.location.hash='#/paper-practice';windowHandlers.hashchange();if(!element('app').innerHTML.includes('اختبار ورقي تجريبي')||!element('app').innerHTML.includes('طباعة نموذج الأسئلة'))throw Error('Printable practice missing');console.log('PASS study guide and 20-question paper assessment');
