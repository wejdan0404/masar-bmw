/*
 * MASAR BMW — IndexedDB offline storage.
 * Structured on-device database (NOT a remote sync service).
 * Educational content comes from the versioned, read-only course.json.
 */
(() => {
  'use strict';
  const DATABASE_NAME = 'masar-bmw-study';
  const DATABASE_VERSION = 7;
  const referenceStores = ['weeks', 'lessons', 'questions', 'sources', 'learning_visuals', 'media_resources', 'personal_documents', 'uploaded_image_index', 'external_study_sources', 'review_questions', 'practical_checklist', 'review_claims', 'lesson_reading_map', 'sign_library', 'lesson_activities'];
  const userStores = ['progress', 'answers', 'notes', 'bookmarks', 'attempts', 'visits', 'preferences'];
  const allStores = [...referenceStores, ...userStores, 'personal_files', 'metadata'];
  let dbPromise;
  let writeQueue = Promise.resolve();

  function connect() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const create = (name, keyPath, indexes = []) => {
          if (db.objectStoreNames.contains(name)) return;
          const store = db.createObjectStore(name, { keyPath });
          indexes.forEach(([field, unique]) => store.createIndex(field, field, { unique: !!unique }));
        };
        create('weeks', 'id', [['number', true]]);
        create('lessons', 'id', [['week_id', false], ['order', true]]);
        create('questions', 'id', [['lesson_id', true]]);
        create('sources', 'id');
        create('learning_visuals', 'id');
        create('media_resources', 'id');
        create('personal_documents', 'id');
        create('uploaded_image_index', 'id');
        create('external_study_sources', 'id');
        create('review_questions', 'id');
        create('practical_checklist', 'id');
        create('review_claims', 'id');
        create('lesson_reading_map', 'id');
        create('sign_library', 'id');
        create('lesson_activities', 'id');
        create('personal_files', 'id');
        create('metadata', 'key');
        create('progress', 'lesson_id');
        create('answers', 'question_id');
        create('notes', 'lesson_id');
        create('bookmarks', 'lesson_id');
        create('attempts', 'id');
        create('visits', 'lesson_id');
        create('preferences', 'key');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); dbPromise = undefined; };
        resolve(db);
      };
      request.onerror = () => { dbPromise = undefined; reject(request.error); };
      request.onblocked = () => { dbPromise = undefined; reject(new Error('إغلاق تبويبات مِسار الأخرى مطلوب قبل ترقية قاعدة البيانات')); };
    });
    return dbPromise;
  }

  function completed(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'));
      tx.onerror = () => reject(tx.error || new Error('Database transaction failed'));
    });
  }
  function getAll(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Avoid clearing and rewriting every course record at each visit.
  function courseFingerprint(course) {
    const value=JSON.stringify(course);
    let hash=2166136261;
    for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
    return value.length.toString(36)+'-'+(hash>>>0).toString(36);
  }
  async function seedReference(course) {
    const db=await connect();
    const revision=courseFingerprint(course);
    const saved=await new Promise((resolve,reject)=>{
      const req=db.transaction('metadata','readonly').objectStore('metadata').get('courseRevision');
      req.onsuccess=()=>resolve(req.result?.value);
      req.onerror=()=>reject(req.error);
    });
    if(saved===revision)return {unchanged:true,revision};
    const tx=db.transaction([...referenceStores,'metadata'],'readwrite');
    for(const name of referenceStores){
      const store=tx.objectStore(name);
      store.clear();
      for(const item of course[name]||[])store.put(item);
    }
    tx.objectStore('metadata').put({key:'courseRevision',value:revision});
    await completed(tx);
    return {unchanged:false,revision};
  }

  async function loadUser() {
    const db = await connect();
    const tx = db.transaction(userStores, 'readonly');
    const results = await Promise.all(userStores.map(n => getAll(tx.objectStore(n))));
    await completed(tx);
    const [progress, answers, notes, bookmarks, attempts, visits, preferences] = results;
    const prefs = Object.fromEntries(preferences.map(item => [item.key, item.value]));
    if (!prefs.initialized) return null;
    return {
      done: progress.filter(x => x.completed).map(x => x.lesson_id),
      answers: Object.fromEntries(answers.map(x => [x.question_id, x.option_index])),
      notes: Object.fromEntries(notes.map(x => [x.lesson_id, x.body])),
      bookmarks: bookmarks.map(x => x.lesson_id),
      history: attempts.sort((a,b) => a.id-b.id).map(({id, ...attempt}) => attempt),
      visited: visits.map(x => x.lesson_id),
      lastOpened: prefs.lastOpened || 1,
      readingPositions: prefs.readingPositions || {},
      videoNotes: prefs.videoNotes || {},
      sourceNotes: prefs.sourceNotes || {},
      practiceChecks: prefs.practiceChecks || {},
      reviewAnswers: prefs.reviewAnswers || {},
      signPractice: prefs.signPractice || {},
      activityNotes: prefs.activityNotes || {},
      activityChecks: prefs.activityChecks || {},
      reviewHistory: prefs.reviewHistory || {},
      mockSession: prefs.mockSession || null,
      mockHistory: prefs.mockHistory || []
    };
  }

  async function doSave(snapshot) {
    const db = await connect();
    const tx = db.transaction(userStores, 'readwrite');
    for (const name of userStores) tx.objectStore(name).clear();
    for (const lesson_id of snapshot.done || []) tx.objectStore('progress').put({lesson_id: Number(lesson_id), completed: true});
    for (const [question_id, option_index] of Object.entries(snapshot.answers || {}))
      tx.objectStore('answers').put({question_id, option_index: Number(option_index)});
    for (const [lesson_id, body] of Object.entries(snapshot.notes || {}))
      if (body) tx.objectStore('notes').put({lesson_id: Number(lesson_id), body: String(body)});
    for (const lesson_id of snapshot.bookmarks || []) tx.objectStore('bookmarks').put({lesson_id: Number(lesson_id)});
    (snapshot.history || []).forEach((entry,id) => tx.objectStore('attempts').put({id, ...entry}));
    for (const lesson_id of snapshot.visited || []) tx.objectStore('visits').put({lesson_id: Number(lesson_id)});
    tx.objectStore('preferences').put({key: 'initialized', value: true});
    tx.objectStore('preferences').put({key: 'lastOpened', value: Number(snapshot.lastOpened) || 1});
    tx.objectStore('preferences').put({key: 'readingPositions', value: snapshot.readingPositions || {}});
    for (const key of ['videoNotes','sourceNotes','practiceChecks','reviewAnswers','signPractice','activityNotes','activityChecks','reviewHistory','mockSession','mockHistory']) tx.objectStore('preferences').put({key, value: snapshot[key] ?? (key==='mockHistory'?[]:key==='mockSession'?null:{})});
    await completed(tx);
  }

  function saveUser(snapshot) {
    // Snapshot eagerly; subsequent UI mutations must not alter an in-flight transaction.
    const copied = JSON.parse(JSON.stringify(snapshot));
    writeQueue = writeQueue.catch(() => {}).then(() => doSave(copied));
    return writeQueue;
  }

  async function savePersonalFile(id, file) {
    if (!id || typeof id !== 'string' || !file) throw new Error('Invalid file');
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    const mimeByExtension = {pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
    const mime = mimeByExtension[extension];
    // Windows or file browsers may omit MIME even for a valid PDF. Require a safe extension.
    if (!mime || (file.type && file.type !== mime) || file.size > 80*1024*1024) throw new Error('Unsupported or oversized file');
    const db = await connect();
    const tx = db.transaction(['personal_files'], 'readwrite');
    tx.objectStore('personal_files').put({id, filename:file.name, mime, size:file.size, updatedAt:new Date().toISOString(), blob:file});
    await completed(tx);
  }
  async function getPersonalFile(id) {
    const db = await connect();
    return new Promise((resolve,reject) => {
      const req = db.transaction('personal_files','readonly').objectStore('personal_files').get(id);
      req.onsuccess=()=>resolve(req.result || null);req.onerror=()=>reject(req.error);
    });
  }
  async function listPersonalFiles() {
    const db = await connect();
    const tx = db.transaction('personal_files','readonly');
    const result = await getAll(tx.objectStore('personal_files'));
    await completed(tx);
    return result.map(({blob,...meta})=>meta);
  }
  async function deletePersonalFile(id) {
    const db = await connect();
    const tx = db.transaction(['personal_files'], 'readwrite');
    tx.objectStore('personal_files').delete(id);
    await completed(tx);
  }
  window.MasarDB = Object.freeze({name: DATABASE_NAME, connect, seedReference, loadUser, saveUser, savePersonalFile, getPersonalFile, listPersonalFiles, deletePersonalFile,
    stores: Object.freeze(allStores.slice())});
})();

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
  return '<article class="source-summary-lesson"><div><span>الدرس '+String(x.lesson.order).padStart(2,'0')+'</span><strong>'+E(x.lesson.title)+'</strong></div>'+(sc.introduction?'<p>'+E(sc.introduction)+'</p>':'')+(pts.length?'<ul>'+pts.map(function(p){return '<li>'+E(p)+'</li>'}).join('')+'</ul>':'')+'<a href="#/lesson/'+x.lesson.order+'">فتح الدرس الكامل ←</a></article>';
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
 return '<div class="eyebrow">PRACTICE BANK / EXAM TRAINING</div><h1 class="page-title">تجميعات وأسئلة المراجعة</h1><p class="sub">بنك أصلي من '+all.length+' سؤالًا تعليميًا مستوحى من موضوعات المصادر، وليس نسخة من أسئلة الامتحان الرسمي. بعد الإجابة يظهر تفسير السبب، وتُحفظ النتيجة على جهازك.</p><div class="hub-metrics"><div><strong>'+answered+' / '+all.length+'</strong><small>أجبتي عنها</small></div><div><strong>'+correct+'</strong><small>إجابات صحيحة</small></div></div><div class="hub-filters">'+topics.map(function(t){return '<button class="hub-filter '+(quizFilter===t[0]?'on':'')+'" data-action="hub-filter" data-topic="'+t[0]+'" aria-pressed="'+(quizFilter===t[0])+'">'+t[1]+'</button>'}).join('')+'</div>'+(q?'<section class="hub-question card"><div class="hub-q-top"><span>سؤال '+(quizIndex+1)+' / '+bank.length+'</span><span>مرجع الفكرة: '+E(sourceLabel(course,q.source_id))+(q.source_pdf_page?' · PDF ص'+q.source_pdf_page:'')+'</span></div><figure class="hub-sign-scene">'+sign(q.visual_key)+'<figcaption>رسم تعليمي من مِسار، وليس صورة أصلية للتجميعات أو لوحة رسمية معتمدة.</figcaption></figure><h2>'+E(q.question)+'</h2><div class="hub-options">'+q.options.map(function(o,i){return '<button type="button" class="hub-choice '+(done?(i===q.correct_option_index?'right':i===a?'wrong':''):'')+'" data-action="hub-answer" data-qid="'+E(q.id)+'" data-answer="'+i+'" '+(done?'disabled':'')+' aria-label="الخيار '+(i+1)+'">'+E(o)+'</button>'}).join('')+'</div>'+(done?'<div class="hub-explain" role="status"><strong>'+(a===q.correct_option_index?'إجابتك صحيحة':'راجعي المعلومة')+'</strong><p>'+E(q.explanation)+'</p></div>':'')+'<div class="hub-q-links"><a class="inline-link" href="#/lesson/'+Number(q.lesson_id.slice(-3))+'">راجعي الدرس المرتبط ←</a>'+(done?'<button type="button" class="btn btn-outline" data-action="hub-retry" data-qid="'+E(q.id)+'">إعادة محاولة السؤال</button>':'')+'</div><label class="hub-source-note">ملاحظتي على السؤال<textarea data-source-note="QUESTION-'+E(q.id)+'" placeholder="ليش اخترت الإجابة؟ وش القاعدة اللي أبي أتذكرها؟">'+E((state.sourceNotes||{})['QUESTION-'+q.id]||'')+'</textarea></label><div class="hub-q-nav"><button type="button" class="btn btn-outline" data-action="hub-prev">السابق</button><button type="button" class="btn btn-primary" data-action="hub-next">التالي ←</button></div><p class="hub-legal">الرسم والأمثلة مبسّطة للمذاكرة، وقد تختلف اللوحات بتفاصيلها. للمراجعة النظامية راجعي دليل الإشارات الصادر عن المرور.</p></section>':'<p>لا توجد أسئلة هنا حاليًا. إذا اخترتِ «أخطائي» فمعناه أنكِ ما عندك إجابات خاطئة محفوظة في بنك المراجعة.</p>')+'<section class="hub-supplement"><h3>الصور والتجميعات</h3><p>كل سؤال في بنك المراجعة صار معه رسم تعليمي واضح. مراجعك الأصلية وفهرس التجميعات موجودة في صفحة المصادر بدون طلب رفع يدوي.</p><a class="btn btn-outline" href="#/sources">مكتبة المصادر والصور</a></section>';
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
  return '<div class="source-topic-row"><a href="#/lesson/'+r.lesson.order+'">'+E(r.lesson.title)+'</a><span>'+E(pg)+'</span><button type="button" data-action="hub-open-page" data-source="'+E(item.id)+'" data-page="'+E(r.start)+'" data-page-end="'+E(r.end||r.start)+'">عرض شرح الموضع</button></div>';
 }).join('');
 return '<div class="source-role"><span>'+E(item.pages)+' صفحة</span><span>'+E(item.publisher||'مرجع إضافي')+'</span><span>'+E(status)+'</span></div><details class="source-topic-index" open><summary>مواضع القراءة في دروس مِسار · '+references.length+'</summary><div class="source-topic-list">'+(linked||'<p>لم تُضف لهذا المرجع إحالات صفحات بعد.</p>')+'</div><small>الربط بالصفحات لا يعني تدقيق الكتاب كاملًا أو صلاحية الأسئلة للاختبار الحالي.</small></details>';
}
function docsPage(course,state){
 var files=(course.personal_documents||[]).concat(course.uploaded_image_index||[]),byKind=(course.external_study_sources||[]);
 var filteredFiles=files.filter(function(item){return sourceFilter==='all'||(sourceFilter==='books'?!!item.pages:!item.pages)});
 var mappedCount=(course.lesson_reading_map||[]).filter(function(row){return (row.resources||[]).length}).length;
 var cards=filteredFiles.map(function(item,i){
  var isBook=!!item.pages,prev=i?!!filteredFiles[i-1].pages:null,header=i===0||prev!==isBook?'<h2 class="hub-library-subtitle">'+(isBook?'الكتب ومراجع القيادة · '+(course.personal_documents||[]).length:'الصور والملصقات المرجعية · '+(course.uploaded_image_index||[]).length)+'</h2>':'';
  return header+'<article class="hub-source card"><div class="flexline"><div><span class="bento-overline">'+(item.pages?E(item.pages)+' صفحة · ':'مرجع بصري · ')+'مستخدم داخل المنهج</span><h3>'+E(item.title)+'</h3></div><span class="chip success">'+(isBook?'فهرس وشرح · دون ملف أصلي':'معاينة تعليمية توضيحية')+'</span></div>'+(isBook?'<div class="masar-library-cover" role="img" aria-label="غلاف رمزي مصمم في مِسار، وليس صورة الغلاف الأصلي"><span>مِسار / مكتبة المراجع</span><strong>'+E(item.title)+'</strong><small>غلاف توضيحي · '+E(item.pages)+' صفحة</small></div>':sourceVisualPreview(item))+'<p>'+E(item.scope||item.note||'مرجع للتعلم والمقارنة')+'</p>'+studySourceDetails(course,item)+'<p class="hub-filename">اسم الملف المرجعي: '+E(item.filename)+'</p><div class="source-inline-preview" data-source-preview="'+E(item.id)+'" aria-live="polite"></div><label class="hub-source-note">ملاحظاتي على المرجع<textarea data-source-note="'+E(item.id)+'" placeholder="وش فهمت؟ وش أحتاج أراجع؟">'+E((state.sourceNotes||{})[item.id]||'')+'</textarea></label></article>';
 }).join('');
 var urls=byKind.map(function(x){return '<div class="hub-online-source"><div><strong>'+E(x.title)+'</strong><small>'+E(x.note)+'</small></div><a href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">زيارة المصدر ↗</a></div>'}).join('');
 var links=course.community_pages&&course.community_pages.image_links||[];
 return '<div class="eyebrow">مكتبة مِسار</div><h1 class="page-title">المصادر وملفاتي الخاصة</h1><div class="source-library-summary"><strong>'+(course.personal_documents||[]).length+' كتب ومراجع PDF · '+(course.uploaded_image_index||[]).length+' مراجع بصرية · '+byKind.length+' روابط تعليمية</strong><span>الفهرس وشرح الصفحات والرسومات التوضيحية متاحة مباشرة؛ أما الملفات الأصلية للكتب والصور فليست منشورة في الموقع العام.</span></div><p class="sub">كل مرجع مربوط بالدروس التي تستفيد منه. زر «عرض شرح الموضع» يفتح ملخصًا تعليميًا، وليس صفحة PDF الأصلية. النسخ الكاملة للكتب المحمية لا ننشرها داخل مستودع GitHub العام.</p><div class="hub-metrics"><div><strong>'+files.length+'</strong><small>مرجعًا مفهرسًا</small></div><div><strong>'+mappedCount+'</strong><small>درسًا له قراءة مرتبطة</small></div></div><div class="source-filter-tabs" role="group" aria-label="تصنيف مكتبة المراجع">'+[['all','الكل'],['books','الكتب السبعة'],['images','الصور والملصقات']].map(function(o){return '<button type="button" data-action="hub-source-filter" data-filter="'+o[0]+'" class="source-filter-tab '+(sourceFilter===o[0]?'selected':'')+'" aria-pressed="'+(sourceFilter===o[0])+'">'+o[1]+'</button>'}).join('')+'</div><div class="hub-source-grid">'+cards+'</div><h2 class="hub-section-title">روابط المصادر على الإنترنت</h2><div class="hub-online-list">'+urls+'</div><details class="hub-page-list"><summary>روابط تجميع النزاوي الخارجية · '+links.length+'</summary><p>هذه روابط طرف ثالث وليست صورًا نعيد نشرها داخل الموقع. أسئلة مِسار نفسها صارت تحتوي رسومات تعليمية مستقلة.</p><div>'+links.map(function(it){return '<a href="'+E(it.url)+'" target="_blank" rel="noopener noreferrer">صفحة '+it.page+'</a>'}).join('')+'</div></details>';
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
  var region=el.closest('.source-chapter,.hub-source');
  var area=region&&region.querySelector('[data-source-preview="'+sid+'"]');
  if(!area&&region)area=region.querySelector('.source-inline-preview')
  if(!area){ctx.toast('تعذّر تحديد مساحة شرح المرجع');return true}
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
   if(!f||!f.blob){area.innerHTML=sourceSummaryHTML(ctx.course,id,pg,pg);return;}
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
/* MASAR BMW · original simplified SVG traffic sign illustrations, no external dependency.
 * NOT exact official traffic-sign artwork. Compare with Saudi Traffic Department guide.
 */
(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const red='#cf1726',blue='#2362a0',ink='#14222c';
let mode='study',filter='all',selected=null,quizIndex=0,answered=null,answeredSignId=null,quizKind='mixed';
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
const stat=(state,id)=>state.signPractice?.[id]||{attempts:0,correct:0,wrong:0,lastResult:null,streak:0,meaningCorrect:0,actionCorrect:0};
function kindCorrect(s,kind){return Number(kind==='action'?s.actionCorrect:s.meaningCorrect)||0}
function currentQuizKind(){return quizKind==='mixed'?(quizIndex%2===0?'meaning':'action'):quizKind}
function mastery(state,id){
 const s=stat(state,id);
 const checkedMeaning=(s.meaningCorrect||0)>=1,checkedAction=(s.actionCorrect||0)>=1;
 const legacy=(s.meaningCorrect===undefined&&s.actionCorrect===undefined&&(s.streak||0)>=2&&(s.correct||0)>=2);
 if((checkedMeaning&&checkedAction)||legacy)return 'mastered';
 if((s.attempts||0)>0)return 'learning';
 return 'new';
}
function masteryLabel(state,id){
 const m=mastery(state,id);
 return m==='mastered'?'مثبّتة ✓':m==='learning'?'قيد التثبيت':'جديدة';
}
function compareSection(signs){
 const pairs=[
  ['SG-01','SG-02','قف أم أعطِ الأفضلية؟','قف = توقف كامل. أعطِ الأفضلية = أفسحي المجال وقد تحتاجين للتوقف.'],
  ['SG-09','SG-10','ممنوع الوقوف أم ممنوع التوقف؟','قارني الخطوط داخل الدائرة واحفظي معنى كل واحدة بدل الاعتماد على اللون فقط.'],
  ['SG-05','SG-06','ممنوع الدوران أم ممنوع اليسار؟','الدوران للخلف U-turn مختلف عن الانعطاف يسارًا؛ راقبي شكل السهم.']
 ];
 const rows=pairs.map(([a,b,title,note])=>{
  const x=signs.find(s=>s.id===a),y=signs.find(s=>s.id===b);if(!x||!y)return '';
  return '<article class="ts-compare-card"><div class="ts-compare-art"><span>'+draw(x)+'</span><span>'+draw(y)+'</span></div><h3>'+esc(title)+'</h3><p>'+esc(note)+'</p><div><button type="button" data-action="sign-open" data-id="'+x.id+'">'+esc(x.title)+'</button><button type="button" data-action="sign-open" data-id="'+y.id+'">'+esc(y.title)+'</button></div></article>';
 }).join('');
 return '<section class="ts-compare-section"><div class="section-head"><div><span class="ts-overline">DON’T MIX THEM UP</span><h2>لوحات كثير تنلخبط على المبتدئة</h2><p>قارني الشكلين جنب بعض، ثم افتحي كل لوحة واقرئي التصرف المطلوب.</p></div></div><div class="ts-compare-grid">'+rows+'</div></section>';
}
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
 if(filter!=='all'&&filter!=='mistakes'&&filter!=='new'&&filter!=='mastered'&&filter!=='learning'&&filter!=='focus')signs=signs.filter(x=>x.category===filter);
 else if(filter==='mistakes')signs=signs.filter(x=>(stat(state,x.id).wrong||0)>0&&(stat(state,x.id).lastResult===false));
 else if(filter==='new')signs=signs.filter(x=>mastery(state,x.id)==='new');
 else if(filter==='mastered')signs=signs.filter(x=>mastery(state,x.id)==='mastered');
 else if(filter==='learning')signs=signs.filter(x=>mastery(state,x.id)==='learning');
 else if(filter==='focus')signs=signs.filter(x=>mastery(state,x.id)!=='mastered').sort((a,b)=>{
   const sa=stat(state,a.id),sb=stat(state,b.id);
   return Number(sb.lastResult===false)-Number(sa.lastResult===false)||(sa.attempts||0)-(sb.attempts||0);
 });
 return signs;
}
function page(course,state){
 const signs=course.sign_library||[],items=filtered(course,state);const attempts=signs.reduce((n,x)=>n+stat(state,x.id).attempts,0),wrong=signs.filter(x=>stat(state,x.id).lastResult===false).length,studied=signs.filter(x=>stat(state,x.id).attempts>0).length,mastered=signs.filter(x=>mastery(state,x.id)==='mastered').length,learning=signs.filter(x=>mastery(state,x.id)==='learning').length;
 let body='';
 if(mode==='study'){
  if(selected){const a=signs.find(x=>x.id===selected);body=a?'<section class="ts-detail"><button class="ts-return" type="button" data-action="sign-back">← جميع اللوحات</button><div class="ts-detail-grid"><div class="ts-icon-panel">'+draw(a)+'<span class="ts-mastery-pill '+mastery(state,a.id)+'">'+masteryLabel(state,a.id)+'</span></div><div><span class="ts-overline">'+esc(a.category)+' / بطاقة '+a.id+'</span><h2>'+esc(a.title)+'</h2><h3>وش تعني؟</h3><p>'+esc(a.meaning)+'</p><h3>وش أسوي إذا شفتها؟</h3><p>'+esc(a.action)+'</p><h3>لا تخلطين بينها وبين…</h3><p>'+esc(a.memory_tip)+'</p><div class="ts-detail-actions"><a class="ts-link" href="#/lesson/'+Number(a.lesson_ids[0].slice(-3))+'">راجعي درسها في المنهج ←</a><a class="ts-link muted" href="'+esc(a.source_url||'https://www.moi.gov.sa/wps/portal/Home/sectors/publicsecurity/traffic/')+'" target="_blank" rel="noopener noreferrer">مرجع المرور ↗</a></div><p class="ts-source-scope">'+esc(a.reference_scope||'المعنى للتعلم، والرسم توضيحي مبسط غير مطابق هندسيًا للوحة الرسمية.')+'</p></div></div></section>':'';
  }else body='<div class="ts-grid">'+items.map(a=>'<button type="button" class="ts-card '+mastery(state,a.id)+'" data-action="sign-open" data-id="'+a.id+'"><span class="ts-art">'+draw(a)+'</span><span class="ts-category">'+esc(a.category)+' · '+masteryLabel(state,a.id)+'</span><strong>'+esc(a.title)+'</strong><span class="ts-card-arrow">المعنى والتصرف ←</span></button>').join('')+'</div>'+compareSection(signs);
 }else {
  if(quizIndex>=items.length)quizIndex=0;
  const q=answered!==null&&answeredSignId?signs.find(x=>x.id===answeredSignId):items[quizIndex];if(!q)body='<div class="ts-empty">ما عندك لوحات بهذه الحالة حاليًا. اختاري «الكل» وكمّلي المراجعة.</div>';
  else{const opts=choices(q,signs),wasAnswered=answered!==null,kind=currentQuizKind(),askAction=kind==='action';
   body='<section class="ts-exam"><div class="ts-exam-top"><span>لوحة '+(quizIndex+1)+' / '+items.length+'</span><span>'+(askAction?'اختاري التصرف الأنسب':'اختاري اسم/معنى اللوحة')+'</span></div><div class="ts-quiz-kind" role="group" aria-label="نوع سؤال الإشارة">'+[['mixed','مختلط'],['meaning','المعنى'],['action','التصرف']].map(([id,label])=>'<button type="button" data-action="sign-quiz-kind" data-kind="'+id+'" aria-pressed="'+(quizKind===id)+'" class="'+(quizKind===id?'active':'')+'">'+label+'</button>').join('')+'</div><div class="ts-exam-art">'+draw(q,true)+'</div><h2>'+(askAction?'وش التصرف الأنسب إذا شفتي هذه اللوحة؟':'وش معنى هذه اللوحة؟')+'</h2><div class="ts-choices">'+opts.map(x=>'<button type="button" data-action="sign-answer" data-choice="'+x.id+'" data-kind="'+kind+'" class="ts-choice '+(wasAnswered?(x.id===q.id?'is-correct':x.id===answered?'is-wrong':''):'')+'" '+(wasAnswered?'disabled':'')+'>'+esc(askAction?x.action:x.title)+'</button>').join('')+'</div>'+(wasAnswered?'<div role="status" class="ts-explanation"><strong>'+(answered===q.id?'صح!':'الإجابة الصحيحة مرتبطة بلوحة: '+esc(q.title))+'</strong><p><b>المعنى:</b> '+esc(q.meaning)+'</p><p><b>التصرف:</b> '+esc(q.action)+'</p><span class="ts-retrieval-note">للتثبيت في مِسار: جاوبي مرة على المعنى ومرة على التصرف، مو حفظ اسم اللوحة فقط.</span><a href="#/lesson/'+Number(q.lesson_ids[0].slice(-3))+'">ارجعي للدرس المرتبط ←</a></div>':'')+'<div class="ts-controls"><button data-action="sign-next" class="ts-next" type="button">'+(quizIndex===items.length-1?'إعادة الجولة':'اللوحة التالية ←')+'</button></div></section>';
  }
 }
 return '<div class="ts-page"><section class="ts-header"><div><span class="ts-overline">TRAFFIC SIGNS / تَعَلُّم بِالصُّورَة</span><h1>إشارات المرور</h1><p>تعرّفي على اللوحة، افهمي معناها، ثم اختبري نفسك بصورتها وحدها. الرسومات مبسّطة للتدريب، <strong>وليست صورًا رسمية مطابقة</strong>.</p></div><div class="ts-header-counter"><b>'+mastered+'<small> / '+signs.length+'</small></b><span>لوحة وصلت لمرحلة التثبيت</span></div></section><div class="ts-mastery-summary"><div><strong>'+studied+'</strong><span>بدأتِ مراجعتها</span></div><div><strong>'+learning+'</strong><span>قيد التثبيت</span></div><div><strong>'+mastered+'</strong><span>مثبّتة</span></div><div><strong>'+wrong+'</strong><span>آخر إجابة خطأ</span></div></div><div class="ts-facts"><span>'+signs.length+' لوحة تعليمية · '+esc([...new Set(signs.map(x=>x.category))].join('، '))+'</span><span>الإجابات المسجلة: '+attempts+'</span><span>التثبيت = إجابة صحيحة على المعنى + إجابة صحيحة على التصرف</span></div><div class="ts-toolbar"><div role="group" aria-label="طريقة المذاكرة"><button type="button" data-action="sign-mode" data-mode="study" aria-pressed="'+(mode==='study')+'" class="'+(mode==='study'?'active':'')+'">مكتبة اللوحات</button><button type="button" data-action="sign-mode" data-mode="quiz" aria-pressed="'+(mode==='quiz')+'" class="'+(mode==='quiz'?'active':'')+'">اختبري نفسك</button></div><div class="ts-filters" role="group" aria-label="تصفية الإشارات">'+[['all','الكل'],...[...new Set(signs.map(x=>x.category))].map(c=>[c,c]),['focus','تحتاج تثبيت'],['mistakes','أخطائي'],['learning','قيد التثبيت'],['mastered','مثبّتة'],['new','الجديدة']].map(([id,txt])=>'<button type="button" data-action="sign-filter" data-filter="'+id+'" aria-pressed="'+(filter===id)+'" class="'+(filter===id?'active':'')+'">'+txt+'</button>').join('')+'</div></div>'+body+'<section class="ts-note"><strong>مهم قبل الاختبار</strong><p>وزارة الداخلية تنشر دليلًا للإشارات التحذيرية والتنظيمية والإرشادية وإشارات مناطق العمل. مكتبة مِسار الحالية للتدريب وليست كتالوجًا حكوميًا كاملًا، والرسومات فيها مبسطة. عند اختلاف الشكل أو الاسم، اعتمدي دليل المرور.</p><a href="https://www.moi.gov.sa/wps/portal/Home/sectors/publicsecurity/traffic/contents/!ut/p/z0/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziDTxNTDwMTYy83V0CTQ0cA71d_T1djI0MXA30gxOL9L24FMCAC07oR-HXFQHVAVUOp_QjM7MKC6Mc9aOS8_NKUitK9CNKihLT0jKTVQ2gDIXEIlWD3MTMPIRIcWY60K3F-gXZ7uEA0o5r2w!!/" target="_blank" rel="noopener noreferrer">دليل الإشارات المرورية — المرور السعودي ↗</a></section></div>';
}
function click(action,el,ctx){
 const c=ctx.course,s=ctx.state;
 if(action==='sign-mode'){mode=el.dataset.mode==='quiz'?'quiz':'study';selected=null;answered=null;answeredSignId=null;quizIndex=0;ctx.render(true);return true}
 if(action==='sign-quiz-kind'){quizKind=['meaning','action','mixed'].includes(el.dataset.kind)?el.dataset.kind:'mixed';answered=null;answeredSignId=null;quizIndex=0;ctx.render(true);return true}
 if(action==='sign-filter'){filter=el.dataset.filter||'all';selected=null;answered=null;answeredSignId=null;quizIndex=0;ctx.render(true);return true}
 if(action==='sign-open'){if(c.sign_library.some(x=>x.id===el.dataset.id)){selected=el.dataset.id;ctx.render(true)}return true}
 if(action==='sign-back'){selected=null;ctx.render(true);return true}
 if(action==='sign-answer'){const items=filtered(c,s),q=items[quizIndex],choice=el.dataset.choice,kind=['meaning','action'].includes(el.dataset.kind)?el.dataset.kind:currentQuizKind();if(!q||answered!==null||!choices(q,c.sign_library).some(x=>x.id===choice))return true;
  s.signPractice=s.signPractice||{};const prior=stat(s,q.id),correct=choice===q.id;
  s.signPractice[q.id]={...prior,attempts:(prior.attempts||0)+1,correct:(prior.correct||0)+(correct?1:0),wrong:(prior.wrong||0)+(correct?0:1),lastResult:correct,streak:correct?(prior.streak||0)+1:0,meaningCorrect:(prior.meaningCorrect||0)+(correct&&kind==='meaning'?1:0),actionCorrect:(prior.actionCorrect||0)+(correct&&kind==='action'?1:0),lastKind:kind,lastReviewed:new Date().toISOString()};
  answered=choice;answeredSignId=q.id;window.MasarCoach?.record(s,'sign',q.id,correct);ctx.save();ctx.render(true);return true}
 if(action==='sign-next'){quizIndex++;answered=null;answeredSignId=null;ctx.render(true);return true}
 return false;
}
window.MasarSigns=Object.freeze({page,draw,click});
})();
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
function makeMock(course,mode='learning'){
 const review=(course.review_questions||[]).slice(),lesson=(course.questions||[]).slice();
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 const ids=shuffle([...shuffle(review).slice(0,10),...shuffle(lesson).slice(0,10)]).map(x=>x.id);
 return {id:'MOCK-'+Date.now(),questionIds:ids,answers:{},startedAt:Date.now(),timeLimitMs:25*60*1000,finishedAt:null,score:null,status:'active',feedbackMode:mode==='simulation'?'simulation':'learning'};
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
 const mode=m?.feedbackMode||'learning';
 let head='<div class="eyebrow">NON-OFFICIAL SIMULATION / تدريب</div><h1 class="page-title">محاكاة اختبار نظري</h1><p class="sub">20 سؤالًا تدريبيًا في 25 دقيقة (إعداد داخل «مسار» وليس مدة أو عددًا رسميًا للاختبار السعودي). الخيارات من بنكنا التعليمي، ولم نؤكد تطابقها مع أسئلة المدارس.</p>';
 if(!m){return '<section class="coach-page">'+head+'<div class="coach-mock-intro"><h2>اختاري طريقة الحل</h2><p>نفس بنك الـ20 سؤالًا، لكن عندك وضع تعلّم يصحح فورًا ووضع محاكاة يؤجل التصحيح للنهاية.</p><div class="coach-mode-grid"><button type="button" class="coach-mode-card is-learning" data-action="coach-mock-start" data-mode="learning"><strong>وضع التعلّم</strong><span>صح/خطأ فورًا + سبب مختصر بعد كل إجابة</span></button><button type="button" class="coach-mode-card" data-action="coach-mock-start" data-mode="simulation"><strong>وضع المحاكاة</strong><span>بدون تصحيح أثناء الحل؛ النتيجة والتفسير في النهاية</span></button></div></div>'+history(past)+'</section>'}
 if(m.status==='finished'){
  const all=new Map(allQuestions(course).map(q=>[q.id,q]));const wrong=m.questionIds.filter(id=>!Number.isInteger(m.answers[id])||m.answers[id]!==all.get(id)?.correct_option_index);
  return '<section class="coach-page">'+head+'<div class="coach-mock-result"><strong>'+m.score+' <small>/ '+m.questionIds.length+'</small></strong><h2>نتيجة تدريبية شخصية</h2><p>لا تساوي نجاحًا أو رسوبًا رسميًا. هذه الملاحظات تساعدك على فهم الإجابات.</p><button type="button" class="btn btn-primary" data-action="coach-mock-new" data-mode="'+mode+'">نموذج جديد بنفس الوضع</button></div><h2 class="coach-section-heading">الأسئلة التي تحتاج مراجعة ('+wrong.length+')</h2><div class="coach-review-list">'+(wrong.length?wrong.map(id=>{const q=all.get(id);if(!q)return '';return '<article class="coach-mock-mistake"><strong>'+E(q.question)+'</strong><p>الإجابة: '+E(q.options[q.correct_option_index])+'</p><small>'+E(q.rationale||q.explanation||'راجعي درس المفهوم.')+'</small><a href="#/lesson/'+nOf(q.lesson_id)+'">الدرس المرتبط ←</a></article>'}).join(''):'<div class="coach-empty">جميع إجاباتك صحيحة في هذا النموذج. جربي نموذجًا آخر لأن تذكر هذه الأسئلة لا يضمن تغطية الاختبار الحقيقي.</div>')+'</div>'+history(past)+'</section>';
 }
 const qs=new Map(allQuestions(course).map(q=>[q.id,q])),idx=Math.max(0,Math.min(m.questionIds.length-1,mockPosition));const q=qs.get(m.questionIds[idx]);if(!q)return '<p>تعذر العثور على سؤال من هذه الجلسة. يُرجى بدء نموذج جديد.</p>';
 const remain=elapsed(m),chosen=m.answers[q.id],answered=Object.keys(m.answers).length,immediate=mode!=='simulation',instantDone=immediate&&Number.isInteger(chosen),instantCorrect=instantDone&&chosen===q.correct_option_index;
 return '<section class="coach-page">'+head+'<div class="coach-mock-mode-pill '+(immediate?'learning':'simulation')+'">'+(immediate?'وضع التعلّم · تصحيح فوري':'وضع المحاكاة · التصحيح بالنهاية')+'</div><div class="coach-mock-top"><div><strong>سؤال '+(idx+1)+' من '+m.questionIds.length+'</strong><small>'+answered+' سؤال تمت الإجابة عنه</small></div><div class="coach-clock" id="coach-mock-clock" role="timer" aria-live="off">'+formatTime(remain)+'</div></div><div class="coach-mock-progress"><span style="width:'+(answered/m.questionIds.length*100)+'%"></span></div><article class="coach-mock-question"><h2>'+E(q.question)+'</h2><div class="coach-mock-options">'+q.options.map((answer,j)=>'<button type="button" data-action="coach-mock-answer" data-option="'+j+'" class="'+(chosen===j?'active ':'')+(instantDone?(j===q.correct_option_index?'is-correct':chosen===j?'is-wrong':''):'')+'" aria-pressed="'+(chosen===j)+'" '+(instantDone?'disabled':'')+'>'+String.fromCharCode(65+j)+' · '+E(answer)+'</button>').join('')+'</div>'+(instantDone?'<div class="coach-live-feedback '+(instantCorrect?'correct':'wrong')+'" role="status"><strong>'+(instantCorrect?'صح ✓':'مو صحيح — الإجابة الصحيحة موضحة بالأخضر')+'</strong><small>'+E(q.rationale||q.explanation||'راجعي تفسير المفهوم في الدرس المرتبط.')+'</small><a href="#/lesson/'+nOf(q.lesson_id)+'">راجعي الدرس المرتبط ←</a></div>':'')+'<div class="coach-mock-nav"><button data-action="coach-mock-prev" type="button" class="btn btn-outline" '+(idx===0?'disabled':'')+'>السابق</button><button data-action="coach-mock-next" type="button" class="btn btn-outline" '+(idx===m.questionIds.length-1?'disabled':'')+'>التالي ←</button></div><div class="coach-mock-tiles" aria-label="الانتقال بين الأسئلة">'+m.questionIds.map((id,i)=>'<button type="button" aria-label="السؤال '+(i+1)+'" class="'+(i===idx?'selected ':'')+(Number.isInteger(m.answers[id])?'done':'')+'" data-action="coach-mock-jump" data-index="'+i+'">'+(i+1)+'</button>').join('')+'</div><p class="coach-disclaimer">ينتهي المؤقت بعد 25 دقيقة حسب ساعة جهازك؛ يمكن إنهاء النموذج قبلها. '+(immediate?'في وضع التعلّم يظهر التصحيح والسبب مباشرة بعد أول اختيار.':'في وضع المحاكاة لن يظهر التصحيح قبل التسليم.')+'</p><button type="button" class="btn btn-primary" data-action="coach-mock-finish">إنهاء وتصحيح النموذج ('+answered+'/'+m.questionIds.length+')</button></article></section>';
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
 if(action==='coach-mock-start'||action==='coach-mock-new'){s.mockSession=makeMock(c,el.dataset.mode||m?.feedbackMode||'learning');mockPosition=0;ctx.save();ctx.render(false);return true}
 if(!m||m.status!=='active')return false;
 if(action==='coach-mock-answer'){
  const qid=m.questionIds[mockPosition],q=allQuestions(c).find(q=>q.id===qid),option=Number(el.dataset.option);
  if((m.feedbackMode||'learning')!=='simulation'&&Number.isInteger(m.answers[qid]))return true;
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
/* MASAR original educational expansions. Supplementary educational explanations; not official test material. */
(function(){
"use strict";
const data=Object.create(null);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const para=s=>"<p>"+escape(s)+"</p>";
function render(lesson){
 const item=data[lesson.order];
 if(!item)return '<section class="deep-guide-missing" role="note">الشرح الموسع لهذا الدرس لم يُنشر بعد؛ استخدمي صفحات مرجع الدرس وتحققي من المعلومة قبل الاعتماد عليها.</section>';
 return '<section class="lesson-deep-dive" id="lesson-deep-dive" aria-label="الشرح التعليمي الموسع">'
 +'<div class="deep-guide-head"><div class="eyebrow">دليل التعلم / شرح أصلي موسع</div><h2>نفهم '+escape(lesson.title)+' خطوة بخطوة</h2><p>اقرئي الشرح ثم المثال؛ بعدها جاوبي من ذاكرتك قبل كشف الحل.</p></div>'
 +'<div class="deep-guide-content"><h3>الفكرة ببساطة</h3>'+para(item.foundation)+para(item.why)
 +'<h3>خطوات ومفاهيم مهمة</h3><ol class="deep-guide-steps">'+item.steps.map(v=>'<li>'+escape(v)+'</li>').join("")+'</ol>'
 +'<div class="deep-example"><h3>مثال من الطريق</h3>'+para(item.example)+'</div>'
 +'<h3>انتبهي لهذه الأخطاء</h3><ul>'+item.errors.map(v=>'<li>'+escape(v)+'</li>').join("")+'</ul>'
 +'<div class="deep-guide-recall"><h3>فكّري قبل كشف الإجابة</h3><p>'+escape(item.prompt)+'</p><details><summary>اكشفي التفسير بعد المحاولة</summary>'+para(item.answer)+'</details></div>'
 +'<div class="deep-guide-homework"><h3>تطبيقك خارج الدرس</h3>'+para(item.homework)+'</div>'
 +'<p class="deep-source-note">هذه صياغة تعليمية أصلية للفهم، وليست نصًا رسميًا من الاختبار. راجعي «مراجع وصفحات الدرس» للتحقق من التفاصيل؛ تختلف بعض إجراءات المدارس وأزرار السيارات بحسب المكان والموديل.</p>'
 +'</div></section>';
}
window.MasarGuides=Object.freeze({register(items){for(const item of items){if(!Number.isInteger(item.id)||data[item.id])throw Error("Invalid or repeated educational guide "+item.id);data[item.id]=item;}},render,getCount:()=>Object.keys(data).length});
})();

/* Original teaching guides, part 1 / 4. */
window.MasarGuides.register([
  {
    "id": 1,
    "foundation": "أول خطوة قبل السواقة هي فهم وظيفة الأشياء التي تتحكم بحركة السيارة. خلف المقود يوجد مقود للتوجيه، ودواستان في السيارة الأوتوماتيكية: البنزين لزيادة قوة الحركة، والفرامل لتقليل السرعة أو التوقف. ناقل الحركة يحدد حالة السيارة واتجاه الحركة، أما فرامل التوقف فتساعد على تأمين السيارة عند ركنها.",
    "why": "الفهم أهم من معرفة اسم الزر وحده. إذا اختلط عليك عمل البنزين والفرامل أو ظننتِ أن وضع P يغني دائمًا عن فرامل التوقف، فقد تتخذين قرارًا غير صحيح عند التعلم العملي. سيارة هوندا أكورد ليست نسخة واحدة؛ مكان زر التشغيل وفرامل التوقف وخصائص المساعدة يختلف باختلاف السنة والفئة.",
    "steps": [
      "ميّزي المقود والدواستين بعينيك والسيارة مطفأة؛ في الأوتوماتيك تُستخدم القدم اليمنى للفرامل والبنزين عادةً، وليس كل قدم لدواسة.",
      "افهمي أن P للركن وR للرجوع للخلف وN للوضع المحايد وD للسير للأمام؛ لا تحرّكي الناقل عشوائيًا.",
      "ميّزي فرامل الخدمة التي تضغطينها بقدمك عن فرامل التوقف اليدوية أو الإلكترونية، وراجعي دليل سيارتك.",
      "تعرّفي على ذراع الإشارة، المسّاحات، الأنوار، المنبّه وزر التحذير الرباعي دون تشغيل المركبة."
    ],
    "example": "أنت جالسة في سيارة متوقفة والمحرك مطفأ. يسألك أخوك: «ما الفرق بين الفرامل وفرامل التوقف؟» اشرحي أن دواسة الفرامل تتحكم بالتباطؤ والتوقف أثناء السير، بينما فرامل التوقف تُستخدم لتأمين المركبة عند ركنها بحسب تعليمات الشركة.",
    "errors": [
      "اعتبار كل سيارة أكورد ذات ترتيب أزرار واحد؛ لا نعطي تعليمات ضغط أزرار دقيقة قبل معرفة موديلها.",
      "تجربة ناقل الحركة أو الدواسات لإثبات الفهم أثناء وجود أشخاص حول السيارة؛ الاختبار الأول يكون لفظيًا وبالسيارة متوقفة."
    ],
    "prompt": "ما الذي يحدد اتجاه حركة السيارة، وما الأداة التي تقلل سرعتها؟",
    "answer": "ناقل الحركة يحدد وضع السير مثل D أو R، ودواسة الفرامل تقلل سرعة المركبة وتساعد على إيقافها. اختيار الوضع الصحيح لا يلغي ضرورة مراقبة المحيط.",
    "homework": "ارسمي لوحة أمامية بسيطة واكتبي أسماء ست أدوات ووظائفها. في جلسة الجمعة حددي مواقعها داخل سيارة متوقفة وآمنة والمحرك مطفأ."
  },
  {
    "id": 2,
    "foundation": "الاستعداد للقيادة سلسلة فحوص قبل التفكير في الحركة: تفقد ما حول السيارة، والجلوس المناسب، وضبط مسند الرأس، والمرايا، وربط الحزام، ثم الانتباه لما يظهر على لوحة العدادات. الترتيب مهم لأنه يقلل الحاجة إلى تعديل الأشياء أثناء السير.",
    "why": "عندما يكون المقعد بعيدًا جدًا قد لا تصلي إلى الدواسات براحة، وعندما يكون قريبًا جدًا قد تصبح الحركة محدودة. المرايا تعطي مجالات رؤية مختلفة لكنها لا تلغي وجود مناطق عمياء. لذلك نراجع وضعية الجلوس ومحيط المركبة معًا.",
    "steps": [
      "انظري حول السيارة قبل الدخول: أطفال، عوائق، تسربات ظاهرة، وأجسام أمام العجلات أو خلفها.",
      "اضبطي المقعد ومسند الظهر بحيث تصلين إلى الفرامل براحة دون مد الساق بالكامل، ويكون التحكم بالمقود طبيعيًا.",
      "اضبطي مسند الرأس والمرايا الداخلية والخارجية لزيادة مجال الرؤية، ثم اربطي الحزام بصورة صحيحة.",
      "تأكدي من الأبواب والتنبيهات المهمة، وحددي المكان الذي ستتحققين فيه من النقطة العمياء عند الحاجة."
    ],
    "example": "سجلتِ في دفتر التعلم أنك رأيتِ سيارة تتراجع من موقف والمشاة خلفها. اسألي: هل يكفي النظر إلى المرآة الخلفية؟ لا؛ ينبغي التأكد من المنطقة المحيطة كلها واستخدام الوسائل المناسبة دون الاعتماد الكامل على الكاميرا.",
    "errors": [
      "إهمال فحص المحيط والاعتماد على حساسات الركن أو الكاميرا وحدها.",
      "ضبط المقعد أو المرآة أثناء حركة السيارة بدل إتمامه قبل الانطلاق."
    ],
    "prompt": "لماذا لا يكفي ضبط المرآة الوسطى وحدها؟",
    "answer": "لأنها تركز على المجال الخلفي المباشر، بينما الجانبيتان تكشفان أجزاء أخرى وتظل هناك زوايا قد لا تظهر في أي مرآة. فحص المحيط والنقطة العمياء ضروري عند المناورة.",
    "homework": "اكتبي قائمة استعداد من أربع مراحل، وراجعيها شفهيًا مع أخوك عند وقوف السيارة من دون تحريكها."
  },
  {
    "id": 3,
    "foundation": "لوحة القيادة تنقل معلومات أساسية أثناء السير. مقياس السرعة يوضح سرعة المركبة، ومؤشر الوقود يبين المقدار المتبقي، وقد تظهر معلومات درجة حرارة المحرك أو ضغط الإطارات والتنبيهات الأخرى. ليس كل ضوء مضيء باللوحة معناه عطل؛ بعضها يدل على تشغيل وظيفة.",
    "why": "تمييز لون الرمز ومعناه وسياقه يساعدك على تقدير أهمية الرسالة، لكن اللون وحده لا يحدد الإجراء الصحيح. يُفضّل الرجوع إلى دليل مالك السيارة، خاصة في الرموز المرتبطة بالمحرك والزيت والفرامل والبطارية، لأنها تختلف بين الأجيال والفئات.",
    "steps": [
      "حددي مؤشر السرعة والوقود وإشارات الاتجاه وحالة الإنارة في صورة لوحة عدادات.",
      "صنفي الرموز إلى معلومات تشغيل عادية، أو تنبيهات تتطلب انتباهًا، أو تحذيرات تستلزم اتباع دليل المركبة والتوقف الآمن عند الضرورة.",
      "ميّزي بين لمبة فحص المحرك ولمبة ضغط الزيت ولمبة البطارية وتحذير الفرامل؛ لا تتعاملي معها باعتبارها رمزًا واحدًا.",
      "عندما يظهر تحذير أثناء السير، ركزي أولًا على السيطرة على المركبة والوصول إلى موضع آمن ثم اتبعي إرشاد الدليل أو اطلبِي مساعدة مختصة."
    ],
    "example": "ظهر تحذير متعلق بزيت المحرك أثناء القيادة. لا تفترضي أن الحل زيادة السرعة أو إكمال المشوار؛ اختاري موضع توقف آمنًا واتّبعي تعليمات الدليل الخاص بالموديل لتجنب ضرر المحرك.",
    "errors": [
      "محاولة قراءة رسالة طويلة في شاشة العدادات أثناء الحركة.",
      "الاعتماد على صورة لوحة عدادات عامة لتحديد معنى رمز في هوندا أكورد من سنة مختلفة."
    ],
    "prompt": "هل يكفي معرفة أن ضوء التحذير أحمر لتحديد الإجراء الدقيق؟",
    "answer": "لا. الأحمر يدل غالبًا على أهمية التنبيه، لكن الإجراء الصحيح يعتمد على الرمز المحدد وتعليمات السيارة والظروف المحيطة. الأولوية للسلامة وعدم مواصلة القيادة مع تحذير خطير دون تقييم.",
    "homework": "اختاري خمسة رموز من الدليل النظري، واكتبي ماذا تعني بصورة عامة، ثم تأكدي من شكلها في دليل الأكورد عندما يتحدد الموديل."
  },
  {
    "id": 4,
    "foundation": "الطريق ليس مجرد مساحة أسفلت. فيه مسارات للمركبات، وأكتاف أو جوانب بحسب نوع الطريق، وأرصفة للمشاة، وجزر فاصلة، ومعابر ومناطق توقف. لكل مساحة وظيفة؛ والخطوط واللوحات تساعد على معرفة طريقة استخدامها.",
    "why": "إذا لم تميزي بين المسار والكتف أو الرصيف فقد تفسرين المشهد خطأً. فهم أجزاء الطريق يُستخدم لاحقًا في تغيير المسار والانعطاف والوقوف قرب المشاة واختيار المسار المناسب قبل التقاطع.",
    "steps": [
      "حددي في رسم الطريق مكان المسار الذي تسير فيه المركبة وحدوده اليمنى واليسرى.",
      "ابحثي عن الرصيف ومعبر المشاة والجزر الفاصلة، وفسري لماذا لا تعامل كمسارات عامة للمركبات.",
      "ميّزي بين الخطوط الأرضية واللوحات العمودية والإشارات الضوئية، فالعلامة الأرضية جزء من تنظيم السير.",
      "تعرفي على الفرق بين طريق باتجاه واحد وطريق باتجاهين بالنظر إلى العلامات والتنظيم وليس بالتخمين."
    ],
    "example": "ترين سيارة متوقفة على كتف طريق سريع. هل الكتف مسار عادي للتجاوز؟ لا؛ وظيفته تختلف عن المسارات المخصصة للحركة، ولا يُستخدم لاختصار الزحام.",
    "errors": [
      "اعتبار كل فراغ واسع بجانب الطريق مساحة مسموحة للقيادة.",
      "تفسير شكل الطريق وحده دون قراءة الأسهم والخطوط واللوحات."
    ],
    "prompt": "كيف تفرّقين بين المسار ومعبر المشاة في صورة تقاطع؟",
    "answer": "المسار جزء مخصص لحركة المركبات وينظمه تخطيط الطريق، بينما معبر المشاة مساحة محددة لعبور الأشخاص وتوجب مراعاة سلامتهم وقواعد الأفضلية والتنظيم عند الاقتراب.",
    "homework": "ارسمي تقاطعًا بسيطًا وحددي عليه خمسة أجزاء: مسار، رصيف، خط توقف، معبر مشاة، جزيرة."
  },
  {
    "id": 5,
    "foundation": "المسار هو الجزء الذي تنتظم فيه المركبات للسير في اتجاه محدد. قد يضم الطريق مسارًا واحدًا أو عدة مسارات، وتحدد الأسهم والخطوط واللوحات المسارات المناسبة للانعطاف أو الاستمرار. اختيار المسار مبكرًا أسهل وأكثر أمانًا من الانتقال المفاجئ قرب التقاطع.",
    "why": "المسارات تساعد على توقع تصرفات الآخرين. السائق الذي يستمر في مساره بطريقة واضحة يكون أسهل توقعًا من الذي يتنقل فجأةً بلا إشارة أو فحص. الإشارة تعلم الآخرين بالنية لكنها لا تمنح الأولوية تلقائيًا.",
    "steps": [
      "اقرئي الأسهم المرسومة على الأرض: قد يخصص بعضها للسير المستقيم وبعضها للانعطاف.",
      "راقبي الخط الفاصل بين المسارات، لأن المتصل والمتقطع لا يعطيان المعنى نفسه.",
      "قبل تغيير مسار فكري في المرايا، الإشارة، النقطة العمياء، وسلامة المسافة والسرعة.",
      "إذا اكتشفتِ أنك في مسار غير مناسب للمخرج، لا تقطعي عدة مسارات بعجلة؛ تابعي إلى فرصة نظامية آمنة."
    ],
    "example": "أنت في المسار المستقيم وفجأة تذكرتِ أن مخرجك قريب على اليمين. القرار الصحيح ليس الانحراف أمام المركبات؛ الأفضل الاستمرار إلى فرصة مناسبة إذا تعذر الانتقال الآمن.",
    "errors": [
      "اعتبار تشغيل الإشارة حقًا للانتقال مباشرةً.",
      "تغيير المسار فوق خط متصل أو قبل التقاطع دون مراجعة العلامات والتنظيم."
    ],
    "prompt": "إذا شغّلت السائقة الإشارة وكانت سيارة في المسار الآخر قريبة، هل يصبح المسار خاليًا لها؟",
    "answer": "لا. الإشارة وسيلة تواصل فقط، وعلى السائقة التأكد من أن الانتقال مسموح وآمن ولا يعرض الآخرين للخطر.",
    "homework": "في مقعد الراكب لاحظي خطًا متصلًا وخطًا متقطعًا، واكتبي كيف يغيران فهم استخدام المسارات."
  },
  {
    "id": 6,
    "foundation": "الطريق مساحة مشتركة بين سائقي السيارات والمشاة وراكبي الدراجات والحافلات والمركبات الكبيرة ومركبات الطوارئ. اختلاف حجم المركبات وسرعاتها ومناطق رؤيتها يعني أن سلوك الجميع ليس متشابهًا.",
    "why": "لا يكفي أن تعرفي ما يسمح لك به التنظيم؛ عليك أيضًا توقع أخطاء الآخرين. الطفل قرب المدرسة قد يتحرك فجأة، والمركبة الكبيرة قد يكون حولها نطاق لا يراه قائدها بسهولة، والمشاة يحتاجون وقتًا للعبور.",
    "steps": [
      "توقعي وجود مشاة عند المعابر والمدارس والأسواق والمواقف.",
      "اتركي مجالًا مناسبًا لراكبي الدراجات ولا تتعاملي معهم كعوائق يجب تجاوزها بأي ثمن.",
      "عند الاقتراب من شاحنة، انتبهي لاتساع مناورتها ومناطق الرؤية المحدودة.",
      "إذا لاحظتِ شخصًا مترددًا قرب الطريق، خففي وفق الموقف واستعدي للتوقف بدل افتراض أنه سيبقى مكانه."
    ],
    "example": "ترين كرة تتدحرج من بين سيارتين واقفتين قرب حي سكني. حتى لو لم تري طفلًا، يجب اعتبار احتمال خروج طفل خلف الكرة خطرًا يستلزم انتباهًا واستجابة مبكرة.",
    "errors": [
      "التركيز على السيارة التي أمامك ونسيان المشاة والجانبين.",
      "الافتراض أن الطرف الآخر شاهدك أو سيتصرف دائمًا بالطريقة الصحيحة."
    ],
    "prompt": "لماذا نخفض سرعتنا قبل منطقة يوجد فيها أطفال حتى لو لم يعبر أحد؟",
    "answer": "لأن الأطفال قد يتصرفون على نحو مفاجئ وتقل القدرة على التنبؤ بحركتهم؛ تخفيف السرعة مبكرًا يعطي وقتًا ومسافة أكبر للاستجابة.",
    "homework": "شاهدي شارعًا من مقعد الراكب وعددي ثلاث فئات من مستخدمي الطريق، وما الخطر الذي ينبغي الانتباه له مع كل فئة."
  },
  {
    "id": 7,
    "foundation": "إشارات التحذير تنبهك إلى خطر أو تغير محتمل قبل الوصول إليه: منعطف، تقاطع، مطب، مشاة، أطفال، طريق زلق أو تضيق في المسارات. الهدف أن تتوقعي الخطر وتعدلي أسلوب القيادة مبكرًا، وليس أن تحفظي أسماء الصور فقط.",
    "why": "تذكري الفرق بين علامة تحذرك بوجود شيء قادم وعلامة تنظيمية تأمرك أو تمنعك. مثلث بداخله رسم إشارة ضوئية يخبرك أن هناك إشارات قادمة، لكنه ليس ضوءًا أحمر يأمرك بالتوقف في موقع المثلث.",
    "steps": [
      "افحصي شكل اللوحة وألوانها ورمزها معًا لا الشكل وحده.",
      "سمّي الخطر الذي تتوقعينه بعد ظهور اللوحة: هل هو تقاطع، مستخدم طريق، تغير هندسي أم سطح الطريق؟",
      "اختاري الاستجابة المناسبة: تقليل السرعة عند الحاجة، ترك مسافة، زيادة الملاحظة، والاستعداد للتوقف.",
      "بعد مشاهدة الصورة، حاولي وصف موقف واقعي تظهر فيه اللوحة وما ينبغي الحذر منه."
    ],
    "example": "رأيتِ مثلثًا يحذر من مطب أمامك. لا تنتظري رؤية المطب على بعد مترين؛ خففي بصورة مبكرة وآمنة وراقبي المركبات حولك.",
    "errors": [
      "خلط لوحة «قف» الثمانية ذات الأمر المباشر بالمثلث الذي يحذر من وجود «قف» أمامك.",
      "اعتبار أي لوحة تحذيرية أمرًا بالتوقف الكامل، بينما التصرف يعتمد على الخطر والتنظيم الفعلي."
    ],
    "prompt": "ما الفرق بين علامة تحذير من إشارة ضوئية وبين الضوء الأحمر نفسه؟",
    "answer": "العلامة التحذيرية تنبه إلى وجود الإشارة لاحقًا، أما الضوء الأحمر عند التقاطع فهو الذي ينظم الوقوف والمرور في مكانه وفق التعليمات.",
    "homework": "من مكتبة الإشارات اختاري ثماني لوحات تحذيرية، وسجلي «الخطر المتوقع» و«تصرفي قبل الوصول» لكل واحدة."
  },
  {
    "id": 8,
    "foundation": "الإشارات التنظيمية تضبط ما يجب فعله أو ما لا يجوز فعله: الوقوف التام، إعطاء الأفضلية، الدخول الممنوع، بعض الاتجاهات الإلزامية وحدود السرعة بحسب اللوحة. لمعرفة معناها لا يكفي التقاط اللون؛ يجب قراءة الرمز أو النص واللوحات المكملة.",
    "why": "تزداد الأخطاء عندما تعتمد السائقة على شكل واحد لجميع الحالات. دائرة عليها حد سرعة لا تعني مجرد سرعة مقترحة، وعلامة ممنوع الدخول ليست إشارة تحدد جهة الوجهة. كما قد توجد لوحات إضافية تحدد أوقات سريان المنع أو استثناءاته.",
    "steps": [
      "تعلمي لوحة قف وما تتطلبه من توقف كامل في الموضع النظامي ومراجعة حركة الطريق.",
      "تعلمي «أعط الأفضلية» بوصفها التزامًا بإفساح المرور والتوقف عند الحاجة، لا أنها دائمًا تعني نفس إجراء قف.",
      "ميزي إشارات المنع من إشارات الإلزام: الأولى تقيد مناورة والثانية توجهك إلى مسار أو اتجاه محدد.",
      "اقرئي اللوحة المضافة أسفل الإشارة إن وجدت؛ قد تفسر النطاق أو الزمن أو الاستثناء."
    ],
    "example": "عند مدخل شارع توجد لوحة «ممنوع الدخول»، رغم أن الشارع يبدو واسعًا وفارغًا. لا يدخل السائق اعتمادًا على عدم وجود مركبات؛ التنظيم هو الذي يحدد الاتجاه المسموح.",
    "errors": [
      "ظن أن عدم وجود سيارات يلغي تعليمات الإشارة.",
      "الخلط بين «أعط الأفضلية» و«قف» رغم اختلاف الأمر وطريقة التعامل."
    ],
    "prompt": "هل «أعط الأفضلية» تعني أن تتوقفي كاملًا في جميع الظروف مثل «قف»؟",
    "answer": "ليستا متطابقتين؛ على السائقة إفساح الطريق لمن له الأفضلية والتوقف عندما يلزم، أما إشارة قف فتأمر بالتوقف التام وفق تنظيم الموقع.",
    "homework": "اصنعي جدولًا لأربع إشارات: قف، أعط الأفضلية، ممنوع الدخول، واتجاه إلزامي. اكتبي الأمر وما الخطأ الشائع في تفسير كل واحدة."
  },
  {
    "id": 9,
    "foundation": "الإشارات الإرشادية تساعدك في الوصول إلى الوجهة، مثل أسماء المدن والطرق والخدمات والمواقف والمستشفيات. أما إشارات مناطق العمل المؤقتة فتنبه إلى تغير غير دائم في الطريق: تحويلة، عمال، مسار مغلق أو حواجز. لكل فئة وظيفة مختلفة.",
    "why": "الإرشاد الصحيح يساعدك على التخطيط لمسارك مبكرًا بدل التردد عند المخرج. ومنطقة العمل تتطلب انتباهًا إضافيًا لأن وضع المسارات والعوائق قد يختلف عما تعرفينه في الطريق نفسه.",
    "steps": [
      "عند لوحة إرشادية، حاولي تحديد الوجهة واتجاه السير من الأسهم والمسافات.",
      "إذا وجدت إشارة لخدمة كالمستشفى أو الوقود، افهمي أنها تعطي معلومة مكانية ولا تسمح بمناورة خطرة للوصول فورًا.",
      "في منطقة عمل، انتبهي للوحات المؤقتة والمخاريط والحواجز والعمال، واتّبعي المسار المتاح والمنظم.",
      "لا تتجاهلي التحويلة بحجة أنك تعرفين الطريق القديم؛ الوضع المؤقت قد يغير السماح بالدخول والخروج."
    ],
    "example": "تقتربين من مخرج محطة وقود وأنت في المسار البعيد. الأفضل ليس قطع المسارات مفاجأة للوصول إليها؛ استمري بصورة آمنة واختاري فرصة دخول مناسبة.",
    "errors": [
      "اعتبار لوحة الخدمات تصريحًا بالانعطاف في أي مكان.",
      "تطبيق مسارات الطريق القديمة داخل منطقة أعمال رغم وجود إرشادات مؤقتة جديدة."
    ],
    "prompt": "ما الفرق بين لوحة مستشفى ولوحة تحويلة مؤقتة؟",
    "answer": "الأولى إرشادية تُعلمك بمكان خدمة، والثانية تنظم أو توجه الحركة عبر وضع مؤقت وقد تستلزم تغيير الطريق المألوف.",
    "homework": "راجعي أربع إشارات إرشادية وأربعًا تخص مناطق العمل، واكتبي إن كانت «معلومة وجهة» أم «تنبيه لتغير حركة السير»."
  },
  {
    "id": 10,
    "foundation": "الإشارات الضوئية تنظم حركة المركبات والمشاة عند التقاطعات. الأحمر يعني الوقوف وفق التنظيم، والأخضر يسمح بالحركة في الاتجاه المسموح عندما يكون الطريق أمامك آمنًا، والأصفر يحتاج تقديرًا آمنًا وفق التعليمات والموقف، لا تسارعًا مفاجئًا للحاق به.",
    "why": "من الأخطاء تفسير الأخضر بأنه إذن مفتوح للدخول إلى تقاطع مغلق بالمركبات أو تجاهل المشاة. كما يجب الانتباه إلى الأسهم الضوئية واللوحات؛ فهي قد تخصص اتجاهًا مختلفًا عن الضوء العام.",
    "steps": [
      "حددي خط الوقوف ومكان معبر المشاة قبل قراءة لون الضوء.",
      "راقبي ما إذا كانت هناك أسهم ضوئية أو إشارات خاصة بمسار معين.",
      "عند السماح بالحركة، تفقدي أن المسار واضح ولا تعوقي التقاطع أو تعرّضي المشاة للخطر.",
      "عند وجود رجل مرور يوجه الحركة، اتبعي التنظيم المعمول به وإشاراته بحسب قواعد المرور."
    ],
    "example": "تحولت الإشارة إلى الأخضر لكن الشارع بعد التقاطع مزدحم جدًا ولا يوجد موضع كاف لسيارتك. لا تدخلي وتسدّي التقاطع؛ انتظري حتى تسمح حركة المرور بعبورك بأمان.",
    "errors": [
      "زيادة السرعة بمجرد رؤية الضوء الأصفر.",
      "التحرك للأمام عند الأخضر دون مراقبة المشاة أو مركبة قد تكون ما زالت تخرج من التقاطع."
    ],
    "prompt": "الضوء أخضر لكن مكان خروجك من التقاطع مسدود؛ ما القرار؟",
    "answer": "انتظري في موضع آمن ولا تدخلي تقاطعًا لا تستطيعين إخلاءه؛ الأخضر لا يلغي واجب الانتباه ومنع التعارض.",
    "homework": "ارسمي تقاطعًا بخط توقف ومعبر مشاة وإشارة سهم، وحددي أين تنتظر المركبة إذا كان الخروج مزدحمًا."
  },
  {
    "id": 11,
    "foundation": "التقاطع موضع تتقابل فيه اتجاهات سير مختلفة، لذلك يحتاج قراءة دقيقة لتنظيم المرور. قد تنظمه إشارات ضوئية، أو رجل مرور، أو لوحات قف وأعط الأفضلية، أو قواعد أولوية في التقاطعات غير المنظمة. لا توجد قاعدة واحدة تستعمل بدل كل هذه الحالات.",
    "why": "قبل أن تحددي من يمر أولًا، اسألي: هل يوجد تنظيم ظاهر؟ من أين تأتي المركبات؟ وأي مسار سوف تقطعينه؟ الأولوية تهدف لمنع التعارض لكنها لا تعفي صاحبتها من الانتباه والسلامة.",
    "steps": [
      "تعرفي إلى التقاطع من بعيد وخففي السرعة بما يتناسب مع الرؤية وحركة الطريق.",
      "حددي نوع التنظيم: رجل مرور، إشارة ضوئية، لوحات، أو غيابها.",
      "اعملي رسمًا للأسهم: من يتجه مستقيمًا، من ينعطف، وأين يتقاطع مسارهما؟",
      "اتخذي القرار بعد معرفة صاحب الأفضلية والتأكد من خلو المسار، ولا تفترضي أن الآخرين سيحترمون التنظيم دائمًا."
    ],
    "example": "تقتربين من تقاطع عليه لوحة قف، بينما مركبة أخرى تسير على الطريق المقاطع. تُلزمك اللوحة بالتوقف وتقييم حركة المرور قبل مواصلة السير عندما يكون ذلك مسموحًا وآمنًا.",
    "errors": [
      "الاعتماد على قاعدة محفوظة من تقاطع آخر دون النظر إلى الإشارات الموجودة.",
      "التقدم لأن سائقًا آخر بدا بطيئًا، دون التأكد من أولويته ومسافة وصوله."
    ],
    "prompt": "لماذا نبدأ حل سؤال «من له الأولوية؟» بتحديد الإشارات قبل مقارنة اتجاه السيارات؟",
    "answer": "لأن الإشارات أو توجيه رجل المرور قد يحددان الأولوية ويغيران حكم الموقف، فلا يصح تطبيق قواعد التقاطع غير المنظم على تقاطع منظم.",
    "homework": "اختاري ثلاثة رسومات تقاطع من كتاب المتدربة، واكتبي أولًا نوع التنظيم ثم أصحاب المسارات المتعارضة."
  },
  {
    "id": 12,
    "foundation": "معبر المشاة مساحة منظمة لعبور الأشخاص، ويجب الانتباه إليها قبل الوصول، خاصة قرب المدارس والمجمعات والمرافق العامة. يتقاطع مسار المركبة مع أشخاص أبطأ حركة وقد يحتاجون وقتًا إضافيًا للعبور، لذلك تُعد الملاحظة المبكرة أساسية.",
    "why": "وجود معبر واضح لا يعني أن جميع المشاة ملتزمون دائمًا بمسارات محددة. القيادة الوقائية تتوقع احتمال وجود شخص يتقدم من خلف مركبة متوقفة أو طفل لا يقدر سرعة السيارة بصورة صحيحة.",
    "steps": [
      "تعرفي إلى علامة معبر المشاة وخطوطه، وانظري إلى جانبي الطريق قبل الاقتراب.",
      "خففي السرعة عند الحاجة وكوني مستعدة للتوقف وإعطاء الأفضلية وفق التنظيم.",
      "لا تتجاوزي مركبة متوقفة عند المعبر قبل فهم سبب توقفها؛ قد يكون أمامها مشاة لا ترينهم.",
      "بعد اجتياز منطقة العبور بأمان، راجعي المرايا والمحيط وعدّلي السرعة تدريجيًا وفق الطريق."
    ],
    "example": "ترين سيارة تتوقف قبل خطوط معبر مشاة وتحجب جزءًا من المنظر. لا تمرّي بجانبها بسرعة ظنًا أنها توقفت من دون سبب؛ قد يكون شخص يعبر أمامها.",
    "errors": [
      "النظر إلى مكان السيارات فقط وإهمال الرصيفين.",
      "التعامل مع طفل يقف عند المعبر باعتباره قادرًا على تقدير حركة السيارات بنفس دقة البالغين."
    ],
    "prompt": "توقفت مركبة قبل معبر وموقع المشاة لا يظهر لك؛ كيف تتصرفين؟",
    "answer": "عاملي المكان باعتباره خطرًا محتملًا للمشاة، وخففي واستعدي للتوقف وفق الوضع والتنظيم؛ لا تتجاوزي دون تحقق من سلامة العبور.",
    "homework": "راجعي دروس الإشارات والأولوية ومعابر المشاة معًا، ثم حلي اختبار الأسبوع دون الرجوع للشرح وسجلي سبب كل خطأ."
  }
]);

/* Original teaching guides, part 2 / 4. */
window.MasarGuides.register([
  {
    "id": 13,
    "foundation": "في الدروس الأولى عرفنا أجزاء الطريق. الآن سنقرأ المشهد بوصفه شبكة تعليمات: حدود المسارات، الجزيرة، مداخل الطرق الجانبية، مواقع التوقف، ولوحات اتجاه السير. كل عنصر يغيّر ما يجوز أن تفعليه بالمركبة.",
    "why": "قد يبدو مساران متجاوران متشابهين، لكن أحدهما ينتهي أو يتجه إلى مخرج. قراءة الطريق مبكرًا تساعدك على البقاء في المسار الصحيح وتقلل محاولات الاندماج المفاجئة.",
    "steps": [
      "افحصي الطريق أمامك إلى مسافة تسمح بقراءة اللوحات والأسهم قبل الوصول إليها.",
      "ابحثي عن خطوط حدود المسار؛ هل يتسع الطريق، يضيق، أم توجد منطقة فصل لا تعبرها المركبات؟",
      "حددي المدخل والمخرج ومعبر المشاة وخط التوقف في رسم واحد.",
      "اسألي قبل كل مناورة: هل المسار المختار يسمح بها؟ وهل توجد مساحة آمنة لتنفيذها؟"
    ],
    "example": "ترين خطًا متقطعًا يتحول إلى خط متصل قبل التقاطع. افهمي أن مرحلة الاقتراب من التقاطع تحتاج ترتيب مسارك قبل الوصول إلى المنطقة التي تمنع تغيير الاتجاه.",
    "errors": [
      "تفسير الأسهم الأرضية من لونها فقط بدل اتجاهها ونوعها.",
      "الاقتراب من المخرج بسرعة ثم قطع المسارات حتى لا يفوتك."
    ],
    "prompt": "لماذا نراقب الطريق قبل التقاطع بمسافة، بدل الاكتفاء بالنظر عند خط التوقف؟",
    "answer": "حتى نختار المسار الصحيح مبكرًا، ونرى العلامات والتقاطعات والمشاة ونخفف بطريقة تدريجية ومفهومة لبقية مستخدمي الطريق.",
    "homework": "استخدمي رسم الطريق في المرجع وحددي ستة عناصر تنظيمية. ثم قارني الرسم بما ترينه من مقعد الراكب."
  },
  {
    "id": 14,
    "foundation": "الخطوط الطولية المرسومة على الطريق توجه حركة المركبات وتحدد مواضع فصل المسارات. الخط المتقطع قد يسمح بالانتقال عندما يجيزه التنظيم ويتوفر الأمان، بينما الخط المتصل يدل عادة على تقييد عبوره. لا تُفهم الخطوط منفصلة عن اللوحات والسهام الأخرى.",
    "why": "الخط المرسوم يساعد السائقين على توقع مسارات بعضهم. عندما يتجاهله أحدهم تحدث مناورات مباغتة عند التقاطعات والمخارج والمنعطفات.",
    "steps": [
      "قارني بين رسم لخط متصل وآخر متقطع وحددي الفرق في الحركة المتوقعة.",
      "راجعي الأسهم الأرضية واللوحات القريبة قبل تقرير تغيير المسار.",
      "لا تعتمدي على الخط المتقطع وحده: فحص المرايا والنقطة العمياء والمسافة يظل ضروريًا.",
      "عند اختفاء التخطيط بسبب المطر أو أشغال الطريق، خففي بما يناسب الرؤية واتبعي التنظيم المؤقت."
    ],
    "example": "بينك وبين المسار المجاور خط متقطع، لكن توجد مركبة بجوارك مباشرة. الخط قد يسمح بالمناورة من حيث التخطيط، لكنه لا يجعل المسار خاليًا أو الانتقال آمنًا.",
    "errors": [
      "اعتبار المتقطع إذنًا مفتوحًا لعبوره في أي لحظة.",
      "اجتياز خط متصل فقط لأن الطريق يبدو فارغًا."
    ],
    "prompt": "هل يجوز تغيير مسارك فورًا لمجرد ظهور خط متقطع؟",
    "answer": "لا. يجب أن تسمح قواعد الطريق بالمناورة وأن تتحققي من سلامتها ووجود مسافة كافية، باستخدام الملاحظة والإشارة المناسبة.",
    "homework": "ارسمي ثلاثة أنواع من الحدود الأرضية واذكري في كل مثال ما الذي ستتحققين منه قبل الانتقال."
  },
  {
    "id": 15,
    "foundation": "اختيار المسار الصحيح قرار يبدأ قبل التقاطع وليس عند دخوله. في بعض الطرق مسار للانعطاف يمينًا، وآخر للسير المستقيم، وثالث قد يخدم أكثر من اتجاه. معنى السهم الأرضي واللوحات فوق الطريق أساسي لفهم وظيفة المسار.",
    "why": "خطأ اختيار المسار لا يُصحح دائمًا بمناورة سريعة. السائقة الآمنة تستطيع قبول تفويت المخرج والتوجه إلى طريق بديل بدل المخاطرة بقطع الطريق على الآخرين.",
    "steps": [
      "اقرئي اسم المخرج أو الاتجاه المرغوب به قبل الوصول إلى الأسهم.",
      "حددي المسار الذي يسمح بالحركة التي تريدين تنفيذها، واختاريه مبكرًا.",
      "عند الانتقال راقبي المرايا وأشيري وتحققي من النقطة العمياء والمسافة.",
      "إذا لم يتوفر وقت أو مكان آمن، استمري مع الاتجاه المسموح بدل مخالفة التخطيط."
    ],
    "example": "أنت في مسار يسار إجباري لكنك تريدين متابعة السير مباشرة. لا تتجاهلي السهم عند خط الوقوف؛ التزمي بالاتجاه المسموح وابحثي عن طريق تصحيحي لاحقًا.",
    "errors": [
      "الوقوف فجأة داخل مسار الحركة للتفكير في المخرج.",
      "القطع أمام المركبات من المسار غير الصحيح في آخر لحظة."
    ],
    "prompt": "عند اكتشاف مسار خاطئ قبل التقاطع بثوانٍ، ما الأولوية؟",
    "answer": "الالتزام بالتخطيط والتنظيم وعدم تنفيذ تغيير مسار غير آمن؛ يمكن تغيير الطريق لاحقًا بأمان.",
    "homework": "حددي ثلاثة سيناريوهات لمسارات بأسهم مختلفة، وارسمي المسار الذي ستختارينه لكل وجهة."
  },
  {
    "id": 16,
    "foundation": "علامة قف وعلامة أعط الأفضلية تنظمان من يمكنه مواصلة الحركة عند نقطة تعارض. قف تطلب التوقف الكامل في الموضع الصحيح، بينما أعط الأفضلية تركز على إفساح المجال لمن له حق المرور وقد تستلزم التوقف عندما توجد مركبات أو أشخاص يجب إفساح الطريق لهم.",
    "why": "الفارق ليس شكليًا. التباطؤ البسيط ليس كافيًا بدل التوقف الكامل عند قف، وفي المقابل الوقوف بلا سبب في موضع غير مناسب قد يفاجئ المركبات خلفك. المطلوب قراءة التنظيم والموقف معًا.",
    "steps": [
      "تعرفي إلى لوحة قف الثمانية ولوحة أعط الأفضلية المثلثة.",
      "ابحثي عن خط التوقف أو الموضع الذي يحدده التنظيم.",
      "توقفي تمامًا عند قف، وافحصي الجهات التي يمكن أن تأتي منها مركبات أو مشاة.",
      "عند أعط الأفضلية خففي واستعدي للتوقف، ولا تدخلي قبل إفساح الطريق لمن له الأفضلية."
    ],
    "example": "تقتربين من طريق رئيسي وعندك علامة أعط الأفضلية. سيارة قادمة في الطريق الرئيسي؛ لا تندفعي اعتمادًا على أن المسافة تبدو مقبولة من النظرة الأولى.",
    "errors": [
      "المرور البطيء على قف دون توقف كامل.",
      "اعتبار علامة أعط الأفضلية ترخيصًا بالدخول أمام المركبات لمجرد إعطاء الإشارة."
    ],
    "prompt": "ما الفرق العملي الأول بين لوحة قف ولوحة أعط الأفضلية؟",
    "answer": "قف تطلب توقفًا كاملًا، بينما أعط الأفضلية يركز على عدم إعاقة أصحاب الأولوية والتوقف عندما يلزم ذلك.",
    "homework": "استخدمي مرجع كتاب المتدربة وصفحتَي قف والأفضلية، ثم اكتبي موقفًا يكون فيه الوقوف إلزاميًا وآخر حسب الحركة."
  },
  {
    "id": 17,
    "foundation": "الضوء عند التقاطع لا يعمل وحده؛ اقرأيه مع خط الوقوف والأسهم واللوحات المرافقة وحركة المشاة. في التقاطعات التي تسمح بانعطاف يمين عند الإشارة الحمراء بشروط، لا يعني ذلك أن الانعطاف مسموح دائمًا أو دون توقف.",
    "why": "تختلف هندسة التقاطع وتوجد حالات تمنع الالتفاف، مثل سهم أحمر أو لوحة منع أو تنظيم خاص للمسار. قواعد الالتفاف عند الأحمر من المعلومات النظامية التي يجب مراجعتها في مرجع المرور الحالي قبل القيادة الفعلية.",
    "steps": [
      "حددي الإشارة الخاصة بمسارك، ولا تخلطي بين سهم اتجاه وبين الضوء العام.",
      "اقتربي من خط الوقوف بسرعة مناسبة واستعدي للتوقف في الموضع النظامي.",
      "إذا كنت تفكرين في الانعطاف عند الأحمر، تحققي أولًا من سماحه رسميًا وتنظيم الموقع وشروطه، ولا تتحركي دون إفساح الطريق للمشاة والمركبات.",
      "إذا ظهرت أي إشارة تمنع الانعطاف أو لم تتأكدي من شروطه، انتظري التنظيم الذي يسمح بالحركة بدل التخمين."
    ],
    "example": "سيارة خلفك تضغط المنبه وأنت عند إشارة حمراء تريدين اليمين، لكن لوحة واضحة تمنع الانعطاف. لا تتبعي ضغط السائق الآخر؛ الالتزام باللوحة مقدّم.",
    "errors": [
      "التعامل مع الأحمر كأنه يسمح آليًا بالالتفاف يمينًا في كل تقاطع.",
      "الخلط بين الإشارة العامة وسهم أحمر مضيء يخص اتجاه الحركة."
    ],
    "prompt": "إذا منع سهم أحمر مضيء الالتفاف، هل تتجاوزينه لأن الطريق خالٍ؟",
    "answer": "لا. اتبعي التنظيم الضوئي الخاص بالمسار واللوحات الموجودة، ولا تنفذي التفافًا محظورًا ولو بدا الطريق خاليًا.",
    "homework": "شاهدي مثالين لتقاطعين مختلفين في التنظيم؛ اكتبي ما الذي يسمح به الضوء والسهم واللوحات، وحددي موضع خط الوقوف."
  },
  {
    "id": 18,
    "foundation": "عندما تتقاطع المركبات يجب البحث عن مصدر تنظيم الحركة قبل محاولة تحديد من يمر أولًا. قد توجد إشارات ضوئية، أو رجل مرور، أو لوحات، أو تقاطع غير منظم. لكل حالة قاعدة يجب الرجوع إليها، فلا نستخدم «الأولوية لليمين» جوابًا لكل سؤال.",
    "why": "المخطط المروري أهم من ترتيب السيارات في الرسم. قد يظهر طريق رئيسي وفرعي، أو سهم انعطاف يخالف اتجاه مستقيم، أو عبور مشاة. تحليل الأطراف يمنع الحفظ السطحي لصور الاختبارات.",
    "steps": [
      "حددي نوع التقاطع: ثلاثي، رباعي، دوار، أو مدخل من مرفق.",
      "حددي وسائل التنظيم الفعلية قبل مقارنة اتجاهات السيارات.",
      "ارسمي مسارات المركبات المتقاطعة، وحددي من يتأثر بمسار من.",
      "راجعي قاعدة الأولوية الصحيحة لهذا التنظيم من المرجع ولا تبني الإجابة على حجم السيارة أو سرعتها."
    ],
    "example": "رسم يحتوي ثلاث سيارات مع لوحة قف على أحد المداخل. ابدئي بلوحة قف، لا بعدّ السيارات أو سؤال من جاء أولًا؛ بعدها انظري إلى تعارض مسارات المركبات الأخرى.",
    "errors": [
      "الافتراض أن المركبة الأكبر أو الأسرع لها الأفضلية.",
      "تطبيق قاعدة محفوظة من صورة سابقة رغم تغير الإشارات."
    ],
    "prompt": "أي عنصر يجب قراءته أولًا في سؤال أولوية تقاطع مصور؟",
    "answer": "تنظيم الموقع: إشارة أو رجل مرور أو لوحة وقوف أو أفضلية؛ ثم مواقع المركبات واتجاهات سيرها.",
    "homework": "خذي ثلاث مسائل أولوية، وحلي كل مسألة بأربعة أسطر: التنظيم، الجهات، تقاطع المسارات، ثم سبب القرار."
  },
  {
    "id": 19,
    "foundation": "الدوار تقاطع تتجمع فيه مداخل ومخارج حول جزيرة مركزية. في الدوار المعتاد تكون الأفضلية للمركبات التي تسير داخله، مع ضرورة قراءة أي إشارة أو تنظيم خاص قد يغير حركة المرور عند المدخل.",
    "why": "الدخول للدوار ليس سباقًا للفجوة الأقرب. يجب تقدير حركة السيارات الموجودة وسرعتها والمسار الذي تسلكه، مع الانتباه إلى مشاة عند المداخل والمخارج.",
    "steps": [
      "حددي المدخل والمخرج والجزيرة المركزية ومسارات السير في رسم الدوار.",
      "عند الاقتراب خففي وفق الحركة وراقبي المركبات الموجودة داخله ولوحات الأفضلية.",
      "لا تدخلي قبل وجود فرصة آمنة ومتاحة بحسب تنظيم الدوار.",
      "قبل الخروج تابعي مسارك والإشارة المناسبة والاهتمام بالمركبات والمشاة خارج الدوار."
    ],
    "example": "تريدين دخول دوار، وترين مركبة تقترب من داخل الدوار نحو مدخلك. لا تفترضي أنها ستخرج في آخر لحظة؛ انتظري اتضاح مسارها وفرصة دخول آمنة.",
    "errors": [
      "الدخول إلى الدوار لأن المركبات القادمة صغيرة أو تسير ببطء ظاهري.",
      "النظر إلى جهة واحدة ونسيان معبر المشاة والمركبات القريبة من المخرج."
    ],
    "prompt": "من الذي له الأفضلية عادة عند مدخل الدوار غير المنظم بإشارة ضوئية؟",
    "answer": "غالبًا المركبات الموجودة داخل الدوار، ما لم يحدد تنظيم الموقع خلاف ذلك؛ لا يجوز الدخول ما لم تتوفر فرصة آمنة.",
    "homework": "ارسمي دوارًا بسيطًا وحددي مركبتين بالداخل وثالثة على المدخل، واشرحي لماذا يجب على القادمة الانتظار."
  },
  {
    "id": 20,
    "foundation": "اختيار مسار الدوار والمخرج يعتمد على اللوحات والأسهم وعدد المسارات ومكان وجهتك. لا توجد قاعدة ثابتة واحدة مثل «أول مخرج يمين دائمًا من كل مسار» تصلح لكل دوار؛ تخطيط المكان هو الذي يحكم.",
    "why": "تتكرر الأخطاء عندما يحاول السائق تغيير مسارين دفعة واحدة قرب المخرج. التفكير في مخرجك قبل دخول الدوار يمنحك وقتًا لاتخاذ قرارات يمكن توقعها.",
    "steps": [
      "اقرئي العلامات قبل مدخل الدوار: أي مسار يخص المخرج الذي تريدينه؟",
      "تابعي التخطيط الأرضي والتزمِي بالمسار المسموح عند الدوران.",
      "قبل التحرك بين المسارات، تحققي من المرايا والنقطة العمياء وأعطي الإشارة وتحققي من وجود فرصة آمنة.",
      "إن فاتك المخرج فلا تقطعي الدوار بصورة مفاجئة؛ اتبعي التنظيم وابحثي عن طريقة آمنة لتصحيح المسار."
    ],
    "example": "أنت في مسار داخلي وتقتربين من المخرج، وفي الخارج سيارة تسير بجانبك. لا تنعطفي عبر مسارها؛ اتركي المخرج عند عدم إمكان الوصول إليه بأمان.",
    "errors": [
      "الاعتماد على قاعدة عامة عن عدد المخارج دون النظر إلى الأسهم.",
      "تغيير المسار داخل الدوار بلا مراقبة المركبات التي تسير بالتوازي."
    ],
    "prompt": "فوتِّ مخرجك من الدوار لأن الانتقال إليه غير آمن؛ ماذا تفعلين؟",
    "answer": "لا تنفذي قطعًا مفاجئًا؛ استمري بحسب تنظيم الدوار وابحثي عن فرصة نظامية آمنة للوصول إلى وجهتك.",
    "homework": "استخدمي رسم دوار بثلاثة مخارج، وجربي تغيير وجهتك وقارني المسارات المسموح بها وفق الأسهم المرسومة."
  },
  {
    "id": 21,
    "foundation": "الأولوية للمشاة ليست مجرد شكل لوحة. هي التزام باحترام تنظيم المعابر وحماية من يتحركون سيرًا على الأقدام، خصوصًا الأشخاص الذين يحتاجون وقتًا إضافيًا أو الذين قد لا يلاحظون اقتراب السيارة.",
    "why": "المشاة قد يخرجون من خلف حافلة أو مركبة متوقفة، وقد يتردد طفل على الرصيف ثم يعبر فجأة. لذلك تبدأ الملاحظة قبل الوصول إلى المعبر لا فوق خطوطه فقط.",
    "steps": [
      "ابحثي عن إشارات معبر المشاة والخطوط الأرضية والرصيفين.",
      "راقبي إن كان شخص ينتظر العبور أو يعبر بالفعل؛ خففي واستعدي للتوقف وفق التنظيم.",
      "إذا كانت مركبة أمامك توقفت قرب المعبر، فافترضي احتمال وجود شخص لا يظهر من زاويتك.",
      "عند الانعطاف قرب معبر، افحصي مسار المشاة الذي ستقطعينه قبل متابعة الحركة."
    ],
    "example": "تنعطفين من شارع جانبي إلى شارع رئيسي ويوجد معبر عند زاوية الانعطاف. لا تراقبي المركبات القادمة فقط؛ انظري إلى مسار من يعبر أمام مقدمتك أيضًا.",
    "errors": [
      "تجاوز مركبة متوقفة قبل معبر دون معرفة سبب توقفها.",
      "توقع أن الماشي سيبتعد لأن السيارة اقتربت منه."
    ],
    "prompt": "هل تستبدل نظرة واحدة إلى المعبر قبل مئة متر فحص المكان عند الاقتراب؟",
    "answer": "لا. يجب تجديد الملاحظة لأن المشهد قد يتغير بوجود أشخاص يدخلون منطقة العبور.",
    "homework": "سجلي من مقعد الراكب ثلاثة أماكن تظهر فيها حركة مشاة أكثر، وما العلامات التي تدل على اقترابك من معبر."
  },
  {
    "id": 22,
    "foundation": "تغيير المسار مهارة تجمع مراقبة المرايا واستخدام الإشارة وفحص النقطة العمياء والانتقال التدريجي. النقطة العمياء مساحة قد لا تظهر كاملة في المرايا؛ لهذا لا يكفي النظر السريع إلى المرآة الجانبية وحدها.",
    "why": "يشرح ملخص تقييم المهارة خطوات المرايا والإشارة وفحص الكتف ضمن تسلسل تدريبي. المهم فهم هدف كل خطوة لا حفظ حروف مختصرة ثم تنفيذها آليًا؛ ويجب تطبيق المهارة عمليًا بإشراف مؤهل.",
    "steps": [
      "اسألي أولًا: هل يسمح التخطيط الأرضي بتغيير المسار أصلًا؟",
      "افحصي حركة المرور في المرآة الوسطى والجانبية المناسبة، وحددي مسافة المركبات وسرعاتها بصورة عامة.",
      "أعطي إشارة الاتجاه الملائمة، ثم تحققي من المنطقة العمياء بطريقة آمنة دون إطالة صرف النظر عن الطريق أمامك.",
      "انتقلي تدريجيًا عند وجود مسافة آمنة، ثم ثبتي المسار وأوقفي الإشارة إذا لم تتوقف تلقائيًا."
    ],
    "example": "تريدين الانتقال يمينًا، لكن هناك دراجة نارية في المنطقة التي لا تراها المرآة بوضوح. فحص النقطة العمياء يمنع الانتقال إلى نفس المساحة.",
    "errors": [
      "اعتبار الإشارة طلبًا يلزم الآخرين بإفساح الطريق.",
      "تحويل الرأس لمدة طويلة وفقدان مراقبة الطريق الأمامي أثناء فحص الكتف."
    ],
    "prompt": "ما الذي يمكن أن تفوته المرايا حتى عندما تبدو مضبوطة جيدًا؟",
    "answer": "قد تخفي النقطة العمياء مركبة أو دراجة أو مستخدمًا آخر للطريق؛ لذلك تتكامل المرايا مع الملاحظة المباشرة المناسبة والمناورة الآمنة.",
    "homework": "راجعي شرح المرايا والنقطة العمياء من ملخص المهارات، واكتبي تسلسل الفحص بكلماتك دون حركة للسيارة."
  },
  {
    "id": 23,
    "foundation": "التجاوز مناورة تختلف عن تغيير مسار عادي؛ فهي تتضمن الاقتراب من مركبة أبطأ، والانتقال إلى مسار مناسب، ثم اجتيازها والعودة عند السماح والأمان. اختيار جهة التجاوز تحكمه أنظمة الطريق وعلاماته، وليس الرغبة في الوصول الأسرع.",
    "why": "قبل التجاوز يجب أن تكون الرؤية كافية وأن يسمح المكان والتخطيط والحركة بالمناورة. مجرد أن مركبة أمامك تسير ببطء لا يجعلك ملزمة بالتجاوز.",
    "steps": [
      "تحققي أن التجاوز مسموح في الموضع بحسب اللوحات والخطوط ومسارات الطريق.",
      "قدري هل توجد مساحة ورؤية ووقت كافٍ من دون الاقتراب المفرط من المركبة الأمامية.",
      "استخدمي المرايا والإشارة وفحص المنطقة العمياء قبل تغيير المسار.",
      "بعد تجاوز المركبة، لا تعودي إلى مسارها قبل توفر مسافة آمنة ورؤية مناسبة، ثم استقري في المسار."
    ],
    "example": "مركبة أمامك بطيئة والشارع أمامك يقترب من منعطف يحجب الرؤية. قد تكون أفضل مناورة هي عدم التجاوز أصلًا حتى تتوفر رؤية وتنظيم مناسب.",
    "errors": [
      "التجاوز في موضع رؤية غير كافية أو قرب تقاطع يمنع المناورة.",
      "العودة مباشرة أمام السيارة المتجاوزة دون ترك مسافة آمنة."
    ],
    "prompt": "هل يصبح التجاوز واجبًا بمجرد أن المركبة أمامك أبطأ؟",
    "answer": "لا؛ هو مناورة مشروطة بالسماح القانوني وتوفر السلامة والرؤية والمسافة، ويمكن الانتظار خلف المركبة عند عدم توافر الشروط.",
    "homework": "اكتبي خمسة أسئلة تراجعينها قبل التجاوز: هل مسموح؟ هل أرى؟ هل الطريق خالٍ؟ هل هناك مسافة؟ وكيف سأعود؟"
  },
  {
    "id": 24,
    "foundation": "يحظر التجاوز أو يكون غير آمن في مواضع تقل فيها الرؤية أو يضطرب فيها تنظيم الحركة. الأمثلة تشمل حالات الخطوط التي تمنع العبور، والمنعطفات العمياء، والاقتراب من مواقع عبور أو تقاطعات وفق التنظيم الساري.",
    "why": "المخاطر ليست في سرعة السيارة فقط. عند اقترابك من قمة مرتفع أو منحدر أو منعطف قد لا تري مركبة قادمة. وعند معبر مشاة يمكن أن تحجب السيارة التي أمامك شخصًا يعبر.",
    "steps": [
      "ابحثي أولًا عن إشارة منع التجاوز أو تخطيط أرضي لا يسمح بالانتقال.",
      "اسألي هل ترين المسافة المطلوبة أمامك أم يخفي المنعطف أو المرتفع جزءًا منها.",
      "راقبي التقاطعات والمعابر والمركبات المتوقفة على جانبي الطريق.",
      "إذا كانت الإجابة غير واضحة، اختاري البقاء خلف المركبة مع مسافة أمان بدل مناورة مخاطرة."
    ],
    "example": "تسيرين خلف مركبة أمام معبر مشاة وهي تبطئ. لا تتجاوزي على نحو قد يحجب عنك شخصًا يعبر؛ افحصي سبب التباطؤ أولًا.",
    "errors": [
      "الاعتماد على سرعة مركبتك العالية لتجاوز سريع في منطقة محظورة.",
      "تجاهل مخاطر الرؤية لأن الخط يبدو متقطعًا في جزء سابق من الطريق."
    ],
    "prompt": "ما المشكلة في تجاوز مركبة أمام معبر مشاة؟",
    "answer": "قد تحجب المركبة شخصًا يعبر، كما أن تنظيم موقع المعبر قد يمنع المناورة؛ الأولوية للسلامة وعدم تجاوز دون وضوح وقانونية.",
    "homework": "اختاري أربع صور من موضوع التجاوز في كتاب المتدربة، وصنفيها: مسموح وآمن، أو ممنوع، أو غير آمن بسبب عدم كفاية المعلومات."
  }
]);

/* Original teaching guides, part 3 / 4. */
window.MasarGuides.register([
  {
    "id": 25,
    "foundation": "السرعة الآمنة ليست دائمًا مساوية للحد الأعلى المكتوب على اللوحة. حد السرعة يوضح الحد النظامي حيث ينطبق، لكن الظروف قد تتطلب قيادة أبطأ: زحام، أطفال، مطر، ضباب، منعطف أو رؤية محدودة.",
    "why": "كلما زادت السرعة زادت المسافة التي تقطعها السيارة خلال لحظة ملاحظتك للخطر وزادت صعوبة التوقف في مساحة قصيرة. لا يعني وجود أنظمة فرامل حديثة أن قوانين الحركة لا تنطبق.",
    "steps": [
      "تعرّفي إلى لوحة الحد الأعلى للسرعة ومتى يتغير التنظيم بحسب اللوحات.",
      "راقبي مستوى الرؤية وحالة سطح الطريق وحركة المركبات والمشاة.",
      "اختاري سرعة تمنحك وقتًا للفهم والاستجابة ضمن الحد النظامي، وخففي قبل المخاطر لا داخلها فقط.",
      "اتركي مسافة مناسبة للمركبة الأمامية وتجنبي التسارع والتباطؤ العنيف غير الضروري."
    ],
    "example": "طريق حدّه الأعلى 100 كم/ساعة لكن المطر غزير والرؤية محدودة. لا تتعاملي مع 100 على أنه هدف يجب الوصول إليه؛ تقتضي الظروف سرعة أقل ومسافة أكبر.",
    "errors": [
      "الاعتقاد بأن الالتزام بالحد الأعلى يكفي وحده لقيادة آمنة.",
      "الفرملة المفاجئة قرب مطب أو منعطف كان يمكن توقعه من بعيد."
    ],
    "prompt": "إذا كان الحد الأعلى يسمح بسرعة معينة لكن الطريق زلق، ما المعيار الأهم؟",
    "answer": "الالتزام بالحد النظامي مع اختيار سرعة أقل إذا تطلبت الظروف ذلك حتى تتمكني من ملاحظة المخاطر والتوقف والتحكم بالمركبة بأمان.",
    "homework": "اكتبي أربعة عوامل تغير اختيار السرعة المناسبة، وقدمي مثالًا من طريق شاهدتِه بالفعل مع شخص يقود."
  },
  {
    "id": 26,
    "foundation": "مسافة التوقف تتكون من جزءين: مسافة تقطعها السيارة بينما تتعرف السائقة على الخطر وتبدأ الاستجابة، ثم مسافة تقطعها أثناء التباطؤ بالفرامل حتى تتوقف. كلاهما يتأثر بالسرعة والظروف.",
    "why": "لنفهم الفكرة بحساب تعليمي بسيط: السيارة عند 60 كم/ساعة تقطع نحو 16.7 مترًا في ثانية واحدة قبل احتساب الفرملة، بينما عند 90 كم/ساعة تقطع نحو 25 مترًا في الثانية. هذه مسافة الحركة خلال ثانية فقط، وليست رقمًا ثابتًا لمسافة التوقف.",
    "steps": [
      "ميزي زمن رد الفعل عن زمن عمل الفرامل؛ الأول يحدث قبل بدء التباطؤ الفعلي.",
      "تذكري أن مضاعفة السرعة لا تعني بالضرورة مضاعفة مسافة الفرملة فقط؛ التغير قد يكون أكبر بحسب الظروف.",
      "ضعي في الحسبان سطح الطريق والإطارات والرؤية وتعب السائقة.",
      "عند رؤية خطر بعيد، خففي تدريجيًا في وقت مناسب بدل انتظار اللحظة الأخيرة."
    ],
    "example": "أمامك سيارة تتوقف فجأة، وتحتاجين ثانية لتدركي الخطر. إذا كنت تسيرين 90 كم/ساعة فقد قطعت السيارة نحو 25 مترًا خلال هذه الثانية وحدها قبل مسافة الفرملة.",
    "errors": [
      "الخلط بين مسافة رد الفعل ومسافة الفرملة وكأنهما الشيء نفسه.",
      "اعتبار الأرقام التقريبية في ورقة اختبار قياسًا مضمونًا لكل سيارة وطريق."
    ],
    "prompt": "لماذا تزيد مسافة التوقف مع السرعة حتى لو لم يتغير زمن رد فعلك؟",
    "answer": "لأن السيارة تقطع أمتارًا أكثر خلال زمن رد الفعل، وغالبًا تحتاج مسافة فرملة أكبر كلما ارتفعت سرعتها، مع اختلاف المسافة حسب التماسك وحالة المركبة.",
    "homework": "جرّبي حساب مسافة الحركة في ثانية واحدة لسرعتَي 36 و72 كم/ساعة باستخدام قسمة السرعة بالكيلومتر/ساعة على 3.6."
  },
  {
    "id": 27,
    "foundation": "مسافة الأمان هي المجال الذي تتركينه أمام مركبتك لتستجيبي إذا تباطأت السيارة الأمامية أو توقفت. يمكن استخدام عد الثواني بين مرور السيارة الأمامية بنقطة ثابتة ومرور سيارتك بالنقطة نفسها كطريقة تعليمية لفهم الفاصل الزمني.",
    "why": "يذكر ملخص التقييم قاعدة الثانيتين في الظروف الجيدة ومضاعفة المسافة عند سوء الرؤية أو التماسك. هذه نقطة بداية تعليمية لا تضمن السلامة في كل سرعة أو طقس؛ لا بد من زيادتها بحسب المطر والضباب وحالة الطريق.",
    "steps": [
      "اختاري علامة ثابتة على جانب الطريق مثل عمود أو لوحة.",
      "عندما تمر المركبة الأمامية بالعلامة، ابدئي عد الثواني حتى تصل مركبتك إلى النقطة نفسها.",
      "إذا كان الفاصل قصيرًا جدًا، خففي لتوسيع المسافة تدريجيًا دون فرملة متهورة.",
      "عند المطر أو سوء الرؤية أو خلف مركبة كبيرة تحجب المشهد، اتركي هامشًا أكبر مناسبًا للظروف."
    ],
    "example": "تتابعين مركبة في طريق مبلل، والفاصل بينكما ثانيتان فقط. لا تعتبري الرقم سحرًا؛ يحتاج الطريق المبلل مجالًا إضافيًا لأن التماسك والرؤية قد يتغيران.",
    "errors": [
      "قياس المسافة بعدد أمتار واحد لجميع السرعات والظروف.",
      "زيادة السرعة عمدًا عندما يدخل أحد أمامك لتضييق الفراغ."
    ],
    "prompt": "لماذا نستخدم النقطة الثابتة عند عد الثواني؟",
    "answer": "لأنها تجعل المقارنة الزمنية ممكنة بين مرور المركبتين بالنقطة نفسها، بدل التخمين البصري من حجم السيارة.",
    "homework": "أثناء ركوبك مع أخوك كراكبة راقبي الفاصل الزمني بطريقة العد، وسجلي كيف يتغير مع الزحام دون تشتيت السائق."
  },
  {
    "id": 28,
    "foundation": "القيادة الوقائية تعني توقع الخطأ أو الخطر قبل أن يفرض نفسه عليك. بدلاً من التركيز على السيارة أمامك وحدها، اقرئي الطريق البعيد والقريب والجانبين والمرايا، وابحثي عن أشخاص أو مركبات يمكن أن تدخل مسارك.",
    "why": "الملاحظة الجيدة تمنحك وقتًا لتختاري استجابة سلسة: تخفيف السرعة، توسيع المسافة، أو الاستعداد للتوقف. هدفها ليس توقع كل شيء بدقة، بل تقليل المفاجآت.",
    "steps": [
      "انظري إلى المشهد البعيد لمعرفة تغير المسارات والإشارات والزحام.",
      "امسحي المنطقة القريبة بحثًا عن مركبات تبطئ أو مشاة أو عوائق.",
      "توقعي أكثر من احتمال: ماذا لو خرجت سيارة من الموقف أو عبر طفل؟",
      "اختاري إجراء وقائيًا مبكرًا ومتناسبًا مع المخاطر بدل الاستجابة الحادة المتأخرة."
    ],
    "example": "أمامك صف سيارات مركونة وبينه فتحة لا ترى ما خلفها. قد تخرج مركبة أو شخص؛ خففي وفق المكان واتركي مجالًا جانبيًا مناسبًا وتابعي الرصد.",
    "errors": [
      "تركيز النظر على نقطة واحدة حتى تغيب الأخطار من الجوانب.",
      "افتراض أن السائقين الآخرين سيستخدمون الإشارات ويطبقون الأفضلية دائمًا."
    ],
    "prompt": "ما الفرق بين قيادة رد الفعل والقيادة الوقائية؟",
    "answer": "الأولى تستجيب بعد ظهور الخطر بشكل مفاجئ، أما الوقائية فتبني هامش أمان عبر ملاحظة مبكرة وتوقع معقول لتغير الموقف.",
    "homework": "اكتبي ثلاثة مواقف من الشارع تبدأ بعبارة «ماذا لو؟»، ثم اختاري لكل منها استجابة استباقية بسيطة."
  },
  {
    "id": 29,
    "foundation": "العادات الخطرة أثناء القيادة تشمل استخدام الجوال، والتشتت، ومتابعة الطريق من دون مسافة كافية، والمناورات المفاجئة، والتسرع، والقيادة عند الإرهاق الشديد. ليست الخطورة محصورة في المخالفة المباشرة؛ قد تكون في ضعف القدرة على رؤية الخطر والاستجابة له.",
    "why": "حتى التشتت القصير يغير مكان السيارة بينما ينصرف انتباه السائقة. كذلك قد يقود الغضب أو الرغبة في ملاحقة سيارة إلى قرارات متعجلة. إدراك تأثير المشاعر والتعب جزء من التعليم الوقائي.",
    "steps": [
      "قبل الحركة اضبطي وجهتك وموسيقاك واحتياجاتك لتقليل التعامل مع الشاشة.",
      "أبقي الانتباه على الطريق؛ إذا احتجتِ إجراء يتطلب تركيزًا، توقفي في مكان نظامي آمن.",
      "تجنبي الالتصاق بالمركبة الأمامية أو الضغط على من يقود ببطء.",
      "إذا كنت مرهقة أو تركيزك متدهورًا، أعيدي تقييم ملاءمة القيادة وخذي راحة مناسبة."
    ],
    "example": "رنّ هاتفك أثناء اقترابك من تقاطع. لا تبحثي عن الهاتف أو تكتبي ردًا خلال الحركة؛ انتبهي للطريق واختاري مكانًا آمنًا إذا لزم التواصل.",
    "errors": [
      "الاعتقاد أن النظر إلى الشاشة لثانية لا يغير السيطرة على المركبة.",
      "اتخاذ تصرف انتقامي عندما يقطع سائق آخر المسار أمامك."
    ],
    "prompt": "ما الرابط بين الغضب والمسافة التي تتركينها للسيارة الأمامية؟",
    "answer": "الغضب قد يدفع إلى التسارع أو تقليص المسافة واتخاذ قرارات اندفاعية، فتقل مساحة ووقت الاستجابة للخطر.",
    "homework": "أعدّي لنفسك قائمة من ثلاث مشتتات شائعة، وقرارًا واضحًا لتجنب كل واحدة قبل الانطلاق."
  },
  {
    "id": 30,
    "foundation": "اختبار اكتشاف الخطر بالفيديو لا يطلب دائمًا معرفة اسم اللوحة؛ بل يسألك متى بدأ خطر يتطور إلى موقف يستلزم الانتباه أو تغيير القرار. مثل ظهور عجلة دراجة خلف حافلة، أو مركبة تتحرك من موقف، أو مشاة يقتربون من حافة الرصيف.",
    "why": "عندما تشاهدين المقطع مرة ثانية ستلاحظين إشارات مبكرة لم تريها أولًا. هذه المهارة تقوي الملاحظة؛ لكن الفيديو لا يحل محل تقييم الطريق الحقيقي أثناء التدريب النظامي.",
    "steps": [
      "شاهدي أولًا دون إيقاف وحددي أين انتقل المشهد من عادي إلى موقف يحتمل خطرًا.",
      "في المشاهدة الثانية أوقفي عند أول علامة للخطر، واكتبي الدقيقة والثانية.",
      "اشرحي ماذا يمكن أن يحدث خلال ثوانٍ وما استجابتك الوقائية المناسبة.",
      "قارني توقعك بما حدث في المقطع، وميّزي بين خطر محتمل وخطر بدأ بالفعل."
    ],
    "example": "حافلة متوقفة قرب معبر، ويظهر ظل حركة بجانبها. قد يخرج شخص من خلفها؛ لا تنتظري رؤية الشخص في مسارك حتى تبدأي ملاحظة الخطر.",
    "errors": [
      "الضغط على الإجابة بعد وقوع الحدث بدل تحديد مؤشر الخطر المبكر.",
      "حفظ ترتيب المشاهد دون أن تقدري على تفسير سبب الخطر."
    ],
    "prompt": "أيّهما أدق في تحليل فيديو: «ظهر طفل أمام السيارة» أم «كانت هناك كرة تتحرك نحو الشارع قبل ظهور الطفل»؟",
    "answer": "الثانية تشير إلى مؤشر مبكر يساعد على التوقع، بينما الأولى تصف الخطر بعد ظهوره بالفعل.",
    "homework": "شاهدي مقطعًا قصيرًا تعليميًا موثوقًا مرتين، وسجلي ثلاث لقطات زمنية: العلامة الأولى، تطور الخطر، الاستجابة المناسبة."
  },
  {
    "id": 31,
    "foundation": "الموقف أو الركن يختلف باختلاف اتجاه الدخول والمساحة المتاحة: أمامي، خلفي، جانبي أو موازٍ للرصيف. الهدف ليس إدخال السيارة داخل الخطوط فقط، بل اختيار موقف مسموح وآمن يمكن الوصول إليه والخروج منه دون إزعاج المشاة والمركبات.",
    "why": "يعرض كتيب مدرسة شرق وملخص التقييم رسومات لعدة مواقف. نقاط تدوير المقود المذكورة فيها تعتمد على أبعاد مركبات التدريب ومواقع العلامات، ولذلك لا يصح تعميم عدد لفات المقود على كل هوندا أكورد.",
    "steps": [
      "قبل اختيار الموقف تأكدي أن الوقوف مسموح ولا يحجب مخرجًا أو معبرًا.",
      "راقبي حدود الموقف والمركبات والعوائق والأشخاص حوله.",
      "ميّزي مفهوميًا بين الدخول للأمام والرجوع للخلف والركن الموازي.",
      "تعلمي كيف تستخدمين المرايا مع فحص المحيط في كل مرحلة، ثم اتركي تنفيذ الحركة الفعلية لتدريب مؤهل."
    ],
    "example": "موقف ضيق جدًا بين سيارتين بينما هناك موقف آخر أوسع قليلًا. في مرحلة التعلم اختيار الموقف الآمن الأوسع أفضل من الإصرار على أول فراغ.",
    "errors": [
      "حفظ «لفة ونصف» أو نقطة مرايا كقاعدة ثابتة لكل سيارة.",
      "الاعتماد على خطوط الموقف وحدها ونسيان طفل أو عربة تسير خلف السيارة."
    ],
    "prompt": "لماذا قد تختلف نقطة بداية تدوير المقود عند الركن بين سيارة وأخرى؟",
    "answer": "بسبب اختلاف طول السيارة والعجلات ونصف قطر الدوران وأبعاد الموقف وزاوية الاقتراب؛ التفاصيل تحتاج تدريبًا عمليًا يناسب المركبة.",
    "homework": "قارني رسومات المواقف الثلاثة في كتاب مدرسة شرق، ثم اكتبي كيف تختلف مساحة الرؤية المطلوبة في كل نوع."
  },
  {
    "id": 32,
    "foundation": "الرجوع للخلف مناورة تحتاج ملاحظة إضافية لأن مجال الرؤية خلف المركبة أقل من الأمام، وقد توجد عوائق منخفضة لا تظهر في المرايا بسهولة. كما أن الرجوع للخلف يختلف عن الالتفاف U-turn؛ الأول حركة بالناقل R والثاني مناورة تغير اتجاه السير.",
    "why": "الخلط بين «الرجوع للخلف» بمعنى الحركة للخلف و«الدوران للخلف» U-turn يسبب سوء فهم للأسئلة والتعليمات. يجب تحديد المقصود من السياق قبل حل التمرين.",
    "steps": [
      "عرّفي اتجاه حركة السيارة في وضع R مقابل اتجاه السير بعد دوران U.",
      "قبل التراجع افحصي محيط المركبة والمشاة والأجسام المنخفضة.",
      "افهمي أهمية الحركة البطيئة القابلة للتحكم والإيقاف عند عدم وضوح المسار.",
      "إذا كان التدريب يتعلق بدوران U، راجعي اللوحات وخطوط الطريق والمسارات المسموحة، ولا تطبقي نقاط الدوران آليًا."
    ],
    "example": "تريدين الخروج من موقف خلفي، وخلف سيارتك مساحة غير ظاهرة في الشاشة. قبل أي حركة فعلية يجب فحص المكان؛ الكاميرا قد لا تكشف كل الأشخاص والأجسام.",
    "errors": [
      "استخدام الكاميرا فقط دون النظر حول السيارة.",
      "اعتبار وصف U-turn في ملخص التدريب مرادفًا لوضع القير R."
    ],
    "prompt": "ما الفرق الأساسي بين Reverse وU-turn؟",
    "answer": "Reverse يعني تحريك المركبة للخلف، بينما U-turn تغيير اتجاه السير إلى الاتجاه المعاكس بمناورة مسموحة، وقد يتحقق دون الرجوع بالسيارة للخلف.",
    "homework": "ارسمي حركة السيارة في تراجع مستقيم وفي دوران U، وضعي أسهمًا توضّح اتجاه الحركة في كل مثال."
  },
  {
    "id": 33,
    "foundation": "الخروج من الموقف بالرجوع للخلف يبدأ قبل تحريك السيارة: تأكدي من عدم وجود مشاة أو عوائق خلفها، وحددي الاتجاه الذي ستدخلين إليه عندما تصيرين في الممر. وجود حساسات أو كاميرا يساعد لكنه لا يضمن رؤية المحيط كله.",
    "why": "تكثر حركة المشاة والعربات الصغيرة في المواقف، كما قد تدخل مركبة أخرى إلى الممر بينما تتراجعين. الانتباه المتجدد أهم من فحص واحد في البداية فقط.",
    "steps": [
      "حددي أولًا الجهة التي تريدين الوصول إليها بعد الخروج من الموقف.",
      "افحصي المساحة الخلفية والجانبين والممر المتقاطع مع خط خروجك.",
      "اعرفي من أين ستظهر المركبات والمشاة أثناء الحركة للخلف، وما الذي تحجبه السيارات المركونة.",
      "توقفي عن المناورة عند عدم وضوح حركة مستخدمي الممر إلى أن يصبح الاستمرار آمنًا وفق تدريب المدربة."
    ],
    "example": "بينما تتراجعين نظريًا في رسم تعليمي، دخل شخص من جهة السيارة المركونة المجاورة. القرار ليس متابعة الحركة لأن الممر كان فارغًا عند البداية؛ الموقف تغير.",
    "errors": [
      "فحص المحيط مرة واحدة ثم متابعة المناورة دون تحديث الملاحظة.",
      "رفع السرعة للخروج سريعًا قبل مرور مركبة قادمة في الممر."
    ],
    "prompt": "لماذا لا يكفي كون الممر فارغًا قبل بدء الرجوع للخلف؟",
    "answer": "لأن مركبات أو أشخاصًا قد يدخلون المساحة خلال الحركة؛ تحتاج السائقة إلى مراقبة مستمرة واستعداد للتوقف.",
    "homework": "استخدمي مخطط موقف من كتاب التدريب العملي، وحددي ثلاث مناطق قد يخرج منها خطر خلال الرجوع."
  },
  {
    "id": 34,
    "foundation": "الركن الموازي يضع السيارة بمحاذاة الرصيف بين مساحتين أو مركبتين، وهو أصعب من الحفظ اللفظي لأنك تحتاجين فهم المسافات واتجاه عجلات المركبة والمحيط الأمامي والخلفي.",
    "why": "رسومات الملخص العملي تقدم نقاط مرجعية للتدريب، لكنها ليست وصفة موحدة لكل مركبة. يجب أن يكون الأساس مراقبة المكان وتقدير المسافات وإجراء التعديل المناسب تحت إشراف مدربة.",
    "steps": [
      "تعرفي إلى حدود المساحة المطلوب ركن السيارة داخلها وهل الوقوف مسموح.",
      "افهمي كيف يغير اتجاه المقود مسار السيارة عند الرجوع للخلف دون تجربة الحركة قبل التدريب المعتمد.",
      "حددي في الرسم المواضع التي يجب عندها مراقبة مقدمة السيارة ومؤخرتها والرصيف والمركبات المحيطة.",
      "بعد الركن، تأكدي نظريًا أن السيارة لا تحجب الطريق أو معبرًا وأن تأمينها يتم وفق دليل السيارة."
    ],
    "example": "أنت تتدربين على رسم ركن موازٍ. عندما يقترب الجزء الخلفي من الرصيف، يجب أن تضعي في الحساب مسار المقدمة التي قد تبرز نحو الطريق أثناء تعديل الاتجاه.",
    "errors": [
      "محاولة تقليد «عدد لفات مقود» من سيارة مدرسة تختلف عن مركبتك.",
      "التركيز على العجلة الخلفية ونسيان مقدمة السيارة والمشاة."
    ],
    "prompt": "لماذا نحتاج مراقبة مقدمة السيارة عند الركن الموازي للخلف؟",
    "answer": "لأن المقدمة قد تتحرك جانبًا أثناء تغيير اتجاه المقود، ويجب التأكد من عدم اقترابها من مركبة أو شخص.",
    "homework": "اشرحِي بالكلمات ما الذي يحدث لمقدمة السيارة ومؤخرتها في رسم ركن موازٍ، واستفسري من المدربة عن نقاط المرجع المناسبة للأكورد."
  },
  {
    "id": 35,
    "foundation": "ترد في بعض مناهج المدارس تدريبات موسومة X وT وY والكراج. هذه أسماء وتمارين تستخدم داخل ساحات التدريب لتعليم تغيير الاتجاه والمناورة بين حدود أو علامات. قد يختلف تعريف كل رسم أو طريقة تقييمه بين مدرسة وأخرى.",
    "why": "الأهم ليس الاسم المختصر بل الهدف الحركي: إدراك الأبعاد، وتوجيه العجلات، وتقدير الفراغ، وفحص المحيط. المناورة في ساحة التدريب ليست تصريحًا بتطبيقها على الطريق العام بالطريقة نفسها.",
    "steps": [
      "افتحي صفحة المناورة في منهج جدة المتطورة وحددي شكل المسار وحدوده.",
      "قارني حركة السيارة المتوقعة في رسم U وT وX أو Y دون محاولة دمجها في مناورة واحدة.",
      "اكتبي أين يجب أن تتوقف المركبة للملاحظة والتقييم قبل تغيير الاتجاه.",
      "اسألي المدرسة مستقبلًا عن المقاييس وعدد المحاولات وأسماء المهارات المعتمدة لديها، لأنها تختلف."
    ],
    "example": "في تمرين T توجد مساحة صغيرة للتغيير بين اتجاهات حركة، وفي الكراج الهدف دخول مساحة محددة. كل منهما يختبر أبعاد السيارة والملاحظة، لكن خطوات المقود التي تنجح بسيارة صغيرة قد لا تنجح بأكورد أطول.",
    "errors": [
      "اعتبار تعليمات مدرسة بعينها نظامًا عامًا لجميع مدارس السعودية.",
      "استخدام الاسم X أو Y دون فهم أي حركة يفترض تنفيذها بالضبط."
    ],
    "prompt": "لماذا لا نعتمد عدد لفات المقود من كتيب تدريب مختلف باعتباره قاعدة لسيارتك؟",
    "answer": "لاختلاف أبعاد السيارة ونصف قطر دورانها ومقاييس ساحة المدرسة وعلامات التقييم، لذا يلزم توجيه عملي مطابق للمركبة والمنهج.",
    "homework": "ارسمي ثلاثة مسارات من المنهج العملي، وحددي لكل مسار هدف المهارة ومكان مراقبة العوائق."
  },
  {
    "id": 36,
    "foundation": "عند التوقف أو الانطلاق على طريق مائل، تؤثر الجاذبية في حركة المركبة أكثر من الطريق المستوي. تهدف وسائل مثل دواسة الفرامل وفرامل التوقف وبعض أنظمة المساعدة إلى إبقاء السيارة تحت السيطرة وفق طريقة التشغيل الصحيحة.",
    "why": "قد تتضمن هوندا أكورد نظام تثبيت فرامل أو مساعدة بدء الصعود في بعض الفئات، لكن وجود النظام وطريقة عمله يختلفان حسب سنة السيارة، ولا يغنيان تلقائيًا عن الإجراءات المعتمدة في دليلها.",
    "steps": [
      "تعرفي إلى الفرق بين التوقف المؤقت على مرتفع وركن السيارة وتركها.",
      "راجعي مكان فرامل التوقف في سيارتك ونوعها قبل تعليم أي تسلسل أزرار.",
      "افهمي أن الاتجاه المائل يخلق ميلًا للحركة عند تحرير الفرامل؛ لذلك لا تُجرب المناورة دون إشراف مناسب.",
      "عند الحديث عن ركن المركبة على منحدر، راجعي طريقة تأمينها من دليل مالك المركبة وقواعد الوقوف في مكانك."
    ],
    "example": "توقفت سيارة تدريب على مرتفع خلف مركبة أخرى. الهدف أن تبقى المسافة آمنة وأن لا تتحرك للخلف عند استئناف السير. لا تفترضي أن زر Brake Hold موجود أو مُفعّل دون التحقق.",
    "errors": [
      "اعتبار وضع P بديلًا كاملًا عن إجراءات تأمين الركن الموصى بها من الشركة.",
      "استخدام نظام مساعد لم تتم معرفة وجوده أو طريقة تشغيله في فئة السيارة."
    ],
    "prompt": "لماذا تتغير إجراءات تأمين المركبة عند الوقوف في طريق مائل؟",
    "answer": "لأن الجاذبية قد تجعلها تتحرك في اتجاه الميل عند عدم تثبيتها بصورة مناسبة، فيجب تطبيق تعليمات الشركة والتنظيم المحلي.",
    "homework": "قارني الوصف العام في ملخص ناريمان ومنهج جدة مع دليل سيارة أكورد عند معرفة الموديل؛ اكتبي الأسئلة التي ستطرحينها على المدربة."
  }
]);

/* Original teaching guides, part 4 / 4. */
window.MasarGuides.register([
  {
    "id": 37,
    "foundation": "عند المطر تقل جودة الرؤية وقد يتغير تماسك الإطارات مع الطريق. ليس كل سطح مبتل له درجة الخطورة نفسها؛ فوجود ماء متجمع أو بقع زيت أو إطارات غير مناسبة يزيد صعوبة التحكم.",
    "why": "في الظروف الرطبة قد تحتاج المركبة وقتًا ومسافة أكبر للتباطؤ، كما قد تحجب رذاذات المركبات الأخرى الرؤية. لذلك يعتمد القرار على تخفيف السرعة بما يناسب الوضع وترك مسافة أمان أكبر.",
    "steps": [
      "قبل الرحلة راجعي حالة المساحات والأنوار والإطارات بصورة عامة.",
      "عند بدء المطر خففي السرعة تدريجيًا وزيدي مسافة الأمان، ولا تعتمدي على الحد الأعلى للسرعة كهدف.",
      "تجنبي المناورات الحادة غير الضرورية والفرملة القوية التي قد تقلل السيطرة.",
      "إذا واجهتِ ماءً متجمعًا أو انخفضت الرؤية بدرجة كبيرة، أعيدي تقييم استمرار الرحلة واخترِي التوقف في مكان آمن عند الحاجة."
    ],
    "example": "دخلتِ طريقًا سريعًا وبدأ المطر مع رش الماء من سيارة كبيرة أمامك. لا تقتربي منها لتحتمي من الريح؛ وسعي الفاصل وقللي السرعة المناسبة للمشهد لتحسني الرؤية ووقت الاستجابة.",
    "errors": [
      "استخدام مثبت السرعة أو أنظمة المساعدة دون فهم حدودها عند ضعف التماسك.",
      "الفرملة المفاجئة فوق بقعة ماء مع وجود مجال للتخفيف قبلها."
    ],
    "prompt": "لماذا تزداد مسافة الأمان في المطر حتى لو كان السائق يقود تحت الحد الأعلى؟",
    "answer": "لأن تماسك الإطارات والرؤية قد يقلان، ويمكن أن تزيد المسافة اللازمة للاستجابة والتوقف بأمان.",
    "homework": "شاهدي رسمًا لطريق جاف وآخر مبلل، واكتبي ثلاثة فروق في اختيار السرعة والمسافة وطريقة المناورة."
  },
  {
    "id": 38,
    "foundation": "الغبار والضباب يخفضان مدى الرؤية أمام المركبة ويجعلان تقدير المسافة أصعب. قد يظهر العائق قريبًا فجأةً، أو تبدو سرعة المركبات الأخرى مختلفة عن حقيقتها بسبب ضعف التباين البصري.",
    "why": "الاستجابة لا تقتصر على تشغيل الأنوار. يجب اختيار سرعة تسمح بالتوقف ضمن المسافة التي تستطيعين رؤيتها، وتوسيع الفاصل عن المركبة الأمامية وتجنب التجاوز عندما لا تكون الرؤية كافية.",
    "steps": [
      "راقبي مدى وضوح الخطوط والحواجز والمركبات قبل الدخول في منطقة رؤية محدودة.",
      "خففي السرعة تدريجيًا واتركي مسافة أكبر؛ لا تتبعي أضواء السيارة الأمامية على مسافة قريبة.",
      "عادةً تُستخدم الأنوار المنخفضة والضباب المناسبة عند الحاجة، مع الرجوع لتعليمات المركبة والتنظيم؛ العالي قد يسبب انعكاسًا مزعجًا.",
      "إذا تعذرت الرؤية اللازمة للاستمرار بأمان، ابحثي عن موضع توقف نظامي بعيد عن حركة السير قدر الإمكان."
    ],
    "example": "أنت على طريق بدأ فيه الغبار يغطي العلامات الأرضية. لا تحاولي تجاوز سيارة بطيئة رغم أنك لا ترين ما وراءها بوضوح؛ قللي السرعة وأجلي المناورة.",
    "errors": [
      "استخدام الضوء العالي ظنًا أنه يحسّن الرؤية دائمًا داخل الضباب.",
      "التوقف المفاجئ داخل مسار السير دون ضرورة أو دون تقييم لسلامة موضع التوقف."
    ],
    "prompt": "ما العلاقة بين مدى الرؤية والسرعة المختارة في الضباب؟",
    "answer": "ينبغي أن تسمح السرعة بالتوقف داخل المسافة التي ترينها بصورة كافية، ولذلك يقلل ضعف الرؤية السرعة الآمنة المتاحة عادة.",
    "homework": "اكتبي مقارنة بين المطر والغبار والضباب: كيف تختلف المشكلة البصرية؟ وما السلوك الوقائي المشترك؟"
  },
  {
    "id": 39,
    "foundation": "القيادة الليلية تحتاج توزيع الانتباه بين الطريق والعلامات والمشاة والأضواء القادمة من المركبات. الأنوار المنخفضة والعالية وأنوار الضباب ليست أسماء لسطوع مختلف فقط؛ لكل نوع وظيفة وحدود استخدام حسب الرؤية والتنظيم.",
    "why": "قد يسبب النور العالي إبهارًا للسائق المقابل أو الذي أمامك عبر المرايا، ويقلل قدرته على رؤية الطريق. كذلك قد تكون الملابس الداكنة للمشاة صعبة الرؤية في الأماكن ذات الإضاءة الضعيفة.",
    "steps": [
      "راجعي وظيفة أنوار الموضع والمنخفض والعالي والإشارات وأنوار الضباب وفق دليل السيارة.",
      "استخدمي إنارة مناسبة للطريق، وخففي إلى المنخفض عندما قد يسبب العالي إبهارًا لمستخدم آخر.",
      "راقبي جوانب الطريق ومسار المشاة أكثر في الأماكن غير المضاءة.",
      "إذا تعرضتِ لإبهار شديد، تجنبي النظر المباشر إلى المصدر وركزي على المحافظة على مسارك والتحكم الآمن."
    ],
    "example": "تسيرين في طريق مظلم مستخدمة النور العالي، وظهرت مركبة مقابلة. الانتقال إلى النور المنخفض في وقت مناسب يحمي قدرة السائقين الاثنين على الرؤية.",
    "errors": [
      "نسيان تغيير النور العالي عند الاقتراب من المركبات.",
      "الاعتماد على الأنوار وحدها مع سرعة أكبر من مدى الرؤية المتاح."
    ],
    "prompt": "لماذا لا نستخدم النور العالي دائمًا لمجرد أن الطريق مظلم؟",
    "answer": "لأنه قد يبهر السائقين الآخرين، كما أن فائدته تختلف حسب الظروف؛ يجب اختيار نوع الإنارة الملائم دون تعريض الآخرين للخطر.",
    "homework": "حددي من دليل المتدربة رموز الإنارة الرئيسة، ثم قارنيها بلوحة سيارة أكورد عند معرفة سنة الموديل."
  },
  {
    "id": 40,
    "foundation": "عطل السيارة على الطريق قد يحدث من إطار أو محرك أو نظام كهربائي أو مؤشر حرارة أو غير ذلك. التصرف الأول هو المحافظة على السيطرة وتقييم أين يمكن التوقف بأمان، لا محاولة تشخيص العطل بينما المركبة تتحرك.",
    "why": "التوقف في مسار سريع أو النزول إلى جانب حركة المرور قد يعرضك لخطر أكبر من العطل نفسه. لذلك تعتمد الأولويات على المكان وحركة المركبات والرؤية ونوع التحذير.",
    "steps": [
      "إذا ظهر تحذير مهم أو فقدت المركبة أداءها، حافظي على الانتباه للمسار وابحثي عن أقرب موضع توقف آمن حسب الحالة.",
      "استخدمي التحذير الرباعي وفق الحاجة والتنظيم لتنبيه المركبات الأخرى.",
      "بعد التوقف قيّمي سلامة البقاء داخل المركبة أو الانتقال إلى مكان أكثر أمانًا بحسب موقعها وحركة المرور.",
      "اطلبي المساعدة المناسبة ولا تعملي على إصلاح خطر في جانب طريق سريع أو عند حركة مركبات قريبة."
    ],
    "example": "تعطلت مركبتك قرب منعطف مع رؤية محدودة. لا تندفعي لوضع مثلث تحذير إذا كان ذلك يستلزم دخول مسار خطير؛ سلامة الأشخاص أولًا وطلب المساعدة جزء من القرار.",
    "errors": [
      "النزول مباشرةً من جانب مواجه لحركة المركبات دون تقييم الخطر.",
      "مواصلة الرحلة مع تحذير خطير للمحرك دون الرجوع لتعليمات الشركة."
    ],
    "prompt": "ما أولويتك عند تعطل السيارة في مكان يمر فيه المرور السريع قريبًا جدًا؟",
    "answer": "تقييم سلامة الأشخاص وموقع المركبة ومنع زيادة الخطر وطلب المساعدة المناسبة، بدل محاولة الإصلاح أو وضع تحذيرات بطريقة تعرضك للحوادث.",
    "homework": "اكتبي بطاقة طوارئ شخصية تضم: موقع التوقف الآمن، التحذير، طلب المساعدة، وما الذي يجب تجنب فعله."
  },
  {
    "id": 41,
    "foundation": "تجمع لوحة عدادات هوندا أكورد بين رسائل تشغيل وتنبيهات أنظمة القيادة والتحذيرات الفنية. قد تتغير الرموز والقوائم بين أكورد قديمة وحديثة، أو بين فئة لديها Brake Hold وأخرى تختلف تجهيزاتها.",
    "why": "بعض المؤشرات تخبرك أن نظامًا مُفعّل، بينما أخرى تشير إلى مشكلة تتطلب التوقف أو الفحص. الخلط بينها يؤدي إلى تجاهل تحذير مهم أو القلق من رمز تشغيل طبيعي.",
    "steps": [
      "ابدئي بالتحذيرات العامة المعروفة: الزيت والبطارية والفرامل وحرارة المحرك وضغط الإطارات.",
      "ابحثي عن اسم الرمز ووظيفته في دليل مالك هوندا أكورد المطابق للسنة والفئة.",
      "ميزي بين لمبة تظهر للحظات عند التشغيل بوصفها فحصًا وبين رمز يستمر أو يظهر أثناء القيادة.",
      "لا تجربي إطفاء رمز إنذار بمسح بيانات أو تغيير إعدادات عشوائية؛ اتبعي دليل المالك أو فحصًا مختصًا."
    ],
    "example": "ظهرت أيقونة تحذير ضغط زيت المحرك أثناء القيادة. لا تفسريها بأنها مجرد موعد تغيير الزيت؛ توقفِي في مكان آمن واتّبعي ما يحدده دليل الموديل عن التحذير.",
    "errors": [
      "نسخ صورة لوحة عدادات سيارة أخرى والاعتماد عليها لفهم كل الرموز.",
      "اعتبار وجود نظام مساعد للفرملة دليلًا على أنه يعمل في جميع السرعات والظروف."
    ],
    "prompt": "لماذا نحتاج سنة الموديل والفئة عند شرح لوحة قيادة هوندا أكورد؟",
    "answer": "لأن تصميم اللوحة والرموز ونوعية أنظمة المساعدة وتجهيزات السيارة يختلف عبر الأجيال والفئات، ولا يجوز اختلاق تفاصيل زر أو رمز غير مؤكد.",
    "homework": "اكتبي أسئلة نحتاج الإجابة عنها من دليل سيارتك: السنة، الفئة، نوع فرامل التوقف، وجود Brake Hold ومكان دليل التحذيرات."
  },
  {
    "id": 42,
    "foundation": "الحادث المروري قد يكون بسيطًا في الأضرار أو يتضمن إصابات تحتاج استجابة عاجلة. عند حدوثه، الأهم تقييم سلامة الأشخاص والموقع وطلب الجهات المختصة، مع عدم عرقلة أو تعريض نفسك والمصابين لخطر إضافي.",
    "why": "تختلف إجراءات البلاغ بحسب وجود إصابات أو أطراف أو نوع الضرر والموقع الجغرافي؛ لذلك لا يكفي حفظ رقم واحد دون معرفة الجهة والخدمة التي تحتاجينها. ابحثي في المصادر الحكومية الحالية عن رقم الطوارئ المناسب لمنطقتك.",
    "steps": [
      "افحصي من مكان آمن هل توجد إصابات أو خطر مباشر مثل حريق أو حركة مرور سريعة.",
      "اطلبي خدمة الطوارئ المناسبة واذكري الموقع وطبيعة الحادث وعدد المصابين إن عُرف.",
      "لا تحركي مصابًا حركة غير لازمة إلا إذا اقتضت سلامته المباشرة ذلك، واتّبعي تعليمات مختصي الطوارئ.",
      "للحوادث البسيطة دون إصابات اتّبعي إجراءات الإبلاغ المعتمدة ومطالب الجهة المختصة ولا تنشري بيانات الآخرين."
    ],
    "example": "وقع حادث أمامك وتوجد إصابة واضحة. الأولوية ليست تصوير السيارات لأجل التأمين، بل طلب المساعدة الإسعافية وحماية المكان دون تعريض نفسك للخطر.",
    "errors": [
      "الانتظار طويلًا لتوثيق الضرر بينما توجد إصابة عاجلة.",
      "حفظ رقم من تجميع قديم دون التأكد من تغطيته منطقتك ونوع الحالة."
    ],
    "prompt": "لو حدث حادث وفيه إصابة، هل تنتظرين تسوية التأمين قبل طلب الإسعاف؟",
    "answer": "لا. سلامة المصابين وطلب الطوارئ المناسبة يتقدمان على الإجراءات الإدارية والتأمينية.",
    "homework": "استخدمي موقع جهة طوارئ سعودية رسميًا لتدوين أرقام وخدمات مناسبة لمنطقتك، مع ذكر المصدر وتاريخ التحقق في دفتر الدرس."
  },
  {
    "id": 43,
    "foundation": "المراجعة الشاملة للإشارات تهدف إلى ربط شكل العلامة بما يتطلبه التصرف الفعلي. قد تتشابه ألوان بعض اللوحات، لكن الفرق بين تحذير وتنظيم وإرشاد يظهر من الرمز والسياق.",
    "why": "الحفظ بالصور وحده يجعل الإجابة أصعب عندما تتغير زاوية الرسم أو صياغة السؤال. الأفضل أن تسترجعي المعنى ثم تختاري التصرف المناسب في موقف جديد.",
    "steps": [
      "صنفي الإشارة قبل قراءة الخيارات: تحذيرية أو تنظيمية أو إرشادية أو مؤقتة أو علامة أرضية.",
      "اشرحي ماذا تعني اللوحة بلغة بسيطة لا بقراءة عنوانها فقط.",
      "اختاري كيف تتصرفين عند رؤيتها في موقف طريق فعلي.",
      "ارجعي إلى بطاقات أخطائك وحاولي شرح سبب الإجابة الصحيحة والخيارات الخاطئة."
    ],
    "example": "لديك علامة تحذيرية لوجود إشارات ضوئية قادمة وأخرى فيها الضوء الأحمر نفسه. رغم وجود رسم ضوء في الحالتين فإن الأولى تنبيه مسبق والثانية تنظيم لحظي عند التقاطع.",
    "errors": [
      "تفسير علامة من لونها فقط دون الرمز.",
      "الحفظ السريع لجميع الصور ثم تجاهل اللوحات التي تتشابه في تفاصيل صغيرة."
    ],
    "prompt": "ماذا تضيفين إلى بطاقة الإشارة حتى تصبح أداة فهم لا حفظ؟",
    "answer": "تضيفين معنى الإشارة، والتصرف المطلوب، وخطأ شائعًا، وموقفًا حقيقيًا يُظهر سبب وجودها.",
    "homework": "راجعي 20 إشارة من المكتبة وسجلي أي علامة أخطأت فيها مرتين. أعيديها بعد يوم بدل إعادة جميع البطاقات."
  },
  {
    "id": 44,
    "foundation": "اختبارات الأولوية تجمع أكثر من مهارة: قراءة تنظيم التقاطع، ومعرفة موضع المركبات، وتوقع اتجاهاتها، وتحديد نقاط التعارض، ثم اختيار الترتيب الآمن للحركة. الدوار حالة من التقاطع وليست موضوعًا منفصلًا عن التفكير في الأولوية.",
    "why": "من السهل حفظ صورة تظهر سيارة حمراء على اليمين، لكن إذا تغيرت اللوحة أو اتجاه السيارة تغيرت الإجابة. لذلك لا تستخدمي اللون أو حجم المركبة بوصفه دليلًا على الأولوية.",
    "steps": [
      "اكتبي نوع التنظيم في أعلى الرسم: إشارة ضوئية أو لوحة أو رجل مرور أو غير منظم.",
      "حددي الأسهم التي تبين اتجاه كل مركبة وخطوط مساراتها.",
      "تعرفي على موقع التعارض: أين قد تلتقي المركبتان إذا تحركتا معًا؟",
      "حددي القرار المناسب واستدلّي بوسيلة التنظيم؛ أعيدي تحليل السؤال إذا ظهرت إشارة إضافية."
    ],
    "example": "ثلاث سيارات عند تقاطع، إحداها تواجه لوحة قف والأخرى تريد انعطافًا. لا تختاري بحسب لون السيارات؛ ابدئي باللوحة ثم ادرسي التعارض.",
    "errors": [
      "استخدام إجابة محفوظة دون تحليل صورة جديدة.",
      "الافتراض أن مركبة تريد الخروج من دوار تحصل تلقائيًا على الأولوية على جميع المسارات حولها."
    ],
    "prompt": "ما الخطوات الأربع قبل إعطاء إجابة لمسألة أولوية؟",
    "answer": "تحديد التنظيم، ثم اتجاهات المركبات، ثم نقاط التعارض، ثم تطبيق القاعدة المناسبة مع الانتباه للسلامة.",
    "homework": "حلي خمس مسائل متنوعة؛ بعد كل واحدة اكتبي تفسيرًا من جملة كاملة بدل وضع علامة على الاختيار فقط."
  },
  {
    "id": 45,
    "foundation": "تجمع مواقف السرعة والمخاطر والطوارئ بين ملاحظة الخطر المبكر وتقدير سرعة آمنة ومسافة مناسبة وإجراء يقلل الضرر عند حدوث موقف غير متوقع.",
    "why": "في الطريق الحقيقي قد تظهر عدة ظروف مرة واحدة: مطر، زحام، ضعف رؤية، ومركبة متعطلة. القرار الجيد لا يعتمد على قاعدة واحدة بل ترتيب الأولويات وفق شدة الخطر وموقع المركبة.",
    "steps": [
      "حددي الخطر الرئيسي في السيناريو وما الخطر الثانوي.",
      "اسألي هل يمكن تخفيف الخطر بتغيير السرعة أو توسيع المسافة قبل حدوث طارئ؟",
      "في حالة تعطل أو حادث، قدمي سلامة الأشخاص والتوقف المناسب وطلب المساعدة.",
      "بعد حل السيناريو اشرحي لماذا قد تكون الخيارات الأخرى أخطر حتى لو بدت أسرع."
    ],
    "example": "أثناء مطر وغبار خفيف رأيتِ أضواء تحذير لمركبة متوقفة أمامك على الكتف. الأفضل توسيع الانتباه وتخفيف السرعة وفق الظروف وعدم الانتقال المفاجئ لمسار آخر.",
    "errors": [
      "التعامل مع الطارئ على أنه اختبار في السرعة ورد الفعل لا في التخطيط المبكر.",
      "استمرار القيادة لأن لوحة السرعة لم تتغير رغم أن الرؤية تدهورت."
    ],
    "prompt": "كيف تتخذين القرار عندما يجتمع طريق مبتل مع حادث أمامك؟",
    "answer": "تخفيف السرعة وزيادة مجال الأمان وفق الظروف، ومراقبة المحيط، ثم الالتزام بإرشادات الطوارئ والتنظيم عند الاقتراب؛ سلامة الأشخاص أولًا.",
    "homework": "اختاري موقفين من بنك الأسئلة، وصنفي إجابتك إلى «وقاية قبل الخطر» و«تصرف بعد وقوعه»."
  },
  {
    "id": 46,
    "foundation": "إصدار رخصة القيادة في السعودية إجراء مستقل عن مجرد حجز موعد أو قراءة المنهج النظري. يشمل استيفاء الشروط المعمول بها، والتسجيل أو حجز التدريب وفق خدمة الجهة المختصة، واجتياز التقييمات والمتطلبات، وسداد الرسوم المقررة عند الحاجة.",
    "why": "التفاصيل الإجرائية مثل المواعيد والمتطلبات والرسوم يمكن أن تتغير؛ لذلك يُستخدم دليل المتدربة القديم للتعرف على الفكرة العامة فقط، بينما يجب مراجعة أبشر والمرور والمدرسة المعتمدة للتحقق من الإجراء الحالي.",
    "steps": [
      "ادخلي إلى منصة أبشر أو الجهة الحكومية المختصة للتحقق من خدمة الرخص ومتطلباتها الحالية.",
      "ميزي بين موعد مدرسة القيادة وبرنامج التدريب ومرحلة الاختبارات وإصدار الرخصة.",
      "احتفظي بقائمة وثائق وخطوات مستمدة من التعليمات الرسمية وقت الحجز لا من تجميع متداول.",
      "لا تفترضي أن مدة 16 أسبوعًا في مِسار شرط رسمي للحصول على الرخصة؛ هي خطة تعلم ذاتي مرنة."
    ],
    "example": "حجزتِ موعدًا إلكترونيًا في مدرسة قيادة. هذا يعني أنك حصلتِ على خطوة إجرائية، ولا يعني صدور الرخصة أو أن الاختبار النظري أصبح منجزًا.",
    "errors": [
      "نقل رسوم أو ساعات قديمة من مدرسة أخرى واعتبارها موحدة.",
      "الخلط بين التقدم في موقع مِسار وبين اجتياز تقييم مدرسة القيادة."
    ],
    "prompt": "هل يساوي تأكيد موعد مدرسة القيادة امتلاك رخصة سارية؟",
    "answer": "لا. الحجز خطوة ضمن الإجراءات، ويجب استيفاء المتطلبات والتدريب والاختبارات وإصدار الرخصة وفق الجهات المختصة.",
    "homework": "راجعي خدمة الرخصة في أبشر وحددي حالتك: لم أبدأ، حجزت، بدأت تدريبًا، أم أكملت. دوّني المستند الرسمي وتاريخ قراءته."
  },
  {
    "id": 47,
    "foundation": "تختلف برامج التدريب في مدارس القيادة بحسب نتيجة التقييم ومستوى المتدربة وسياسة المدرسة. قد تنشر بعض المدارس مسارات بعدد ساعات مختلف للمبتدئات ومن لديهن خبرة، مع قواعد لإعادة الاختبارات أو إعادة جدولة المواعيد.",
    "why": "لا يجوز تحويل عدد أخطاء نموذج من الإنترنت إلى قرار مؤكد لعدد ساعات التدريب؛ هذا يحدده تقييم المدرسة وإجراءاتها. وملخصات مهارات مثل POM وMSPSL مفيدة لفهم العناصر التي تلاحظها المدربة، لكنها ليست معيارًا موحدًا لجميع المدارس.",
    "steps": [
      "ميزي بين تقييم المستوى قبل البرنامج وبين الاختبار النظري والاختبار العملي.",
      "افتحي صفحة المدرسة التي تختارينها وسجلي ساعات البرامج ورسومها من مصدرها المباشر بتاريخ اليوم.",
      "راجعي تعليمات الحضور وإعادة الاختبار والإلغاء والتعديل قبل الحجز.",
      "إذا التحقتِ بالمدرسة، اكتبي ما الذي أنجزتِه مع المدربة وما الذي يحتاج تكرارًا ولا تعتمدي تقييمك الذاتي وحده."
    ],
    "example": "تقول تجميعة إن عددًا محددًا من الأخطاء يعني برنامجًا بعينه. لا تتعاملي مع هذا كقرار رسمي؛ قد تعتمد المدرسة أسلوبًا مختلفًا لتقييم مستواك.",
    "errors": [
      "الاعتقاد أن المتدربة تختار دائمًا برنامج الساعات الأقل دون تقييم.",
      "الخلط بين رسوم تدريب مدرسة ورسوم إصدار الرخصة الحكومية."
    ],
    "prompt": "من يحدد عادة مسار التدريب المناسب لمستواك في المدرسة؟",
    "answer": "المدرسة المعتمدة وفق نظام تقييمها وتعليماتها، ولا تُستنتج النتيجة من نموذج غير رسمي موجود على الإنترنت.",
    "homework": "اختاري مدرسة محتملة، وقارني صفحة برامجها الرسمية ببيانات تجميعاتك؛ علّمي أي فرق يحتاج تحققًا."
  },
  {
    "id": 48,
    "foundation": "الاستعداد للاختبار النظري لا يعني حفظ إجابات مجموعة واحدة. الأهم القدرة على تفسير الإشارات واتخاذ القرار في التقاطعات والمسارات والسرعة والحالات الخاصة، ثم التعرف إلى سبب الخطأ ومعالجته قبل الاختبار.",
    "why": "مِسار أداة مذاكرة شخصية وليست اختبارًا حكوميًا رسميًا. حتى بعد تحقيق درجة عالية فيه، يجب التأكد من متطلبات المدرسة وموادها، ولا تُعد نتيجة الموقع تصريحًا للقيادة.",
    "steps": [
      "راجعي موضوعات الأخطاء المتكررة قبل حل اختبار شامل جديد.",
      "حلي اختبارًا متنوعًا دون النظر إلى التفسيرات، ثم صنفي كل خطأ حسب المفهوم.",
      "عودي إلى الدرس ومرجعه عند الحاجة، واكتبي سبب الإجابة الصحيحة بكلماتك.",
      "استعدي للمرحلة التالية عمليًا عبر مدرسة معتمدة، مع الاحتفاظ بالمراجعات النظرية كمرجع مستمر بعد الحصول على الرخصة."
    ],
    "example": "حصلتِ على درجة مرتفعة في أسئلة الإشارات لكن تتكرر أخطاؤك في حق الأولوية عند التقاطعات. لا يكفي إعادة نفس الأسئلة سهلة الحفظ؛ تحتاجين مواقف مختلفة توضح موضع التعارض وتنظيمه.",
    "errors": [
      "اعتبار إنهاء جميع دروس الموقع إثباتًا للقدرة على قيادة مركبة في الطريق.",
      "نسخ إجابات تجميعات قديمة دون فحص صحة القاعدة التي تعتمد عليها."
    ],
    "prompt": "كيف تعرفين أنك فهمتِ سؤال الأولوية ولم تحفظي شكله فقط؟",
    "answer": "يمكنك تفسير القاعدة وتحليل صورة جديدة مع تغيير اتجاهات المركبات أو اللوحات، وتحديد سبب اختيارك والبدائل الخاطئة.",
    "homework": "اكتبي خطة مراجعة أخيرة: أصعب ثلاثة موضوعات، عدد اختباراتك المستقلة، ومتى ستراجعين المصدر الرسمي للمدرسة والرخصة."
  }
]);

(function masarStudio(){
'use strict';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const now=()=>Date.now();
const fmt=n=>`${pad(Math.floor(Math.max(0,n)/60))}:${pad(Math.max(0,n)%60)}`;
const defaults=()=>({timer:{duration:30,remaining:1800,status:'idle',endsAt:null},sessions:[],lastVisitAt:null});
let openTimerForLesson=null;
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
// Floating countdown removed intentionally: the timer only renders after opening a lesson's optional control.

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
 const n=/^\/lesson\/(\d+)$/.exec(path||'');
 if(n){
  const lessonNumber=Number(n[1]),lesson=(course.lessons||[]).find(l=>l.order===lessonNumber);
  if(!lesson)return '';
  const expanded=openTimerForLesson===lessonNumber;
  return `<section class="studio-lesson-tools" aria-label="أدوات المذاكرة الاختيارية">
    <div class="studio-lesson-tool-head"><strong>خطوات الدرس</strong><button type="button" class="studio-timer-opener" data-action="studio-panel-toggle" aria-expanded="${expanded}" ${expanded?'aria-controls="studio-focus-panel"':''}>${expanded?'إخفاء المؤقت':(ensure(state).timer.status==='running'?'◷ عرض المؤقت الجاري':'◷ مؤقت اختياري')}</button></div>
    <nav class="studio-step-links" aria-label="خطوات الدرس"><a href="#reading" data-action="studio-jump" data-target="reading">الشرح</a><a href="#active-recall" data-action="studio-jump" data-target="active-recall">من الذاكرة</a><a href="#lesson-videos" data-action="studio-jump" data-target="lesson-videos">المقاطع</a><a href="#practice" data-action="studio-jump" data-target="practice">اختبار</a></nav>
    ${expanded?`<div class="studio-focus-panel" id="studio-focus-panel"><p>المؤقت اختياري ولا يوقف شرحك عند انتهاء المدة.</p>${timerControls(state,true)}</div>`:''}
   </section>${lessonCheck(course,state,lesson)}`;
 }
 if(path==='/settings')return `<section class="card studio-settings"><h2>مساعد المذاكرة</h2><p>مؤقت التركيز اختياري؛ افتحي أي درس واختاري «مؤقت اختياري» إذا احتجتِه. لا يظهر مؤقت عند دخول الرئيسية.</p><p>البحث السريع متاح من أعلى الشاشة أو باختصار <kbd>Ctrl</kbd> + <kbd>K</kbd>.</p><p>ملفات الكتب الخاصة تُحفظ على جهازك وتحتاج نسخة احتياطية منفصلة عن تقدم المذاكرة.</p></section>`;
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
 if(action==='studio-panel-toggle'){const n=/^#\/lesson\/(\d+)$/.exec(location.hash||'');if(!n)return true;const lessonNumber=Number(n[1]);openTimerForLesson=openTimerForLesson===lessonNumber?null:lessonNumber;ctx.render(true);return true}
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
  save();render(true);if(/^#\/lesson\/\d+$/.test(location.hash||'')&&openTimerForLesson!==null)toast('انتهت جلسة المذاكرة. تقدرين تكمّلين أو تاخذين استراحة.');
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
window.MasarStudio={widgets,searchUI,click,tick,initialize};
})();

(() => {
'use strict';
const COURSE=window.MasarCourse||JSON.parse(document.getElementById('course-data').textContent);
const lessons=COURSE.lessons, weeks=COURSE.weeks, questions=COURSE.questions, sourceById=Object.fromEntries(COURSE.sources.map(s=>[s.id,s]));
const baseKey='masar-driving-v1';
let state={done:[],answers:{},notes:{},bookmarks:[],history:[],lastOpened:1,visited:[],readingPositions:{},videoNotes:{},videoWatched:{},sourceNotes:{},reviewAnswers:{},practiceChecks:{},signPractice:{},activityNotes:{},activityChecks:{},reviewHistory:{},mockSession:null,mockHistory:[],uiPrefs:{focus:false}};
try { const saved=JSON.parse(localStorage.getItem(baseKey)||'null'); if(saved && typeof saved==='object') state={...state,...saved}; } catch(e){console.warn('Local data unavailable',e)}
function activeTheme(){return state.uiPrefs&&state.uiPrefs.theme==='light'?'light':'dark'}
function applyTheme(){
 const mode=activeTheme();
 if(document.documentElement?.dataset)document.documentElement.dataset.theme=mode;
 const meta=document.querySelector?.('meta[name="theme-color"]');
 if(meta)meta.setAttribute('content',mode==='dark'?'#090e15':'#f4f7fa');
}
applyTheme();
let session=null, filterText='', catalogFilter='all', flashFlips=new Set(), visualStages={}, tickInterval=null, mobileOpen=false;
let savedMirrorPresent=false;try{savedMirrorPresent=localStorage.getItem(baseKey)!==null}catch(e){console.warn('Storage unavailable',e)}
let databaseReady=false, dirtyBeforeReady=false, databaseStatus='جارٍ تجهيز قاعدة البيانات';
let displayedRoute='', scrollWriteTimer=null, restoringScroll=false, pendingLessonTarget=null;
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
 return '<aside class="sidebar '+(mobileOpen?'open':'')+'" id="sidebar" aria-label="التنقل الرئيسي"><a href="#/home" class="logo" aria-label="مِسار الرئيسية"><span class="logo-icon">م</span><span><strong>مِسار<span style="color:#3199eb">.</span></strong><small>تعلّم القيادة خطوة بخطوة</small></span></a><div class="side-label">اختاري القسم، ثم افتحي الدرس أو التدريب</div><nav class="nav sidebar-section-nav" aria-label="أقسام مِسار">'+sections+'</nav><div class="sidebar-bottom"><div class="mini-progress"><div class="mini-progress-top"><div><small>تقدّم المنهج</small><br><strong>'+progress()+'%</strong></div><div style="font-size:30px;color:#77c5f9">'+icon('road')+'</div></div><div class="line"><i style="width:'+progress()+'%"></i></div><small>'+completed().size+' من 48 درسًا مكتملًا</small></div><div class="foot-note">تعلّم نظري سعودي · نسخة شخصية تجريبية</div></div></aside>';
}
function reviewDueCount(){
 const now=Date.now();
 return Object.values(state.reviewHistory||{}).filter(x=>!x.lastCorrect||new Date(x.nextDueAt||0).getTime()<=now).length;
}
function topbar(title){
 const focus=!!state.uiPrefs?.focus,due=reviewDueCount();
 return `<header class="topbar automotive-topbar"><div class="top-actions"><button type="button" class="chip menu-btn" data-action="menu" aria-label="فتح القائمة">${icon('menu')}</button><div class="crumb"><span class="crumb-home">مِسار</span><span class="crumb-slash">/</span><strong>${ESC(title)}</strong></div></div><div class="top-actions topbar-tools">${due?`<a class="topbar-review-pill" href="#/review" aria-label="${due} عناصر مراجعة مستحقة"><span class="signal-dot"></span><b>${due}</b><span>مراجعة</span></a>`:''}<button type="button" class="chip focus-toggle ${focus?'is-active':''}" data-action="focus-mode" aria-pressed="${focus}" aria-label="${focus?'إنهاء وضع التركيز':'تفعيل وضع التركيز'}">${icon(focus?'close':'book')}<span>${focus?'إنهاء التركيز':'وضع التركيز'}</span></button><button type="button" class="theme-toggle" data-action="theme-toggle" aria-label="${activeTheme()==='dark'?'تفعيل الوضع الفاتح':'تفعيل الوضع الداكن'}" aria-pressed="${activeTheme()==='dark'}"><span class="theme-symbol" aria-hidden="true">${activeTheme()==='dark'?'☀':'☾'}</span><strong>${activeTheme()==='dark'?'فاتح':'داكن'}</strong></button><button type="button" class="chip studio-search-trigger" data-action="studio-search" aria-label="البحث في جميع دروس مِسار">${icon('search')}<span>بحث شامل</span></button></div></header>`
}
function mobileDock(){
 const path=route();
 const items=[['/home','home','الرئيسية'],['/weeks','layers','الخطة'],['/review','reset','مراجعتي'],['/traffic-signs','road','الإشارات'],['/quiz','quiz','اختبار']];
 return '<nav class="mobile-dock" aria-label="تنقل سريع">'+items.map(([href,ic,label])=>'<a href="#'+href+'" class="'+(path===href||(href==='/weeks'&&(path.startsWith('/week/')||path.startsWith('/lesson/')))?'active':'')+'" '+(path===href?'aria-current="page"':'')+'>'+icon(ic)+'<span>'+ESC(label)+'</span></a>').join('')+'</nav>';
}
function footerNote(){return `<div class="warning" role="note">${icon('alert')} <strong>ملاحظة تعليمية:</strong> هذا محتوى مذاكرة شخصي أولي، وليس مرجعًا نظاميًا معتمدًا أو بديلًا عن مدرسة قيادة مرخصة. التعليمات المتغيرة تُراجع لدى المرور والمدرسة، وأزرار هوندا حسب سنة وفئة السيارة.</div>`}
function stat(text,value,extra,ic,variant='') {return `<div class="stat stat-${variant} card-premium-interactive"><div class="stat-top"><span class="stat-label">${text}</span><span class="stat-icon">${icon(ic)}</span></div><div class="stat-content"><div class="val" data-count-value="${Number(value)}">${value}</div><div class="stat-caption">${extra}</div></div><span class="stat-decoration" aria-hidden="true"></span></div>`}
const studyDays=[['السبت','درس 01','فهم أساسي'],['الثلاثاء','درس 02','شرح + مثال'],['الخميس','درس 03','تطبيق قصير'],['الجمعة','مراجعة','ثبتي المعلومات']];
function schedule(){return `<div class="schedule">${studyDays.map((x,i)=>`<div class="day ${i===3?'is-review':''}"><small>${x[0]}</small><b>${x[1]}</b><strong>${x[2]}</strong></div>`).join('')}</div><div class="note-preview">جدول مقترح غير نهائي: يمكنك المذاكرة في أي يوم ومن أي درس.</div>`}
function studyStars(){
 const today=new Date(),dates=state.studyStars||{};
 const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-(6-i));const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');return {day:d.toLocaleDateString('ar-SA',{weekday:'short'}),date:key,earned:!!dates[key],today:i===6}});
 return '<section class="card study-stars"><div class="card-top"><div><span class="bento-overline">نجوم الإنجاز</span><h3>كل يوم له نجمته ⭐</h3></div><span class="chip tiny blue">'+days.filter(x=>x.earned).length+' / 7 نجوم</span></div><p>إذا أنهيتِ مذاكرتك اليوم اضغطي نجمة اليوم. ما فيه عقوبة ولا خسارة للنجوم لو ارتحتي يوم.</p><div class="study-star-days">'+days.map(x=>'<div class="study-star-day '+(x.earned?'earned':'')+'"><small>'+ESC(x.day)+'</small><span aria-label="'+(x.earned?'نجمة مكتسبة':'لم تُسجل نجمة')+'">'+(x.earned?'★':'☆')+'</span></div>').join('')+'</div><button class="btn btn-outline" type="button" data-action="study-star">'+(days[6].earned?'إلغاء نجمة اليوم':'⭐ خلصت مذاكرتي اليوم')+'</button></section>';
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
 return '<section class="card study-route"><div class="study-route-header"><div><span class="bento-overline">YOUR LEARNING STUDIO / جلسة اليوم</span><h2>ابدئي من هنا، خطوة بخطوة</h2><p>الدرس '+String(lesson.order).padStart(2,'0')+' · <strong>'+ESC(lesson.title)+'</strong></p></div><div class="study-route-progress" aria-label="أُنجز '+done+' من ثلاثة مؤشرات"><strong>'+done+'<small>/3</small></strong><span>فهم · ملاحظات · اختبار</span></div></div><div class="study-today-list">'+steps.map(([number,title,description,target,complete])=>'<a class="study-today-item '+(complete?'is-complete':'')+'" href="#/lesson/'+lesson.order+'" data-lesson-target="'+target+'"><span class="study-today-number">'+(complete?'✓':number)+'</span><span><strong>'+title+'</strong><small>'+ESC(description)+'</small></span><span class="study-today-arrow">↖</span></a>').join('')+'</div><div class="study-route-actions"><a href="#/lesson/'+lesson.order+'" class="btn btn-primary">افتحي مساحة الدرس ←</a><a href="#/study-guide" class="btn btn-outline">كيف أذاكر؟</a></div></section>';
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
 const resume=resumeLesson(), n=resume||nextLesson(), next=nextLesson(), week=n.week, done=completed().size, pct=progress(),due=reviewDueCount();
 const masteredSigns=(COURSE.sign_library||[]).filter(s=>{const x=state.signPractice?.[s.id]||{};return (x.meaningCorrect||0)>=1&&(x.actionCorrect||0)>=1}).length;
 const directVideos=(COURSE.media_resources||[]).filter(x=>x.kind==='youtube_video'&&/^[\w-]{11}$/.test(x.youtube_id||'')),watchedVideos=directVideos.filter(x=>state.videoWatched?.[x.id]).length;
 return `<section class="hero hero-premium" aria-labelledby="hero-title">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="hero-copy"><div class="hero-topline"><span class="hero-kicker"><span class="signal-dot"></span> مِسار · تعلّم القيادة</span></div>
   <div class="eyebrow">ابدئي من هنا</div><h1 id="hero-title">خلف المقود،<br><span>يبدأ الفهم أولًا.</span></h1>
   <p>مساحتك الخاصة لتعلّم القيادة النظرية خطوة بخطوة؛ من معرفة السيارة إلى قراءة الطريق واتخاذ القرار.</p>${resume?`<p class="resume-location" aria-live="polite">آخر مكان حفظتيه: الدرس ${p2(resume.order)} · ${ESC(resume.title)}</p>`:''}
   <div class="hero-actions"><a class="btn btn-primary" href="#/lesson/${n.order}">${icon('play')} ${resume?'ارجعي لآخر درس':done?'واصلي التعلم':'ابدئي أول درس'}</a>${resume&&next.order!==resume.order?`<a class="btn btn-ghost" href="#/lesson/${next.order}">الدرس التالي غير المكتمل ${icon('arrow')}</a>`:`<a class="btn btn-ghost" href="#/weeks">استكشفي الخطة ${icon('arrow')}</a>`}</div>
   <div class="hero-status-strip" aria-label="ملخص سريع للتعلم"><span><b>W${p2(week)}</b><small>الأسبوع الحالي</small></span><span class="${due?'needs-attention':''}"><b>${due}</b><small>مراجعة مستحقة</small></span><span><b>${masteredSigns}</b><small>إشارة مثبّتة</small></span><span><b>${watchedVideos}/${directVideos.length}</b><small>مقاطع شوهدت</small></span></div>
  </div><div class="hero-gauge" aria-label="أنجزتِ ${pct} بالمئة من الدروس"><div class="gauge-outline" style="--gauge:${pct}"><div class="gauge-inner"><span>إنجازك</span><strong>${pct}<small>%</small></strong></div></div><span class="gauge-note">${done} / 48 درسًا</span></div><span class="hero-serial" aria-hidden="true">MASAR / 001</span>
 </section>
 <div class="study-command-grid">${studyRoute(n)}${studyStars()}</div>
 ${adaptiveStudyPlan(n)}
 <div class="stats stats-bento">${stat('المنهج','16','أسبوعًا منظمًا','layers','weeks')}${stat('الدروس','48','درسًا نظريًا','book','lessons')}${stat('أكملتِ',done,'من أصل 48 درسًا','check','completed')}${stat('بنك الأسئلة',questions.length+(COURSE.review_questions||[]).length,'سؤالًا تدريبيًا بتفسير','quiz','questions')}</div>
 <div class="section-head home-section-head"><div><div class="eyebrow">متابعة التعلّم</div><h2>مشوارك الحالي</h2><p>لا تحتاجين تكمّلين كل شيء اليوم؛ خطوة واحدة كفاية.</p></div><a href="#/weeks">كل الأسابيع ${icon('arrow')}</a></div>
 <div class="dashboard-grid bento-stage"><section class="card journey-panel"><div class="card-top"><div><div class="bento-overline">المحطة التالية</div><h3>الأسبوع ${p2(week)} <span class="muted-separator">/</span> ${ESC(weeks[week-1]?.title||'المرحلة الحالية')}</h3></div><span class="chip blue tiny">${weeklyDone(week)} / 3 مكتمل</span></div>
 <div class="route-line">${lessons.filter(l=>l.week===week).map((l,i)=>`<a href="#/lesson/${l.order}" class="route-stop ${isDone(l.order)?'complete':''} ${n.order===l.order?'current':''}"><span class="route-indicator"><i>${isDone(l.order)?icon('check'):p2(l.order)}</i></span><span class="route-text"><b>${ESC(l.title)}</b><small>الدرس ${p2(l.order)} · ${l.estimated_minutes} دقيقة تقريبًا</small></span><span class="route-go">${icon('arrow')}</span></a>`).join('')}</div>
 <div class="journey-footer"><a href="#/week/${week}" class="btn btn-muted">تفاصيل الأسبوع</a><a href="#/quiz" class="btn btn-outline">اختبريني ${icon('arrow')}</a></div></section>
 <div class="bento-side"><section class="callout card-premium-interactive"><span class="bento-overline">معرفة السيارة</span><div class="callout-illustration" aria-hidden="true">${icon('road')}<span class="callout-track"></span></div><h3>افهمي سيارتك<br>قبل أي انطلاقة.</h3><p>مبادئ تخص السيارة عمومًا، دون افتراض أزرار أو أنظمة في أكورد قبل تحديد سنة الموديل.</p><a href="#/lesson/1">استكشفي أدوات السيارة ${icon('arrow')}</a></section>
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
function lessonRecallBlock(l){
 const points=(l.study_content?.key_points||[]).slice(0,4);
 if(!points.length)return '';
 return '<section class="lesson-recall" id="active-recall"><div class="lesson-recall-head"><div><span class="bento-overline">RETRIEVAL PRACTICE / من الذاكرة</span><h2>قفلي الشرح دقيقة… وش تتذكرين؟</h2><p>حاولي تجاوبين بصوتك أو في ورقة قبل فتح نقاط التحقق.</p></div><span class="chip tiny">بدون درجة</span></div><div class="lesson-recall-prompts"><div><span>01</span><strong>وش القاعدة الأساسية؟</strong><small>قوليها بجملة واحدة من ذاكرتك.</small></div><div><span>02</span><strong>متى أطبقها؟</strong><small>تخيلي موقفًا من الطريق.</small></div><div><span>03</span><strong>وش الخطأ اللي أتجنبه؟</strong><small>اذكري قرارًا خاطئًا واحدًا.</small></div></div><details class="lesson-recall-answer"><summary>جربت من الذاكرة — اكشفي نقاط التحقق</summary><div>'+points.map((x,i)=>'<p><b>'+(i+1)+'.</b> '+ESC(x)+'</p>').join('')+'</div></details><p class="lesson-recall-note">هذا تمرين استرجاع من محتوى الدرس نفسه، وليس سؤال اختبار رسمي. إذا ما تذكرتِ النقاط، ارجعي للشرح ثم جربي مرة ثانية لاحقًا.</p></section>';
}
function lessonPage(n){const l=getLesson(n);if(!l)return notFound();const changed=state.lastOpened!==n||!(state.visited||[]).includes(n);state.lastOpened=n;state.visited=state.visited||[];if(!state.visited.includes(n))state.visited.push(n);if(changed&&(savedMirrorPresent||databaseReady||dirtyBeforeReady))save();let c=l.study_content,q=getQuestion(n),ans=state.answers[q.id],answered=Number.isInteger(ans),correct=ans===q.correct_option_index;return `<div class="crumbs"><a href="#/weeks">الخطة</a> / <a href="#/week/${l.week}">الأسبوع ${l.week}</a> / الدرس ${p2(n)}</div><div class="lesson-layout"><div class="lesson-main">${lessonJourney(l,q)}<section class="lesson-hero"><div class="flexline"><span class="chip tiny dark">LESSON ${p2(n)} / 48</span><span class="chip tiny">${l.estimated_minutes} دقيقة مقترحة</span>${lessonVerificationChip(l)}</div><h1>${ESC(l.title)}</h1><p>${ESC(c.goal)}</p></section>${[7,8,9,43].includes(n)?'<a class="btn btn-outline" style="margin:12px 0" href="#/traffic-signs">افتحي مكتبة إشارات المرور المصورة ←</a>':''}<section class="lesson-body" id="reading"><div class="eyebrow">01 / الفكرة الأساسية</div><h2>نفهمها أولًا</h2><p>${ESC(c.introduction)}</p><div class="eyebrow" style="margin-top:24px">02 / معلومات تثبّتينها</div>${c.key_points.map((t,i)=>`<div class="point"><i>${i+1}</i><span>${ESC(t)}</span></div>`).join('')}</section>${window.MasarGuides.render(l)}${window.MasarHub.lessonReadings(COURSE,l)}${visualBlock(l)}<div id="lesson-videos">${mediaBlock(l)}</div><section class="lesson-quick-recap"><h2>ملخص الدرس في دقيقة</h2><p>${ESC(c.recap||c.goal)}</p><p class="sub">اسألي نفسك: وش القاعدة؟ متى أطبقها؟ وش الخطأ اللي لازم أتجنبه؟ اكتبي الإجابة في ملاحظاتك تحت.</p></section>${lessonRecallBlock(l)}${window.MasarCoach.activityBlock(COURSE,l,state)}<section class="scenario" id="scenario"><div class="tag-s">DRIVE THINKING · تمرين تفكير</div><h2>تخيّلي الموقف</h2><p>${ESC(c.scenario)}</p></section><section class="qbox" id="practice"><div class="eyebrow">03 / اختبري الفهم</div><h2>قرار واحد صحيح</h2><p>${ESC(q.question)}</p><div class="options">${q.options.map((opt,i)=>`<button type="button" class="option ${answered?(i===q.correct_option_index?'correct':i===ans?'wrong':''):''}" data-action="lesson-answer" data-id="${n}" data-choice="${i}" ${answered?'disabled':''}><span class="bullet">${p2(i+1)}</span>${ESC(opt)}</button>`).join('')}</div>${answered?`<div class="feedback ${correct?'':'wrong'}"><strong>${correct?'إجابة صحيحة!':'خلينا نفهم السبب:'}</strong><span class="feedback-reason">${ESC(q.rationale)}</span>${questionReferenceNote(n)}</div>`:''}<div class="lesson-footer"><button type="button" class="btn ${isDone(n)?'btn-muted':'btn-primary'}" data-action="mark" data-id="${n}">${icon('check')} ${isDone(n)?'تم إكمال الدرس · إلغاء العلامة':'أكملت هذا الدرس'}</button><button type="button" class="btn btn-outline" data-action="bookmark" data-id="${n}">${icon('star')} ${state.bookmarks.includes(n)?'إزالة الحفظ':'حفظ للمراجعة'}</button></div></section>${lessonExtraQuestion(l)}<section class="lesson-body note-box" id="notes"><div class="eyebrow">04 / دفتر ملاحظاتي</div><h2>اكتبيها بطريقتك</h2><p>ملاحظاتك تُحفظ محليًا على نفس المتصفح، ويمكنك تصديرها من الإعدادات.</p><textarea data-note="${n}" placeholder="وش أهم شيء فهمتيه؟ أو وش تبغين تراجعينه؟">${ESC(state.notes[n]||'')}</textarea></section><div class="lesson-footer" style="margin-top:20px"><a href="#/lesson/${Math.max(1,n-1)}" class="btn btn-outline" ${n===1?'aria-disabled="true"':''}>← الدرس السابق</a><a href="${n===48?'#/weeks':`#/lesson/${n+1}`}" class="btn btn-primary">${n===48?'العودة للخطة':'الدرس التالي'} ${icon('left')}</a></div></div><aside class="lesson-aside"><section class="aside-card"><h3>في هذا الدرس</h3><button type="button" class="toc-item" data-action="scroll" data-target="reading">الفكرة الأساسية</button><button type="button" class="toc-item" data-action="scroll" data-target="lesson-deep-dive">الشرح خطوة بخطوة</button><button type="button" class="toc-item" data-action="scroll" data-target="source-reading">مراجع وصفحات الدرس</button><button type="button" class="toc-item" data-action="scroll" data-target="active-recall">استرجاع من الذاكرة</button><button type="button" class="toc-item" data-action="scroll" data-target="coach-activity">تطبيق عملي للفهم</button>${(COURSE.learning_visuals||[]).some(v=>(v.lesson_ids||[]).includes(l.id))?'<button type="button" class="toc-item" data-action="scroll" data-target="visual-learning">الشرح المرئي</button>':''}<button type="button" class="toc-item" data-action="scroll" data-target="scenario">الموقف التطبيقي</button><button type="button" class="toc-item" data-action="scroll" data-target="practice">سؤال الفهم</button>${(COURSE.review_questions||[]).some(x=>x.lesson_id===l.id)?'<button type="button" class="toc-item" data-action="scroll" data-target="practice-extra">سؤال مراجعة إضافي</button>':''}<button type="button" class="toc-item" data-action="scroll" data-target="notes">ملاحظاتي</button><div class="microbar"><span style="width:${isDone(n)?100:0}%"></span></div><span style="font-size:11px;color:var(--muted)">${isDone(n)?'أحسنتِ، الدرس مكتمل':'حددي إكمال الدرس بعد الانتهاء'}</span></section><section class="aside-card"><h3>المصادر والمرجع</h3>${sourcesBlock(l)}</section><section class="aside-card"><h3>حالة المحتوى والثقة</h3>${lessonVerificationPanel(l)}</section></aside></div>`}
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
'<section class="learning-science-note"><div><span class="bento-overline">WHY THIS WORKS / ليش نذاكر كذا؟</span><h2>الاسترجاع أفضل من إعادة القراءة وحدها</h2><p>مِسار يخليك تحاولين تتذكرين القاعدة قبل كشف الإجابة، ثم يرجع لك الموضوع لاحقًا إذا أخطأتِ أو حان وقت المراجعة. هذا مبني على استراتيجيات الاسترجاع النشط والتكرار المتباعد المدروسة في أبحاث التعلم، لكنه لا يحوّل نتيجة الموقع إلى قياس رسمي للجاهزية.</p></div><a href="https://www.nature.com/articles/s44159-022-00089-1" target="_blank" rel="noopener noreferrer">مراجعة علمية عن spacing + retrieval practice ↗</a></section>'+
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
function settingsPage(){return `<div class="eyebrow">YOUR SPACE</div><h1 class="page-title">إعدادات المذاكرة</h1><p class="sub">قاعدة البيانات المستخدمة IndexedDB محلية داخل هذا المتصفح، دون حساب أو قاعدة بيانات سحابية؛ لا توجد مزامنة بين الأجهزة.</p><section class="theme-setting" aria-label="تفضيل مظهر الموقع"><h3>مظهر مِسار · BMW</h3><p>الوضع الداكن هو الافتراضي. اختاري الوضع الذي يريحك، ويُحفظ اختيارك على هذا الجهاز.</p><div class="theme-setting-actions"><button type="button" data-action="theme-set" data-theme="dark" aria-pressed="${activeTheme()==='dark'}">☾ الوضع الداكن</button><button type="button" data-action="theme-set" data-theme="light" aria-pressed="${activeTheme()==='light'}">☀ الوضع الفاتح</button></div></section><section class="card settings-card"><h3>خط ثمانية في مِسار</h3><p>ضبطنا تصميم الموقع لاستخدام «ثمانية سانس» عند تثبيته على جهازك. ترخيص ثمانية لا يسمح برفع ملفات الخط إلى GitHub أو توزيعه للتنزيل من الموقع؛ إذا لم يكن الخط مثبتًا، سيظهر خط احتياطي واضح. ولا تُرسل ملفات الخط أو ملاحظاتك إلى خادم خارجي.</p><p><a class="source-link" href="https://font.thmanyah.com/" target="_blank" rel="noopener noreferrer">تحميل الخط من المصدر الرسمي وتثبيته على جهازك ↗</a> <a class="source-link" href="https://font.thmanyah.com/licenses" target="_blank" rel="noopener noreferrer">قراءة الترخيص ↗</a></p></section><section class="card settings-card"><h3>حفظ المذاكرة على هذا الكمبيوتر</h3><p>يُحفظ تقدمك وآخر درس قرأتِه ومكان وصولك في الصفحة تلقائيًا داخل المتصفح نفسه. عند العودة اضغطي «ارجعي لآخر درس» من الرئيسية.</p><div class="settings-actions"><button type="button" class="btn btn-outline" data-action="persist-storage">طلب حماية بيانات الموقع من الحذف التلقائي</button></div><p class="note-preview">التخزين قد يُحذف يدويًا أو بسياسات المتصفح؛ احتفظي بنسخة احتياطية. لا يتزامن Chrome وEdge.</p><h3>تثبيت مِسار على جهازك والعمل دون إنترنت</h3><p>افتحي الموقع المنشور على Chrome أو Edge، ثم اختاري «تثبيت التطبيق» من قائمة المتصفح إذا ظهرت لك. بعد الزيارة الأولى والتحميل الناجح يمكن فتح الدروس الأساسية دون اتصال. الفيديوهات وملفات PDF الخارجية تحتاج إنترنت، أما الملفات التي أضفتِها للمتصفح فتظل محلية.</p><div class="settings-actions"><button type="button" class="btn btn-outline" data-action="storage-health">فحص حالة الحفظ والمساحة</button></div><h3>النسخ الاحتياطي</h3><p class="note-preview" id="db-status">${ESC(databaseStatus)}</p><p>حملي ملف بياناتك لحفظ علامات إنجاز الدروس والإجابات والملاحظات، أو أعيدي استيراده على نفس الجهاز أو جهاز آخر.</p><div class="settings-actions"><button type="button" class="btn btn-primary" data-action="export">${icon('download')} تصدير تقدمي (JSON)</button><button type="button" class="btn btn-outline" data-action="import">استيراد نسخة احتياطية</button><input type="file" id="import-file" accept="application/json,.json" hidden></div></section><section class="card settings-card"><h3>ماذا يتضمن هذا الإصدار؟</h3><div class="point"><i>1</i>48 درسًا مع 48 تدريب تفكير مستقلًا؛ النصوص ما زالت تحتاج مراجعة المصدر المعتمد.</div><div class="point"><i>2</i>48 سؤال درس، و36 سؤال مراجعة إضافيًا، ومحاكاة اختبار تدريبي غير رسمي، و12 بطاقة مراجعة.</div><div class="point"><i>3</i>المذاكرة والملاحظات ومحاولات المراجعة تُحفظ في IndexedDB على هذا المتصفح؛ PDF والملفات الخاصة لا تدخل ضمن النسخة الاحتياطية JSON ولا توجد مزامنة سحابية.</div><div class="point"><i>4</i>ليس فيه خطوات أزرار دقيقة لأكورد دون معرفة سنة الموديل والفئة.</div></section><section class="card settings-card"><h3>البدء من جديد</h3><p>حذف البيانات المحلية سيزيل العلامات والإجابات والملاحظات الموجودة على هذا المتصفح. حملي نسخة احتياطية أولًا إذا احتجتيها.</p><button type="button" class="btn btn-outline" data-action="clear" style="color:var(--crimson)">حذف تقدم هذا المتصفح</button></section>${footerNote()}`}
function notFound(){return `<div class="empty"><h3>الصفحة غير موجودة</h3><p>ممكن ترجعين للرئيسية وتتابعين من هناك.</p><a href="#/home" class="btn btn-primary">العودة للرئيسية</a></div>`}
function resolvePage(){const r=route();if(r==='/home')return ['الرئيسية',home()];if(r==='/weeks')return ['الخطة الدراسية',weeksPage()];if(r.startsWith('/week/')){const n=Number(r.split('/')[2]);return ['الأسبوع '+n,weekPage(n)]}if(r.startsWith('/lesson/')){const n=Number(r.split('/')[2]);return ['الدرس '+n,lessonPage(n)]}if(r==='/quiz')return ['الاختبارات',quizPage()];if(r==='/practice-quiz')return ['أسئلة التجميعات',window.MasarHub.quizPage(COURSE,state)];if(r==='/traffic-signs')return ['إشارات المرور',window.MasarSigns.page(COURSE,state)];if(r==='/review')return ['مراجعتي',window.MasarCoach.reviewPage(COURSE,state)];if(r==='/mock-exam')return ['محاكاة الاختبار',window.MasarCoach.pageMock(COURSE,state)];if(r==='/practice-checklist')return ['مهارات التقييم',window.MasarHub.practicePage(COURSE,state)];if(r==='/paper-practice')return ['اختبار ورقي',window.MasarHub.paperPage(COURSE)];if(r==='/study-guide')return ['كيف أذاكر؟',studyGuidePage()];if(r==='/cards')return ['بطاقات المراجعة',flashcardsPage()];if(r==='/notes')return ['ملاحظاتي',notesPage()];if(r==='/visuals')return ['الرسوم التفاعلية',visualLibraryPage()];if(r==='/videos')return ['مقاطع القيادة',videoGalleryPage()];if(r==='/sources')return ['المصادر',sourcesPage()];if(r==='/settings')return ['الإعدادات',settingsPage()];return ['غير موجودة',notFound()]}
function render(keepScroll=false){applyTheme();const [title,content]=resolvePage();const focus=!!state.uiPrefs?.focus;if(focus)APP.classList.add('focus-mode');else APP.classList.remove('focus-mode');APP.innerHTML=`${sidebar()}<div class="mobile-backdrop ${mobileOpen?'open':''}" data-action="menu"></div><main class="app-main" id="main" tabindex="-1">${topbar(title)}<div class="page">${window.MasarStudio.widgets(COURSE,state,route())}${content}</div></main>${window.MasarStudio.searchUI()}${mobileDock()}`;if(!keepScroll)window.scrollTo(0,0);document.title=`${title} | مِسار`;displayedRoute=route();updateTimer();if(!keepScroll&&route()==='/home')animateStats()}
function animateStats(){if(!window.matchMedia||!document.querySelectorAll||typeof performance==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.querySelectorAll('.stat .val[data-count-value]').forEach(el=>{const to=Number(el.dataset.countValue);if(!to||to>100)return;const begin=performance.now(),duration=650;function frame(t){if(!el.isConnected)return;const k=Math.min((t-begin)/duration,1);el.textContent=Math.round(to*(1-(1-k)**3));if(k<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)})}
let toastTimer;function toast(s){const el=document.getElementById('toast');el.textContent=s;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3100)}
function updateTimer(){}
function startTest(week){let pool,label; if(week==='all'){pool=questions.map(q=>q.id); // seeded daily shuffle for consistent mix
 const bucket=Array.from({length:16},(_,i)=>questions.filter(q=>q.week===i+1));pool=bucket.flatMap((arr,i)=>arr[(Math.floor(i*7+Date.now()/86400000))%arr.length]?.id||arr[0]?.id).filter(Boolean);pool=pool.sort((a,b)=>((+a.match(/\d+/)[0]*13)%47)-((+b.match(/\d+/)[0]*13)%47)).slice(0,12);label='الاختبار الشامل · 12 سؤالًا';
} else if(week==='wrong'){pool=questions.filter(q=>state.answers[q.id]!==undefined&&state.answers[q.id]!==q.correct_option_index).map(q=>q.id);label='مراجعة الأخطاء';}
else{const n=Number(week);pool=questions.filter(q=>q.week===n).map(q=>q.id);label=`اختبار الأسبوع ${n}`}
if(!pool.length){toast('ما عندك أسئلة في هذه المجموعة الآن');return}session={ids:pool,label,index:0,answers:{},saved:false};if(route()!='/quiz'){location.hash='#/quiz'}else render(true)}
function recordTest(){if(!session||session.saved)return;const score=session.ids.filter(id=>session.answers[id]===questions.find(q=>q.id===id).correct_option_index).length;state.history.push({label:session.label,score,total:session.ids.length,date:new Date().toLocaleDateString('ar-SA')});state.history=state.history.slice(-30);session.saved=true;save()}
function eventClick(e){let el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,n=Number(el.dataset.id); if(action==='theme-toggle'||action==='theme-set'){e.preventDefault();const next=action==='theme-set'?el.dataset.theme:(activeTheme()==='dark'?'light':'dark');if(next!=='dark'&&next!=='light')return;state.uiPrefs=state.uiPrefs||{};state.uiPrefs.theme=next;applyTheme();save();render(true);return}
 if(action.startsWith('studio-')){e.preventDefault();if(window.MasarStudio.click(action,el,{course:COURSE,state,save,render,toast}))return;}
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
 if(action==='video-seek'){
   const resource=(COURSE.media_resources||[]).find(m=>m.id===el.dataset.videoResource&&m.kind==='youtube_video');
   const seconds=Number(el.dataset.seconds);
   if(!resource||!/^[A-Za-z0-9_-]{11}$/.test(resource.youtube_id||'')||!Number.isInteger(seconds)||seconds<0||seconds>7200)return;
   const holder=el.closest('.study-video')?.querySelector('.video-player');if(!holder)return;
   const frame=document.createElement('iframe');
   frame.src='https://www.youtube-nocookie.com/embed/'+resource.youtube_id+'?start='+seconds+'&autoplay=1';
   frame.title='متابعة '+resource.title+' من '+Math.floor(seconds/60)+' دقيقة';
   frame.loading='lazy';frame.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');
   frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';
   holder.replaceChildren(frame);return
  }
  if(action==='video-load'){const id=el.dataset.video;if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;const holder=el.closest('.video-player');if(!holder)return;const iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/'+id;iframe.title=el.dataset.title||'فيديو تعليمي في القيادة';iframe.loading='lazy';iframe.setAttribute('allow','encrypted-media; picture-in-picture; fullscreen');iframe.setAttribute('allowfullscreen','');iframe.referrerPolicy='strict-origin-when-cross-origin';holder.replaceChildren(iframe);return}
 if(action==='visual-step'){const id=el.dataset.visual;const v=(COURSE.learning_visuals||[]).find(x=>x.id===id);if(v){visualStages[id]=Math.max(0,Math.min(v.steps.length-1,Number(el.dataset.step)||0));render(true);document.querySelector?.('[data-action="visual-step"][data-visual="'+id+'"][data-step="'+visualStages[id]+'"]')?.focus?.({preventScroll:true});document.getElementById('visual-learning')?.scrollIntoView({block:'nearest'});}return}
 if(action==='filter-weeks'){catalogFilter=el.dataset.filter||'all';render(true);return}
 if(action==='focus-mode'){state.uiPrefs=state.uiPrefs||{};state.uiPrefs.focus=!state.uiPrefs.focus;save();render(true);toast(state.uiPrefs.focus?'تم تفعيل وضع التركيز':'رجعنا العرض الكامل');return}
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

 if(action==='export'){const data=JSON.stringify({format:'masar-progress-v1',exportedAt:new Date().toISOString(),state},null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='masar-my-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تجهيز نسخة بياناتك الاحتياطية');return}
 if(action==='import'){document.getElementById('import-file')?.click();return}
 if(action==='clear'){if(confirm('سيتم حذف تقدم الدروس والإجابات وملاحظاتك في هذا المتصفح فقط. هل أنت متأكدة؟')){state={done:[],answers:{},notes:{},bookmarks:[],history:[],lastOpened:1,visited:[],readingPositions:{},videoNotes:{},videoWatched:{},sourceNotes:{},reviewAnswers:{},practiceChecks:{},signPractice:{},activityNotes:{},activityChecks:{},reviewHistory:{},mockSession:null,mockHistory:[],uiPrefs:{focus:false}};save();render(true);toast('تمت إعادة التقدم للبداية')}return}
}
document.addEventListener('click',e=>{const shortcut=e.target.closest('a[data-lesson-target]');if(shortcut)pendingLessonTarget=shortcut.dataset.lessonTarget;if(e.target.closest('.skip')){e.preventDefault();document.getElementById('main')?.focus();return}if(e.target.closest('[data-action]'))eventClick(e);else if(e.target.closest('.sidebar a'))mobileOpen=false});
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const card=e.target.closest('.card-premium-interactive,.week-card,.action-tile,.adaptive-task,.ts-card,.study-video,.coach-review-item,.hub-guide-step');if(!card)return;const rect=card.getBoundingClientRect();card.style.setProperty('--mx',((e.clientX-rect.left)/rect.width*100).toFixed(1)+'%');card.style.setProperty('--my',((e.clientY-rect.top)/rect.height*100).toFixed(1)+'%')},{passive:true});
document.addEventListener('input',e=>{if(e.target.id==='catalog-search'){filterText=e.target.value;const el=document.getElementById('week-catalog');if(el)el.innerHTML=weeksGrid();}if(e.target.dataset.note){state.notes[e.target.dataset.note]=e.target.value;save()}if(e.target.dataset.videoNote){state.videoNotes=state.videoNotes||{};state.videoNotes[e.target.dataset.videoNote]=e.target.value;save();const jumps=e.target.closest?.('.study-video')?.querySelector('.video-time-jumps');if(jumps)jumps.outerHTML=window.MasarHub.videoTimeLinks(e.target.dataset.videoNote,e.target.value)}if(e.target.dataset.sourceNote){state.sourceNotes=state.sourceNotes||{};state.sourceNotes[e.target.dataset.sourceNote]=e.target.value;save()}if(e.target.dataset.activityNote){state.activityNotes=state.activityNotes||{};state.activityNotes[e.target.dataset.activityNote]=e.target.value;save()}});
document.addEventListener('change',async e=>{if(e.target.id==='choose-week'&&e.target.value){startTest(e.target.value)}if((e.target.id==='hub-file'||e.target.id==='hub-batch')&&e.target.files?.[0]){await window.MasarHub.upload(e.target,{db:window.MasarDB,render,toast,course:COURSE});return}if(e.target.dataset.practiceId){state.practiceChecks=state.practiceChecks||{};state.practiceChecks[e.target.dataset.practiceId]=e.target.checked;save();render(true)}if(e.target.dataset.activityCheck){state.activityChecks=state.activityChecks||{};state.activityChecks[e.target.dataset.activityCheck]=e.target.checked;save();render(true)}if(e.target.id==='import-file'&&e.target.files?.[0]){try{const obj=JSON.parse(await e.target.files[0].text());if(e.target.files[0].size>5*1024*1024||obj.format!=='masar-progress-v1'||!obj.state||!Array.isArray(obj.state.done)||!obj.state.done.every(n=>Number.isInteger(n)&&n>=1&&n<=48)||!obj.state.answers||typeof obj.state.answers!=='object'||Array.isArray(obj.state.answers))throw Error('Invalid');if(confirm('هل تريدين استبدال تقدم هذا المتصفح بالنسخة المستوردة؟')){state={...state,...obj.state};save();render(true);toast('تم استيراد البيانات')}}catch(err){toast('ملف غير صالح لاستيراد تقدم مِسار')}}});
function lessonNumberFromRoute(path){const m=/^\/lesson\/(\d+)$/.exec(path||'');const n=Number(m?.[1]);return n>=1&&n<=48?n:null}
function captureReadingPosition(path=displayedRoute){const n=lessonNumberFromRoute(path);if(!n||restoringScroll)return;const y=Math.max(0,Math.round(window.scrollY||document.documentElement?.scrollTop||0));state.readingPositions=state.readingPositions||{};if(state.readingPositions[n]!==y){state.readingPositions[n]=y;save()}}
function restoreReadingPosition(){const n=lessonNumberFromRoute(route());if(!n)return;const y=Number(state.readingPositions?.[n])||0;if(y<=0)return;restoringScroll=true;requestAnimationFrame(()=>{window.scrollTo(0,y);requestAnimationFrame(()=>{restoringScroll=false})})}
window.addEventListener('scroll',()=>{if(!lessonNumberFromRoute(displayedRoute)||restoringScroll)return;clearTimeout(scrollWriteTimer);scrollWriteTimer=setTimeout(()=>captureReadingPosition(),600)},{passive:true});
window.addEventListener('hashchange',()=>{clearTimeout(scrollWriteTimer);captureReadingPosition(displayedRoute);mobileOpen=false;render();if(pendingLessonTarget&&lessonNumberFromRoute(route())){const target=pendingLessonTarget;pendingLessonTarget=null;requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({behavior:'auto',block:'start'}));}else{pendingLessonTarget=null;restoreReadingPosition();}if(location.hash==='#main'){document.getElementById('main')?.focus()}});
window.addEventListener('pagehide',()=>{clearTimeout(scrollWriteTimer);captureReadingPosition();state.studyStudio=state.studyStudio||{};state.studyStudio.lastVisitAt=new Date().toISOString();save()});
window.addEventListener('storage',e=>{if(e.key===baseKey){try{state={...state,...JSON.parse(e.newValue||'{}')};render(true)}catch(_){}}});
tickInterval=setInterval(()=>{window.MasarCoach?.tick(COURSE,state,save,render);window.MasarStudio.tick(state,save,render,toast)},1000);
render();restoreReadingPosition();
if(window.MasarDB){
  // Restore personal learning progress first; expensive indexing is not needed for rendering.
  window.MasarDB.loadUser().then(saved=>{
    databaseReady=true;databaseStatus='قاعدة IndexedDB جاهزة · حفظ محلي على هذا الجهاز';
    window.MasarHub?.refreshFiles(window.MasarDB,()=>{if(route()==='/sources')render(true)});
    if(!savedMirrorPresent&&!dirtyBeforeReady&&saved){
      state={...state,...saved};
      try{localStorage.setItem(baseKey,JSON.stringify(state))}catch(_){}
      render(true);restoreReadingPosition();
    } else save();
    const status=document.getElementById('db-status');if(status)status.textContent=databaseStatus;
  }).catch(e=>{
    databaseStatus='IndexedDB غير متاحة · تم استخدام التخزين الاحتياطي المحلي';
    console.warn('MASAR database unavailable',e);
    const status=document.getElementById('db-status');if(status)status.textContent=databaseStatus;
  }).finally(()=>{
    const seed=()=>window.MasarDB.seedReference(COURSE).catch(e=>console.warn('Course index unavailable',e));
    if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(seed,{timeout:3500});
    else setTimeout(seed,500);
  });
}
})();

