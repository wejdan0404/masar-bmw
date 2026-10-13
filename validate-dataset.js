/* MASAR data integrity checks — do not treat draft as legally verified. */
const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync(__dirname+'/data/course.json','utf8'));
function unique(items,what){const ids=items.map(x=>x.id);assert.equal(new Set(ids).size,ids.length,'Duplicate '+what+' IDs')}
for(const name of ['weeks','lessons','questions','sources','personal_documents','uploaded_image_index','external_study_sources','review_questions','practical_checklist','review_claims','media_resources','learning_visuals','lesson_reading_map','sign_library','lesson_activities']) unique(d[name]||[],name);
assert.equal(d.weeks.length,16);
assert.equal(d.lessons.length,48);
assert.equal(d.questions.length,48);
assert.equal(d.personal_documents.length,7);
assert.equal(d.uploaded_image_index.length,6);
assert.equal(d.review_questions.length,36);
assert(d.sign_library.length>=36,'Traffic sign library unexpectedly shrank');
assert.equal(d.lesson_activities.length,48);
assert.equal(new Set(d.lesson_activities.map(x=>x.id)).size,48);
for(const a of d.lesson_activities){assert(d.lessons.some(l=>l.id===a.lesson_id),'Activity with no lesson');assert(a.observation.length>25&&a.reasoning.length>20&&a.verification.length>20,'Insufficient activity '+a.id);assert(a.status==='original_practice_not_formal_assessment')}
const signIds=new Set(d.sign_library.map(s=>s.id));assert.equal(signIds.size,d.sign_library.length);
for(const sign of d.sign_library){assert(['تحذيرية','تنظيمية','إرشادية','مناطق عمل ومؤقتة','علامات أرضية'].includes(sign.category));assert(sign.title&&sign.meaning.length>=12&&sign.action.length>=12);assert(sign.pictogram_status==='educational_illustration_not_official');assert(sign.review_status==='requires_official_pictogram_comparison');assert(sign.source_url.startsWith('https://www.moi.gov.sa/'));for(const id of sign.lesson_ids)assert(d.lessons.some(l=>l.id===id),'Sign linked to missing lesson')}
assert.equal(d.lesson_reading_map.length,48);
assert.equal(d.practical_assessment_reference.fault_categories.length,16);
assert.equal(d.practical_assessment_reference.immediate_failure_examples.length,6);
assert(d.practical_assessment_reference.official_unified_standard===false);
assert.equal(d.community_pages.image_links.length,39);
const lessonIds=new Set(d.lessons.map(x=>x.id)),weekIds=new Set(d.weeks.map(x=>x.id)),allSourceIds=new Set([...(d.personal_documents||[]),...(d.uploaded_image_index||[]),...(d.external_study_sources||[])].map(x=>x.id));
for(const l of d.lessons)assert(weekIds.has(l.week_id),'Orphan lesson: '+l.id);
for(const q of d.review_questions){
 assert(Array.isArray(q.options)&&q.options.length>=3);
 assert(Number.isInteger(q.correct_option_index)&&q.correct_option_index>=0&&q.correct_option_index<q.options.length);
 assert(q.explanation.length>=25,'No explanation '+q.id);
 assert(q.status==='editorial_practice_original'&&q.is_official_exam_question===false);
 assert(allSourceIds.has(q.source_id),'Missing reference '+q.source_id);
}
for(const block of d.practical_checklist)for(const id of block.lesson_ids)assert(lessonIds.has(id),'Unknown linked practical lesson');
const docPages=new Map(d.personal_documents.map(x=>[x.id,x.pages]));
const seenReading=new Set();
for(const row of d.lesson_reading_map){
 assert(lessonIds.has(row.lesson_id),'Unknown lesson reading: '+row.lesson_id);
 assert(!seenReading.has(row.lesson_id),'Duplicate reading map for '+row.lesson_id);
 seenReading.add(row.lesson_id);
 assert(row.resources.length>=1,'No reference: '+row.lesson_id);
 for(const ref of row.resources){
  assert(docPages.has(ref.source_id),'Unknown PDF: '+ref.source_id);
  assert(ref.pdf_page_start>=1 && ref.pdf_page_end<=docPages.get(ref.source_id) && ref.pdf_page_start<=ref.pdf_page_end,'PDF page out of range');
  assert(ref.verification==='topic_and_page_index_checked_not_full_line_by_line','Unverified book asserted as fully audited');
 }
}
for(const file of d.personal_documents)assert(file.storage==='personal_upload_only'&&file.available_on_public_site===false,'Unauthorized public file');
for(const file of d.uploaded_image_index)assert(file.storage==='personal_upload_only'&&file.available_on_public_site===false,'Unauthorized public image');
for(const claim of d.review_claims)assert(claim.allowed_in_quiz===false,'Unverified rule in quiz');
for(const [idx,x] of d.community_pages.image_links.entries())assert(x.page===idx+1&&/saudirokhsa\.com/.test(x.url));
const videos=d.media_resources.filter(x=>x.kind==='youtube_video');assert(videos.length===3);assert(d.media_resources.filter(x=>x.kind!=='youtube_video').length===3);assert(d.school_specific_evidence.length===2);for(const source of d.school_specific_evidence){assert(source.not_universal===true);assert(source.source_url.startsWith('https://sites.qu.edu.sa/'));}assert(videos.some(x=>x.youtube_id==='SIay14R3GKY'));
console.log('PASS MASAR content validation: '+d.lessons.length+' lessons, '+d.review_questions.length+' original review questions, '+d.personal_documents.length+' personal PDFs, '+d.uploaded_image_index.length+' image references; no unverified evaluation thresholds used.');


