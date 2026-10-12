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
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/visuals.js','utf8'),context,{timeout:3000});vm.runInContext(text,context,{timeout:3000});
for(const [hash,label] of [['#/home','خلف المقود'],['#/weeks','خريطة مشوارك'],['#/week/7','أولوية الدخول إلى الدوار'],['#/lesson/26','مسافة التوقف'],['#/quiz','مركز الاختبارات'],['#/cards','بطاقات تثبيت المعلومات'],['#/notes','دفتر مذاكرتي'],['#/settings','إعدادات المذاكرة']]){
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
