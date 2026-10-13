(function masarStudio(){
'use strict';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const now=()=>Date.now();
const fmt=n=>`${pad(Math.floor(Math.max(0,n)/60))}:${pad(Math.max(0,n)%60)}`;
const defaults=()=>({timer:{duration:30,remaining:1800,status:'idle',endsAt:null},sessions:[],lastVisitAt:null});
function ensure(state){
 if(!state.studyStudio||typeof state.studyStudio!=='object')state.studyStudio=defaults();
 const data=state.studyStudio;if(!data.timer||!Number.isFinite(data.timer.duration))data.timer=defaults().timer;
 if(!Array.isArray(data.sessions))data.sessions=[];
 return data;
}
function remain(t){return t.status==='running'&&Number.isFinite(t.endsAt)?Math.max(0,Math.ceil((t.endsAt-now())/1000)):Math.max(0,Math.round(t.remaining||0))}
function timerControls(state,large=false){
 const t=ensure(state).timer,r=remain(t),active=t.status==='running';
 const progress=Math.max(0,Math.min(100,100-r/(t.duration*60)*100));
 const status=active?'جلسة التركيز جارية':t.status==='paused'?'متوقفة مؤقتًا':t.status==='finished'?'اكتملت الجلسة':'جاهزة للمذاكرة';
 const times=large?`<div class="studio-duration" role="group" aria-label="مدة جلسة المذاكرة">${[15,25,30,45].map(n=>`<button type="button" data-action="studio-duration" data-min="${n}" class="${t.duration===n?'selected':''}" aria-pressed="${t.duration===n}">${n} د</button>`).join('')}</div>`:'';
 return `<div class="studio-timer-controls ${large?'studio-timer-large':''}" style="--studio-progress:${progress.toFixed(2)}%">
 <div class="studio-clock"><span data-studio-time dir="ltr">${fmt(r)}</span><small>${escapeHTML(status)}</small></div>
 <div class="studio-timer-buttons"><button type="button" data-action="studio-toggle" aria-label="${active?'إيقاف جلسة المذاكرة مؤقتًا':'بدء أو متابعة المذاكرة'}">${active?'إيقاف مؤقت':'▶ '+(t.status==='paused'?'متابعة':'ابدئي')}</button><button type="button" data-action="studio-reset" aria-label="إعادة ضبط الموقت">إعادة ضبط</button></div>
 ${times}</div>`;
}
function timerHTML(state){const t=ensure(state).timer;if(t.status==='idle')return '';const contextPage=/^#\/(?:home|lesson\/\d+)/.test(location.hash||'');document.body?.classList?.toggle?.('studio-context-page',contextPage);return `<aside class="studio-timer-dock" aria-label="جلسة المذاكرة الحالية">${timerControls(state)}</aside>`;}

function lessonCheck(course,state,l){
 const q=(course.questions||[]).find(x=>x.lesson_id===l.id);if(!q)return '';
 const s=ensure(state);const answer=s.diagnostics?.[q.id];
 const has=Number.isInteger(answer?.choice),correct=answer?.choice===q.correct_option_index;
 return `<details class="studio-checkpoint" ${has?'open':''}><summary>اختبار قبلي خفيف · هل أعرف هذه الفكرة؟</summary>
 <div class="studio-checkpoint-body"><p>سؤال للتشخيص الشخصي فقط، ما يغيّر نتيجة اختباراتك الأساسية.</p>
 <strong>${escapeHTML(q.question)}</strong>
 <div class="studio-diagnostic-answers">${q.options.map((o,i)=>`<button type="button" data-action="studio-diagnostic" data-question="${escapeHTML(q.id)}" data-choice="${i}" ${has?'disabled':''} class="${has?(i===q.correct_option_index?'is-correct':i===answer.choice?'is-wrong':''):''}">${escapeHTML(o)}</button>`).join('')}</div>
 ${has?`<div class="studio-diagnostic-feedback" role="status"><b>${correct?'إجابة صحيحة — ممتاز':'خلينا نثبت الفكرة معًا'}</b><p>${escapeHTML(q.rationale||'ارجعي لنقاط الشرح ثم حاولي سؤالًا آخر.')}</p><a href="#reading" data-action="studio-jump" data-target="reading">راجعي شرح هذا الدرس</a></div>`:''}
 </div></details>
 <details class="studio-explain"><summary>ما فهمت؟ ابدئي بخلاصة أبسط</summary><div class="studio-checkpoint-body"><p>${escapeHTML(l.study_content?.recap||l.study_content?.goal||'')}</p><p><strong>تأكدي من هذه النقاط:</strong></p><ul>${(l.study_content?.key_points||[]).slice(0,3).map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul><p>هذه خلاصة من الدرس نفسه وليست معلومات مرورية جديدة. افتحي الشرح الموسع إذا احتجتِ أمثلة إضافية.</p></div></details>`;
}
function widgets(course,state,path){
 const s=ensure(state);
 const lessonN=/^\/lesson\/(\d+)$/.exec(path||'');
 if(path==='/home'||lessonN){
   const current=lessonN?course.lessons.find(l=>l.order===Number(lessonN[1])):course.lessons.find(l=>!(state.done||[]).includes(l.order));
   const l=current||course.lessons[course.lessons.length-1];
   const away=s.lastVisitAt&&now()-Date.parse(s.lastVisitAt)>6*86400000;
   const recents=s.sessions.slice(-3).reverse();
   const guide=lessonN?`<nav class="studio-step-links" aria-label="خطوات المذاكرة"><a href="#reading" data-action="studio-jump" data-target="reading">اقرئي الشرح</a><a href="#active-recall" data-action="studio-jump" data-target="active-recall">من الذاكرة</a><a href="#lesson-videos" data-action="studio-jump" data-target="lesson-videos">شرح مرئي</a><a href="#practice" data-action="studio-jump" data-target="practice">اختبري فهمك</a></nav>`:`<a class="studio-go-lesson" href="#/lesson/${l.order}">افتحي ${escapeHTML(l.title)} ←</a>`;
   return `<section class="studio-session card" aria-label="جلسة مذاكرة موجهة"><div class="studio-heading"><div><span class="bento-overline">STUDY COMPANION / جلسة تركيز</span><h2>مذاكرتك، على راحتك</h2><p>المؤقت اختياري، وما يقطع الدرس أو ينقلك تلقائيًا.</p></div><span class="studio-session-icon" aria-hidden="true">◷</span></div>
   ${away?'<p class="studio-return">رجعتِ بعد فترة؟ ابدئي بمراجعة بسيطة، ثم كمّلي من آخر درس. <a href="#/review">افتحي مراجعتي</a></p>':''}
   ${timerControls(state,true)}${guide}${lessonN?lessonCheck(course,state,l):''}
   ${s.timer.status==='finished'?`<div class="studio-session-summary" role="status"><strong>أحسنتِ، انتهت الجلسة.</strong><p>الجلسة انتهت، لكن فهمك أهم من المدة. جربي سؤالًا من الدرس أو خذي استراحة.</p><a href="#/review">راجعي ما تعلمتِه</a></div>`:''}
   ${path==='/home'&&recents.length?`<p class="studio-session-history">آخر جلسة: ${escapeHTML(new Date(recents[0].at).toLocaleDateString('ar-SA'))} · ${recents[0].minutes} دقيقة</p>`:''}
   </section>`;
 }
 if(path==='/settings')return `<section class="card studio-settings"><h2>مساعد المذاكرة</h2><p>وقت التركيز اختياري ويُحفظ محليًا مع تقدمك. اختيار مدة جديدة يعيد ضبط الجلسة الحالية.</p><p>يمكنك فتح البحث السريع من أعلى الشاشة أو بلوحة المفاتيح <kbd>Ctrl</kbd> + <kbd>K</kbd>.</p><p>ملفات الكتب الخاصة تُحفظ على جهازك وتحتاج نسخًا احتياطيًا منفصلًا عن ملف تقدم المذاكرة.</p></section>`;
 return '';
}
function searchUI(){return `<section class="studio-search-overlay" id="studio-search-overlay" role="dialog" aria-modal="true" aria-label="البحث في مِسار" hidden><div class="studio-search-window"><header><h2>ابحثي في مِسار</h2><button type="button" data-action="studio-search-close" aria-label="إغلاق البحث">✕</button></header><label for="studio-search-input">ابحثي عن درس أو إشارة أو سؤال أو ملاحظة</label><input id="studio-search-input" type="search" placeholder="مثال: النقطة العمياء، أولوية، قف…" autocomplete="off" aria-controls="studio-search-results"/><div id="studio-search-results" role="region" aria-live="polite"></div><footer>اختصار البحث: Ctrl + K · إغلاق: Esc</footer></div></section>`;}
let currentContext=null;
function normalize(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim()}
function searchItems(course,state){
 const list=[];
 for(const l of course.lessons||[])list.push({type:'درس',title:l.title,description:l.study_content?.goal||'',href:'#/lesson/'+l.order,keywords:[l.study_content?.introduction,...(l.study_content?.key_points||[])]});
 for(const s of course.sign_library||[])list.push({type:'إشارة',title:s.title,description:s.meaning||'',href:'#/traffic-signs',keywords:[s.action,s.category]});
 for(const q of course.questions||[])list.push({type:'سؤال',title:q.question||'',description:q.rationale||'',href:'#/lesson/'+Number((course.lessons||[]).find(l=>l.id===q.lesson_id)?.order||1),keywords:q.options||[]});
 for(const [n,note] of Object.entries(state.notes||{}))if(String(note||'').trim())list.push({type:'ملاحظة',title:'ملاحظتي في الدرس '+n,description:note,href:'#/lesson/'+n});
 for(const m of course.media_resources||[])if(m.kind==='youtube_video')list.push({type:'فيديو',title:m.title,description:m.provider||'',href:'#/videos'});
 return list;
}
function results(course,state,query){
 const input=normalize(query),container=document.getElementById('studio-search-results');if(!container)return;
 if(input.length<2){container.innerHTML='<p class="studio-no-results">اكتبي حرفين على الأقل للبحث داخل مِسار.</p>';return}
 const words=input.split(' ').filter(Boolean);
 const matches=searchItems(course,state).map(item=>{const title=normalize(item.title),other=normalize([item.description,...(item.keywords||[])].join(' '));const score=words.every(w=>title.includes(w)||other.includes(w))?(words.reduce((a,w)=>a+(title.includes(w)?3:1),0)):0;return {...item,score}}).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,18);
 container.innerHTML=matches.length?matches.map(x=>`<a class="studio-result" href="${x.href}"><span class="studio-result-type">${escapeHTML(x.type)}</span><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.description).slice(0,170)}</small></a>`).join(''):'<p class="studio-no-results">ما لقينا نتيجة مطابقة. جربي كلمة أقصر أو مرادفًا مختلفًا.</p>';
}
function openSearch(ctx){
 currentContext=ctx;
 const overlay=document.getElementById('studio-search-overlay');if(!overlay)return;
 overlay.hidden=false;document.body.classList.add('studio-search-open');
 const input=document.getElementById('studio-search-input');if(input){input.value='';results(ctx.course,ctx.state,'');input.focus();}
}
function closeSearch(){const o=document.getElementById('studio-search-overlay');if(o)o.hidden=true;document.body.classList.remove('studio-search-open');}
function click(action,el,ctx){
 if(action==='studio-search'){openSearch(ctx);return true}
 if(action==='studio-search-close'){closeSearch();return true}
 if(action==='studio-jump'){const node=document.getElementById(el.dataset.target);if(node)node.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});return true}
 if(!action.startsWith('studio-'))return false;
 if(action==='studio-diagnostic'){const q=(ctx.course.questions||[]).find(q=>q.id===el.dataset.question);const choice=Number(el.dataset.choice);if(!q||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return true;const d=ensure(ctx.state);d.diagnostics=d.diagnostics||{};if(d.diagnostics[q.id])return true;d.diagnostics[q.id]={choice,at:new Date().toISOString()};ctx.save();ctx.render(true);return true;}
 const studio=ensure(ctx.state),t=studio.timer;
 if(action==='studio-duration'){const n=Number(el.dataset.min);if(![15,25,30,45].includes(n))return true;t.duration=n;t.remaining=n*60;t.status='idle';t.endsAt=null}
 else if(action==='studio-reset'){t.status='idle';t.endsAt=null;t.remaining=t.duration*60}
 else if(action==='studio-toggle'){
  if(t.status==='running'){t.remaining=remain(t);t.status='paused';t.endsAt=null}
  else {if(t.status==='finished'||t.status==='idle')t.remaining=t.duration*60;t.endsAt=now()+t.remaining*1000;t.status='running'}
 }else return false;
 ctx.save();ctx.render(true);
 return true;
}
function tick(state,save,render,toast){
 const t=ensure(state).timer;
 if(t.status!=='running')return;
 const left=remain(t),progress=100-left/(Math.max(t.duration,1)*60)*100;
 document.querySelectorAll('[data-studio-time]').forEach(el=>{el.textContent=fmt(left)});
 document.querySelectorAll('.studio-timer-controls').forEach(el=>el.style.setProperty('--studio-progress',Math.max(0,Math.min(100,progress))+'%'));
 if(left===0){
  t.status='finished';t.endsAt=null;t.remaining=0;
  const info=ensure(state);info.sessions.push({at:new Date().toISOString(),minutes:t.duration});info.sessions=info.sessions.slice(-100);
  save();render(true);toast('انتهت جلسة المذاكرة. تقدرين تكمّلين أو تاخذين استراحة.');
 }
}
function initialize(state,save){
 const studio=ensure(state);const prior=studio.lastVisitAt;
 if(prior&&now()-Date.parse(prior)>6*86400000){studio.returnSince=prior}
 studio.lastVisitAt=new Date().toISOString();save();
}
document.addEventListener('input',e=>{
 if(e.target?.id==='studio-search-input'&&currentContext)results(currentContext.course,currentContext.state,e.target.value);
});
window.addEventListener('scroll',()=>{document.body?.classList?.toggle?.('studio-scrolled',(window.scrollY||0)>380)},{passive:true});
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();const btn=document.querySelector('[data-action="studio-search"]');btn?.click()}
 if(e.key==='Escape')closeSearch();
});
document.addEventListener('click',e=>{if(e.target?.id==='studio-search-overlay')closeSearch();if(e.target.closest?.('.studio-result'))closeSearch()});
window.MasarStudio={timerHTML,widgets,searchUI,click,tick,initialize};
})();