const html=fs.readFileSync(__dirname+'/index-standalone.html','utf8');
const shell=fs.readFileSync(__dirname+'/index.html','utf8');
const publicBundle=fs.readFileSync(__dirname+'/assets/site.js','utf8');
const courseAsset=fs.readFileSync(__dirname+'/assets/course-data.js','utf8');
assert(Buffer.byteLength(shell,'utf8')<8000,'Public HTML must stay under 8 KB');
for(const file of ['site.css','course-data.js','site.js'])assert(shell.includes('./assets/'+file),'Missing public asset '+file);
assert(publicBundle.includes('const COURSE=window.MasarCourse||'),'Public app course bootstrap missing');
assert(courseAsset.startsWith('window.MasarCourse='),'Missing external curriculum');
assert.deepStrictEqual(JSON.parse(courseAsset.slice('window.MasarCourse='.length).trim().replace(/;$/, '')).lessons,d.lessons);
console.log('PASS fast public shell and split assets');
const embedded=html.match(/<script\s+type="application\/json"\s+id="course-data">([\s\S]*?)<\/script>/);
assert(embedded,'Compiled website is missing embedded course data');
const published=JSON.parse(embedded[1]);
for(const key of ['weeks','lessons','questions','review_questions','sign_library','lesson_activities','media_resources']){
 assert.deepStrictEqual(published[key],d[key],'Compiled index.html has stale '+key+'; run python compile.py before publishing');
}
console.log('PASS compiled website curriculum matches source data');


for(const script of ['app.js','study-coach.js','traffic-signs.js','visuals.js','study-hub.js','db/indexeddb.js','lesson-guides-core.js','lesson-guides-01.js','lesson-guides-02.js','lesson-guides-03.js','lesson-guides-04.js']){
 const source=fs.readFileSync(__dirname+'/'+script,'utf8');
 assert(html.includes(source),'Compiled index.html contains stale '+script+'; run python compile.py before publishing');
}
console.log('PASS compiled application scripts match source files');


assert.equal(d.personal_documents.length,7,'All seven personal PDF records must remain indexed');
for(const source of d.personal_documents){
 assert(d.lesson_reading_map.some(r=>(r.resources||[]).some(x=>x.source_id===source.id)),
   'A personal PDF is missing from the lesson reading index: '+source.id);
 assert(source.available_on_public_site===false,'Do not publish copyrighted personal PDFs by default: '+source.id);
}
assert(html.includes('sidebar-nav-group'),'Compiled website is missing grouped educational navigation');
assert(html.includes('Masar Thmanyah Sans'),'Locally installed Thmanyah typography fallback missing');
console.log('PASS seven private references are lesson-indexed; grouped navigation and local font CSS are compiled');

/* Educational depth and content presence checks: no empty lesson shells. */
const vm=require('vm');
const guidePaths=['lesson-guides-core.js','lesson-guides-01.js','lesson-guides-02.js','lesson-guides-03.js','lesson-guides-04.js'];
const guideContext={window:{}};
vm.runInNewContext(guidePaths.map(p=>fs.readFileSync(__dirname+'/'+p,'utf8')).join('\n'),guideContext);
assert.equal(guideContext.window.MasarGuides.getCount(),48,'All 48 lessons need expanded educational text');
for(const l of d.lessons){
 const rich=guideContext.window.MasarGuides.render(l);
 assert(rich.includes('خطوات ومفاهيم مهمة')&&rich.includes('فكّري قبل كشف الإجابة'),'Missing pedagogy '+l.id);
 assert(rich.length>700,'Expanded content too thin '+l.id);
}
assert(html.includes('window.MasarGuides.render(l)'),'Published lesson page does not render the expansions');
console.log('PASS 48 distinct in-depth lesson guides rendered and synced');
