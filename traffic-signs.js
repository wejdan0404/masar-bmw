/* MASAR BMW · original simplified SVG traffic sign illustrations, no external dependency.
 * NOT exact official traffic-sign artwork. Compare with Saudi Traffic Department guide.
 */
(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const red='#cf1726',blue='#2362a0',ink='#14222c';
let mode='study',filter='all',selected=null,quizIndex=0,answered=null,answeredSignId=null;
const P=(d,attrs='')=>'<path d="'+d+'" '+attrs+'/>';
function pictogram(k){
 const stroke='stroke="'+ink+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
 const stem=(direction)=>P(direction==='left'?'M93 42L61 72L93 102':'M61 42L93 72L61 102',stroke);
 switch(k){
 case 'stop':return '<text x="75" y="78" text-anchor="middle" font-weight="900" font-size="26" fill="white" style="font-family:Tahoma,Arial">قف</text>';
 case 'yield':return '';
 case 'no-entry':return '<rect x="34" y="65" width="82" height="17" rx="3" fill="white"/>';
 case 'speed60':return '<text x="75" y="91" text-anchor="middle" font-family="Arial" font-size="53" fill="'+ink+'">60</text>';
 case 'no-uturn':return P('M97 106V55C97 30 58 30 58 55V93',stroke)+P('M40 75L58 95L76 75',stroke);
 case 'no-left':return P('M95 104V69Q95 51 71 51H46M46 51L65 35M46 51L65 66',stroke);
 case 'no-right':return P('M51 104V69Q51 51 75 51H100M100 51L81 35M100 51L81 66',stroke);
 case 'no-overtake':return '<rect x="38" y="61" width="39" height="26" rx="5" fill="'+ink+'"/><rect x="80" y="61" width="30" height="26" rx="5" fill="'+red+'" opacity=".8"/><rect x="47" y="52" width="22" height="10" fill="'+ink+'"/><rect x="86" y="54" width="18" height="8" fill="'+red+'"/>';
 case 'no-parking':return P('M33 26L117 111','stroke="'+red+'" stroke-width="10" fill="none"');
 case 'no-stopping':return P('M33 26L117 111M117 26L33 111','stroke="'+red+'" stroke-width="9" fill="none"');
 case 'mandatory-right':return P('M35 75H110M89 53L111 75L89 97','stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"');
 case 'mandatory-straight':return P('M75 110V28M51 51L75 26L99 51','stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"');
 case 'mark-solid':return '<rect x="69" y="25" width="12" height="103" rx="4" fill="white"/>';
 case 'mark-dashed':return [27,60,93].map(y=>'<rect x="69" y="'+y+'" width="12" height="22" rx="2" fill="white"/>').join('');
 case 'mark-stop':return '<rect x="20" y="82" width="110" height="13" fill="white"/>';
 case 'mark-crosswalk':return [30,52,74,96].map(x=>'<rect x="'+x+'" y="32" width="14" height="88" fill="white"/>').join('');
 case 'temp-workers':return '<circle cx="75" cy="56" r="10" fill="'+ink+'"/>'+P('M75 67L75 99M75 78L48 90M75 78L101 88M75 99L57 119M75 99L95 119',stroke);
 case 'temp-narrow':return P('M46 50L67 113M104 50L83 113',stroke);
 case 'temp-detour':return P('M37 97H78V59H109M92 43L110 59L92 75',stroke);
 case 'temp-barrier':return '<rect x="30" y="64" width="90" height="41" rx="3" fill="#fff" stroke="'+ink+'" stroke-width="4"/>'+[35,65,95].map(x=>P('M'+x+' 103L'+(x+24)+' 65','stroke="'+red+'" stroke-width="9"')).join('');
 case 'guide-hospital':return '<rect x="58" y="40" width="34" height="72" rx="3" fill="#fff"/><rect x="39" y="59" width="72" height="34" rx="3" fill="#fff"/><text x="75" y="90" text-anchor="middle" font-size="42" font-weight="900" fill="'+blue+'">H</text>';
 case 'guide-fuel':return '<rect x="45" y="48" width="49" height="63" rx="5" fill="#fff"/><rect x="52" y="56" width="35" height="26" fill="'+blue+'"/>'+P('M93 63Q117 65 109 89V109','stroke="white" stroke-width="7" fill="none"');
 case 'guide-airport':return '<text x="75" y="96" text-anchor="middle" font-size="72" fill="white">✈</text>';
 case 'guide-parking':return '<text x="75" y="103" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="88" fill="white">P</text>';
 case 'warn-signal':return '<rect x="65" y="40" width="23" height="73" rx="6" fill="'+ink+'"/>'+[0,1,2].map((v)=>'<circle cx="76.5" cy="'+(52+v*24)+'" r="8" fill="'+['#ed353e','#ffc22d','#259c55'][v]+'"/>').join('');
 case 'warn-roundabout':return '<circle cx="75" cy="82" r="27" stroke="'+ink+'" stroke-width="6" fill="none" stroke-dasharray="32 10"/>'+P('M50 59L42 70L60 70M98 100L111 98L102 84',stroke);
 case 'warn-cross':return P('M75 38V112M40 79H110',stroke);
 case 'warn-side-right':return P('M64 35V110M64 70H101',stroke);
 case 'warn-side-left':return P('M88 35V110M88 70H51',stroke);
 case 'warn-pedestrians':return '<circle cx="76" cy="47" r="8" fill="'+ink+'"/>'+P('M73 60L65 82L87 96M67 81L46 97M72 63L96 69M87 95L99 112',stroke);
 case 'warn-children':return '<circle cx="58" cy="53" r="7" fill="'+ink+'"/><circle cx="89" cy="61" r="6" fill="'+ink+'"/>'+P('M58 65L47 89M58 66L78 80M47 90L36 109M47 90L60 112M89 70L77 93M90 74L103 88M78 94L72 113M78 94L95 112',stroke);
 case 'warn-animals':return '<ellipse cx="72" cy="82" rx="37" ry="15" fill="'+ink+'"/><circle cx="106" cy="66" r="13" fill="'+ink+'"/>'+P('M48 93V116M89 94V116M98 60L102 45M113 61L122 48',stroke);
 case 'warn-bump':return P('M35 108H52Q58 67 75 67Q92 67 98 108H115',stroke);
 case 'warn-slippery':return '<rect x="52" y="64" width="48" height="27" rx="8" fill="'+ink+'"/>'+P('M54 92Q43 108 54 116M72 94Q62 107 77 113M89 93Q110 104 101 115','stroke="'+ink+'" stroke-width="4" stroke-dasharray="7 8" fill="none"');
 case 'warn-narrow':return P('M40 49L59 110M110 49L91 110',stroke);
 case 'warn-airplane':return P('M75 35L85 71L119 84V95L85 91L82 113L92 121V127L75 120L58 127V121L68 113L65 91L31 95V84L65 71Z','fill="'+ink+'" stroke="'+ink+'" stroke-width="2"');
 default:return '<text x="75" y="85" text-anchor="middle" font-size="55" font-weight="700" fill="'+ink+'">؟</text>';
 }
}
function draw(sign,quiz=false){
 const k=sign.icon;let frame='',pattern='';
 if(k==='stop')frame='<path d="M45 8H105L142 45V105L105 142H45L8 105V45Z" fill="'+red+'" stroke="#fdfdfd" stroke-width="3"/>';
 else if(k==='yield')frame='<path d="M75 138L8 12H142Z" fill="#fefefe" stroke="'+red+'" stroke-width="13" stroke-linejoin="round"/>';
 else if(k.startsWith('warn-'))frame='<path d="M75 6L145 135H5Z" fill="white" stroke="'+red+'" stroke-width="11" stroke-linejoin="round"/>';
 else if(k==='mandatory-right'||k==='mandatory-straight')frame='<circle cx="75" cy="75" r="65" fill="'+blue+'" stroke="#fff" stroke-width="3"/>';
 else if(k.startsWith('mark-'))frame='<rect x="5" y="5" width="140" height="140" rx="14" fill="#3c4850" stroke="#fff" stroke-width="3"/>';
 else if(k.startsWith('temp-'))frame='<path d="M75 6L145 135H5Z" fill="#f9d44c" stroke="'+red+'" stroke-width="11" stroke-linejoin="round"/>';
 else if(k.startsWith('guide-'))frame='<rect x="8" y="8" width="134" height="134" rx="13" fill="'+blue+'" stroke="#fff" stroke-width="3"/>';
 else if(k==='no-entry')frame='<circle cx="75" cy="75" r="65" fill="'+red+'" stroke="#fff" stroke-width="3"/>';
 else if(k==='no-parking'||k==='no-stopping')frame='<circle cx="75" cy="75" r="61" fill="'+blue+'" stroke="'+red+'" stroke-width="12"/>';
 else frame='<circle cx="75" cy="75" r="62" fill="white" stroke="'+red+'" stroke-width="11"/>';
 const cross=['no-uturn','no-left','no-right','no-overtake'].includes(k)?P('M27 27L123 123','stroke="'+red+'" stroke-width="10" fill="none"'):'';
 const title=quiz?'رسم مبسط للوحة — اختاري معناها':sign.title+' — رسم مبسط للتدريب وليس نسخة رسمية';
 return '<svg viewBox="0 0 150 150" class="ts-sign-svg" role="img" aria-label="'+esc(title)+'" xmlns="http://www.w3.org/2000/svg">'+frame+pictogram(k)+cross+'</svg>';
}
const stat=(state,id)=>state.signPractice?.[id]||{attempts:0,correct:0,wrong:0,lastResult:null};
function choices(sign,signs){
 const sameCategory=signs.filter(x=>x.category===sign.category&&x.id!==sign.id);
 const others=signs.filter(x=>x.category!==sign.category&&x.id!==sign.id);
 const pool=[...sameCategory,...others];
 const idx=Number(sign.id.replace(/\D/g,''))||0;
 const distractors=pool.length?Array.from({length:Math.min(2,pool.length)},(_,i)=>pool[(idx*3+i)%pool.length]):[];
 const opts=[sign,...distractors];
 const rot=idx%opts.length;return opts.slice(rot).concat(opts.slice(0,rot));
}
function filtered(course,state){
 let signs=course.sign_library||[];
 if(filter!=='all'&&filter!=='mistakes'&&filter!=='new')signs=signs.filter(x=>x.category===filter);
 else if(filter==='mistakes')signs=signs.filter(x=>(stat(state,x.id).wrong||0)>0&&(stat(state,x.id).lastResult===false));
 else if(filter==='new')signs=signs.filter(x=>stat(state,x.id).attempts===0);
 return signs;
}
function page(course,state){
 const signs=course.sign_library||[],items=filtered(course,state);const attempts=signs.reduce((n,x)=>n+stat(state,x.id).attempts,0),wrong=signs.filter(x=>stat(state,x.id).lastResult===false).length,studied=signs.filter(x=>stat(state,x.id).attempts>0).length;
 let body='';
 if(mode==='study'){
  if(selected){const a=signs.find(x=>x.id===selected);body=a?'<section class="ts-detail"><button class="ts-return" type="button" data-action="sign-back">← جميع اللوحات</button><div class="ts-detail-grid"><div class="ts-icon-panel">'+draw(a)+'</div><div><span class="ts-overline">'+esc(a.category)+' / بطاقة '+a.id+'</span><h2>'+esc(a.title)+'</h2><h3>وش تعني؟</h3><p>'+esc(a.meaning)+'</p><h3>وش أسوي إذا شفتها؟</h3><p>'+esc(a.action)+'</p><h3>لا تخلطين بينها وبين…</h3><p>'+esc(a.memory_tip)+'</p><a class="ts-link" href="#/lesson/'+Number(a.lesson_ids[0].slice(-3))+'">راجعي درسها في المنهج ←</a></div></div></section>':'';
  }else body='<div class="ts-grid">'+items.map(a=>'<button type="button" class="ts-card" data-action="sign-open" data-id="'+a.id+'"><span class="ts-art">'+draw(a)+'</span><span class="ts-category">'+esc(a.category)+' · '+(stat(state,a.id).attempts?'تمت مراجعتها':'جديدة')+'</span><strong>'+esc(a.title)+'</strong><span class="ts-card-arrow">المعنى والتصرف ←</span></button>').join('')+'</div>';
 }else {
  if(quizIndex>=items.length)quizIndex=0;
  const q=answered!==null&&answeredSignId?signs.find(x=>x.id===answeredSignId):items[quizIndex];if(!q)body='<div class="ts-empty">ما عندك لوحات بهذه الحالة حاليًا. اختاري «الكل» وكمّلي المراجعة.</div>';
  else{const opts=choices(q,signs),wasAnswered=answered!==null;
   body='<section class="ts-exam"><div class="ts-exam-top"><span>لوحة '+(quizIndex+1)+' / '+items.length+'</span><span>الإجابة لا تُظهر الاسم قبل اختيارك</span></div><div class="ts-exam-art">'+draw(q,true)+'</div><h2>وش معنى هذه اللوحة؟</h2><div class="ts-choices">'+opts.map(x=>'<button type="button" data-action="sign-answer" data-choice="'+x.id+'" class="ts-choice '+(wasAnswered?(x.id===q.id?'is-correct':x.id===answered?'is-wrong':''):'')+'" '+(wasAnswered?'disabled':'')+'>'+esc(x.title)+'</button>').join('')+'</div>'+(wasAnswered?'<div role="status" class="ts-explanation"><strong>'+(answered===q.id?'صح!':'الإجابة المناسبة: '+esc(q.title))+'</strong><p>'+esc(q.meaning)+'</p><p><b>التصرف:</b> '+esc(q.action)+'</p><a href="#/lesson/'+Number(q.lesson_ids[0].slice(-3))+'">ارجعي للدرس المرتبط ←</a></div>':'')+'<div class="ts-controls"><button data-action="sign-next" class="ts-next" type="button">'+(quizIndex===items.length-1?'إعادة الجولة':'اللوحة التالية ←')+'</button></div></section>';
  }
 }
 return '<div class="ts-page"><section class="ts-header"><div><span class="ts-overline">TRAFFIC SIGNS / تَعَلُّم بِالصُّورَة</span><h1>إشارات المرور</h1><p>تعرّفي على اللوحة، افهمي معناها، ثم اختبري نفسك بصورتها وحدها. الرسومات مبسّطة للتدريب، <strong>وليست صورًا رسمية مطابقة</strong>.</p></div><div class="ts-header-counter"><b>'+studied+'<small> / '+signs.length+'</small></b><span>لوحة دخلت مراجعتك</span></div></section><div class="ts-facts"><span>'+signs.length+' لوحة تعليمية · '+esc([...new Set(signs.map(x=>x.category))].join('، '))+'</span><span>الإجابات المسجلة: '+attempts+'</span><span>تحتاج مراجعة: '+wrong+'</span></div><div class="ts-toolbar"><div role="group" aria-label="طريقة المذاكرة"><button type="button" data-action="sign-mode" data-mode="study" aria-pressed="'+(mode==='study')+'" class="'+(mode==='study'?'active':'')+'">مكتبة اللوحات</button><button type="button" data-action="sign-mode" data-mode="quiz" aria-pressed="'+(mode==='quiz')+'" class="'+(mode==='quiz'?'active':'')+'">اختبري نفسك</button></div><div class="ts-filters" role="group" aria-label="تصفية الإشارات">'+[['all','الكل'],...[...new Set(signs.map(x=>x.category))].map(c=>[c,c]),['mistakes','أخطائي'],['new','الجديدة']].map(([id,txt])=>'<button type="button" data-action="sign-filter" data-filter="'+id+'" aria-pressed="'+(filter===id)+'" class="'+(filter===id?'active':'')+'">'+txt+'</button>').join('')+'</div></div>'+body+'<section class="ts-note"><strong>مهم قبل الاختبار</strong><p>المرور السعودي يضم أيضًا الإرشادية والمؤقتة؛ هذه مكتبة بداية ولا تغطي كل اللوحات. لم ننتهِ من مطابقة تفاصيل رسوماتها مع الرسم الحكومي الرسمي. عند اختلاف الشكل أو الاسم، اعتمدي مرجع المرور.</p><a href="https://www.moi.gov.sa/wps/portal/Home/sectors/publicsecurity/traffic/" target="_blank" rel="noopener noreferrer">دليل الإشارات المرورية — المرور السعودي ↗</a></section></div>';
}
function click(action,el,ctx){
 const c=ctx.course,s=ctx.state;
 if(action==='sign-mode'){mode=el.dataset.mode==='quiz'?'quiz':'study';selected=null;answered=null;answeredSignId=null;quizIndex=0;ctx.render(true);return true}
 if(action==='sign-filter'){filter=el.dataset.filter||'all';selected=null;answered=null;answeredSignId=null;quizIndex=0;ctx.render(true);return true}
 if(action==='sign-open'){if(c.sign_library.some(x=>x.id===el.dataset.id)){selected=el.dataset.id;ctx.render(true)}return true}
 if(action==='sign-back'){selected=null;ctx.render(true);return true}
 if(action==='sign-answer'){const items=filtered(c,s),q=items[quizIndex],choice=el.dataset.choice;if(!q||answered!==null||!choices(q,c.sign_library).some(x=>x.id===choice))return true;
  s.signPractice=s.signPractice||{};const prior=stat(s,q.id);
  s.signPractice[q.id]={attempts:(prior.attempts||0)+1,correct:(prior.correct||0)+(choice===q.id?1:0),wrong:(prior.wrong||0)+(choice===q.id?0:1),lastResult:choice===q.id,lastReviewed:new Date().toISOString()};
  answered=choice;answeredSignId=q.id;window.MasarCoach?.record(s,'sign',q.id,choice===q.id);ctx.save();ctx.render(true);return true}
 if(action==='sign-next'){quizIndex++;answered=null;answeredSignId=null;ctx.render(true);return true}
 return false;
}
window.MasarSigns=Object.freeze({page,draw,click});
})();