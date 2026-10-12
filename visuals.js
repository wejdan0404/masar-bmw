/* MASAR BMW | Original illustrative SVG diagrams, not operational driving instructions. */
(function(){
'use strict';
function e(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function car(x,y,color,label,angle){return '<g transform="translate('+x+' '+y+') rotate('+(angle||0)+')"><rect x="-22" y="-13" width="44" height="26" rx="9" fill="'+color+'" stroke="#f5f7f8" stroke-width="2"/><rect x="-8" y="-10" width="15" height="20" rx="4" fill="#c5dce9"/><path d="M14 -9v18" stroke="#f5e7cb" stroke-width="3"/><text x="0" y="29" text-anchor="middle" font-size="11" fill="#f7f8f9">'+e(label)+'</text></g>'}
function svg(x,label){return '<svg viewBox="0 0 560 300" role="img" aria-label="'+e(label)+'" xmlns="http://www.w3.org/2000/svg" class="scenario-svg"><rect width="560" height="300" rx="18" fill="#202D36"/><defs><marker id="vis-tip" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#f7e6b8" stroke-width="1.6"/></marker></defs>'+x+'</svg>'}
function text(x,y,t,sz){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="'+(sz||14)+'" font-weight="600" fill="#eaf0f4">'+e(t)+'</text>'}
function roadLines(){return '<path d="M26 42H534M26 255H534" stroke="#9eb4c1" stroke-width="3"/>'}
function roundabout(k){
 var a='<path d="M0 104H560V196H0ZM226 0H334V300H226Z" fill="#344b59"/><circle cx="280" cy="150" r="104" fill="#485e6b"/><circle cx="280" cy="150" r="67" fill="#202D36" stroke="#a8c1d1" stroke-width="2" stroke-dasharray="7 8"/><circle cx="280" cy="150" r="37" fill="#5a7666"/>'+text(280,155,'جزيرة الدوار',12);
 a+=k!==2?car(k===0?355:315,75,'#75a8cd','داخل الدوار',55):'';
 a+=car(k===2?399:452,175,'#a71935','أنتِ',0)+text(455,241,k===2?'بعد توافر فجوة آمنة':'راقبي الداخل وأعطي الأفضلية',12);
 return svg(a,'مركبة على مدخل الدوار تنتظر المركبات التي تسير داخله في الحالة العادية');
}
function lanes(k){
 var a='<rect x="20" y="40" width="520" height="214" rx="15" fill="#405766"/><path d="M30 109H530M30 181H530" stroke="#e0eaf0" stroke-width="3" stroke-dasharray="23 14"/>'+roadLines();
 a+=car(405,148,'#739fc2','في المسار')+car(k===3?305:170,219,'#a61932','أنتِ');
 if(k===2)a+='<path d="M190 205L355 103" stroke="#f7e6b8" stroke-width="3" stroke-dasharray="7 8"/>';
 if(k===3)a+='<path d="M190 210Q240 190 300 157" stroke="#f7e6b8" stroke-width="3" fill="none" marker-end="url(#vis-tip)"/>';
 a+=text(280,28,['افحصي المرايا','استخدمي الإشارة','افحصي النقطة العمياء','انتقلي فقط إذا كان آمنًا'][k],14);
 return svg(a,'سيارتان في مسارين متجاورين وتوضيح فحص السلامة قبل الانتقال');
}
function follow(k){
 var a='<rect x="18" y="85" width="524" height="140" rx="13" fill="#415968"/><path d="M25 160H535" stroke="#d2e5ee" stroke-width="2.5" stroke-dasharray="20 18"/>'+roadLines();
 var x=[234,158,80][k];
 a+=car(427,123,'#7baac5','أمامية')+car(x,123,'#ad1a35','أنتِ')+'<path d="M'+(x+30)+' 172H399" stroke="#f7e6b8" stroke-width="2.5" stroke-dasharray="7 9"/>';
 a+=text((x+399)/2,195,['فاصل قصير','فاصل تعليمي أولي','فاصل أكبر للظروف الصعبة'][k],13);
 a+=text(280,49,['لا تقتربي أكثر من اللازم','قيسي الزمن بعلامة ثابتة','في المطر والضباب زيدي المسافة'][k],15);
 return svg(a,'الفرق بين ثلاثة فواصل تعليمية للسيارة الأمامية مع زيادة المسافة في الظروف الصعبة');
}
function intersection(k){
 var a='<rect x="0" y="104" width="560" height="92" fill="#435a68"/><rect x="229" y="0" width="102" height="300" fill="#435a68"/><path d="M0 150H226M334 150H560M280 0V104M280 195V300" stroke="#d2e4ec" stroke-width="2" stroke-dasharray="14 11"/><path d="M230 202H330" stroke="#f6e7c2" stroke-width="4"/>';
 a+=k===2?'':car(k===0?121:335,122,'#7cb5d3','رئيسي');
 a+=car(280,k===2?159:252,'#a81a36','أنتِ',90)+text(455,249,['اقتربي وأعطي الأفضلية','انتظري المركبات المارة','تحركي بعد التحقق من الأمان'][k],13);
 return svg(a,'رسم مفاهيمي لطريق رئيسي وطريق فرعي عند تقاطع غير منظم خلافًا لذلك');
}
function parking(k){
 var a='<rect x="18" y="166" width="524" height="111" rx="11" fill="#3f5765"/><path d="M25 225H535" stroke="#98afbd" stroke-width="2" stroke-dasharray="12 12"/>';
 for(var i=0;i<4;i++)a+='<rect x="'+(44+i*118)+'" y="26" width="109" height="132" fill="'+(i===1?'#375d6a':'#465f6e')+'" stroke="#b4c7d3" stroke-width="2"/>';
 a+=car(k===0?332:217,k===0?213:k===1?190:100,'#ac1835','أنتِ',k===0?0:90);
 if(k===1)a+='<path d="M260 206Q285 159 217 116" fill="none" stroke="#f5e7bd" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#vis-tip)"/>';
 a+=text(410,250,['اختاري مساحة مناسبة','راجعي الخلف وتأرجح المقدمة','تحققي من حدود الموقف'][k],13);
 return svg(a,'موقف عمودي مبسط، لا يحدد نقاط المقود أو المناورة العملية');
}
function markings(k){
 var a='<rect x="20" y="39" width="520" height="216" rx="13" fill="#435a69"/>'+roadLines()+'<path d="M25 110H535" stroke="#dbe6ee" stroke-width="4" '+(k===0?'stroke-dasharray="26 17"':'')+'/>';
 a+=car(178,73,'#aa1937','أنتِ')+car(365,154,'#81a7c2','أخرى')+text(280,227,k===0?'متقطع: لا يكفي وحده للسماح الآمن':'متصل: انتبهي لمنع عبوره',14);
 return svg(a,'الخط المتصل والخط المتقطع في مسار افتراضي');
}
function render(item,step){var list={roundabout:roundabout,lanes:lanes,follow:follow,intersection:intersection,parking:parking,markings:markings};var fn=list[item.type],k=Math.max(0,Math.min((item.steps||[]).length-1,Number(step)||0));return fn?fn(k):''}
window.MasarVisuals=Object.freeze({render:render});
})();