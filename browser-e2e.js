// Real Chromium E2E for the GitHub Pages static app. Distinct from DOM-only smoke tests.
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const course=JSON.parse(fs.readFileSync(__dirname+'/data/course.json','utf8'));
(async()=>{
 const base=process.env.MASAR_E2E_URL||'http://127.0.0.1:8765/';
 assert(fs.statSync(__dirname+'/index.html').size<8000,'Fast public shell must be small');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1365,height:900},locale:'ar-SA',acceptDownloads:true});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',async d=>d.accept());
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('script[src="./assets/site.js"]').count(),1,'Compiled app asset missing');
  assert.equal(await page.locator('.loading-screen').count(),0,'Loading shell was not replaced');
  await page.waitForTimeout(800);
  console.log('E2E debug initial page',JSON.stringify({url:page.url(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,450),errors}));
  await page.locator('#app h1').first().waitFor({timeout:10000});assert((await page.locator('#app h1').first().innerText()).includes('مسارك لتعلّم القيادة'),'Home hero heading is missing');
  assert.match(await page.title(),/مِسار/);
  assert.equal(await page.locator('.hero-brooch-art,.brooch-svg,.hero-porsche-scene').count(),0,'Old jewelry/Porsche artwork must not return');
  assert.equal(await page.locator('.hero-premium img.hero-car-image').count(),1,
    'The user-selected transparent BMW image should be displayed');
  assert.match(await page.locator('.hero-car-image').getAttribute('src'),/assets\/masar-bmw-selected\.webp/);
  await page.locator('.hero-car-image').evaluate(img=>img.decode());
  assert(await page.locator('.hero-car-image').evaluate(img=>img.naturalWidth>=700),
    'User image must load from GitHub-hosted optimized asset');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','New visitors start in BMW dark mode');
  assert.equal(await page.locator('[data-action="theme-toggle"]').count(),1,'Theme switch exists in the top bar');
  const darkCard=await page.locator('.stats-bento .stat').first().evaluate(el=>getComputedStyle(el).backgroundColor);
  await assertNeutralUI('dark');
  assert.notEqual(darkCard,'rgb(255, 255, 255)','Dark theme cards should not be white');
  await page.locator('[data-action="theme-toggle"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light','Theme switch activates light mode');
  const lightPalette=await page.evaluate(()=>{
    const sidebar=document.querySelector('.sidebar'),link=sidebar?.querySelector('.sidebar-group-links a'),hero=document.querySelector('.hero-premium .hero-copy h1');
    return {sidebar:sidebar&&getComputedStyle(sidebar).backgroundColor,link:link&&getComputedStyle(link).color,
      hero:hero&&getComputedStyle(hero).color,kicker:document.querySelector('.hero-kicker')?.textContent||''};
  });
  assert.equal(lightPalette.sidebar,'rgb(255, 255, 255)','Light sidebar must use a readable white surface');
  assert.notEqual(lightPalette.link,'rgb(255, 255, 255)','Light sidebar links cannot remain white on white');
  assert((lightPalette.hero||'').startsWith('rgb('),'Light hero heading should have an explicit computed color');
  assert(!lightPalette.kicker.includes('THE DRIVING JOURNEY'),'Legacy marketing copy must not return after compilation');
  const sidebarGroupBorders=await page.locator('.sidebar .sidebar-nav-group').first().evaluate(el=>({
    top:getComputedStyle(el).borderTopWidth,left:getComputedStyle(el).borderLeftWidth,right:getComputedStyle(el).borderRightWidth
  }));
  assert.equal(sidebarGroupBorders.top,'0px','Light sidebar sections must not look like nested bordered cards');
  assert.equal(sidebarGroupBorders.left,'0px','Light sidebar group left edges must be clean');
  assert.equal(sidebarGroupBorders.right,'0px','Light sidebar group right edges must be clean');
  console.log('PASS Chromium: light sidebar text contrast and simplified hero copy');

  // Premium monochrome brand palette: buttons, cards, text, navigation and hero are achromatic.
  async function assertNeutralUI(mode) {
    const values=await page.evaluate(()=>{
      const selectors=['body','.sidebar','.sidebar .logo-icon','.sidebar .sidebar-group-title',
        '.sidebar .sidebar-group-links a','.topbar','.hero.hero-premium',
        '.hero-premium h1','.hero-premium p','.hero-premium .btn-primary',
        '.hero-premium .btn-ghost','.stat','.stat-label','.card'];
      const result=[];
      for(const selector of selectors){
        const el=document.querySelector(selector);if(!el)continue;
        const cs=getComputedStyle(el);
        result.push({selector,colors:[cs.color,cs.backgroundColor,cs.backgroundImage,cs.borderTopColor]});
      }
      return result;
    });
    const rgb=/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
    for(const entry of values)for(const color of entry.colors){
      for(const match of color.matchAll(rgb)){
        const channels=match.slice(1,4).map(Number);
        assert(channels[0]===channels[1]&&channels[1]===channels[2],
          'Non-monochrome UI in '+mode+' '+entry.selector+': '+color);
      }
    }
    console.log('PASS Chromium: monochrome '+mode+' palette across '+values.length+' UI components');
  }
  await assertNeutralUI('light');
  const lightCard=await page.locator('.stats-bento .stat').first().evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.notEqual(darkCard,lightCard,'Card surfaces must change with theme');

  // Survey actual computed colours across real pages, not only the theme toggle.
  const contrastSnapshots=[];
  for(const route of ['home','weeks','lesson/1','quiz','traffic-signs','videos','review','sources','settings']){
    await page.goto(base+'#/'+route,{waitUntil:'domcontentloaded'});
    const audit=await page.evaluate(()=>{
      const selectors=['.sidebar','.sidebar .logo strong','.sidebar .sidebar-group-title',
        '.sidebar .sidebar-group-links a','.sidebar .mini-progress','.topbar','.topbar .crumb',
        '.page-title','.hero-premium','.hero-premium h1','.hero-premium p',
        '.hero-premium .btn-ghost','.stat','.stat-label','.card','.card h3',
        '.lesson-body','.lesson-body p','.hub-question','.hub-question p',
        '.source-chapter','.source-chapter summary','.studio-lesson-tools','.week-card',
        '.week-card h3','.settings-card','.theme-setting','.theme-setting p'];
      const opaqueColor=el=>{
        for(let n=el;n;n=n.parentElement){
          const s=getComputedStyle(n),bg=s.backgroundColor;
          if(bg&&bg.startsWith('rgb('))return bg;
          if(bg&&bg.startsWith('rgba(')&&Number(bg.split(',').at(-1).replace(')','').trim())>=.98)return bg;
        }
        return getComputedStyle(document.documentElement).backgroundColor;
      };
      return selectors.map(sel=>{
        const e=[...document.querySelectorAll(sel)].find(n=>{
          const rect=n.getBoundingClientRect(),s=getComputedStyle(n);
          return rect.width>0&&rect.height>0&&s.visibility!=='hidden'&&s.display!=='none';
        });
        return e?{selector:sel,fg:getComputedStyle(e).color,bg:opaqueColor(e)}:null;
      }).filter(Boolean);
    });
    contrastSnapshots.push({route,audit});


    const requiredSelectors=['.sidebar .logo strong','.sidebar .sidebar-group-title',
      '.sidebar .sidebar-group-links a','.topbar .crumb','.page-title',
      '.hero-premium h1','.hero-premium p','.stat-label','.card h3',
      '.lesson-body p','.source-chapter summary','.week-card h3','.theme-setting p'];
    const toRGB=v=>v?.startsWith('rgb(')?v.slice(4,-1).split(',').map(n=>Number(n.trim())):null;
    const luminance=rgb=>rgb.map(c=>{const n=c/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;})
      .reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
    for(const item of audit.filter(x=>requiredSelectors.includes(x.selector))){
      const fg=toRGB(item.fg),bg=toRGB(item.bg);
      if(!fg||!bg)continue;
      const l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
      assert(ratio>=4.5,'Light mode text fails WCAG AA contrast on '+route+' '+item.selector+': '+ratio.toFixed(2));
    }

  }

  await page.goto(base+'#/sources',{waitUntil:'domcontentloaded'});
  const sourceCover=await page.locator('.masar-library-cover').first().evaluate(el=>{
    const title=el.querySelector('strong');
    return {fg:getComputedStyle(title).color,bg:getComputedStyle(el).backgroundColor,font:parseFloat(getComputedStyle(title).fontSize)};
  });
  assert.equal(sourceCover.fg,'rgb(244, 244, 244)','Book cover title must be legible on charcoal');
  assert(sourceCover.font>=17,'Book title must be legible at desktop size');
  console.log('PASS Chromium: charcoal book covers keep readable light titles');
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  console.log('PASS Chromium: Light Mode WCAG AA sampled text contrast across '+contrastSnapshots.length+' pages');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light','Theme preference persists across reload');
  await page.goto(base+'#/settings',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('[data-action="theme-set"][data-theme="dark"]').count(),1,'Settings expose explicit dark mode');
  await page.locator('[data-action="theme-set"][data-theme="dark"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','Settings can switch back to dark mode');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','Dark preference persists');
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  console.log('PASS Chromium: user-selected BMW hero image and dark/light themes persist');
  const heroDesktop=await page.locator('.hero-premium').evaluate(el=>{
    const frame=el.getBoundingClientRect(),copy=el.querySelector('.hero-copy')?.getBoundingClientRect(),
      img=el.querySelector('.hero-car-image'),ir=img?.getBoundingClientRect();
    return {width:frame.width,copyWidth:copy?.width||0,imageWidth:ir?.width||0,
      loaded:!!img?.naturalWidth,overlap:copy&&ir?Math.max(0,Math.min(copy.right,ir.right)-Math.max(copy.left,ir.left)):0};
  });
  assert(heroDesktop.loaded,'User-selected car must load on desktop');
  assert(heroDesktop.copyWidth>=300,'Headline needs readable desktop column: '+JSON.stringify(heroDesktop));
  assert(heroDesktop.imageWidth>=200,'Car photo needs a visible desktop panel: '+JSON.stringify(heroDesktop));
  assert(heroDesktop.overlap<30,'Car should not cover headline on desktop: '+JSON.stringify(heroDesktop));
  console.log('PASS Chromium: BMW image and title occupy separate desktop columns');

  assert.equal(await page.locator('.studio-session').count(),0,'Home must not show a timer card');
  assert.equal(await page.locator('.studio-timer-dock,.floating-timer').count(),0,'No timer overlay on initial home visit');
  assert.equal(await page.locator('[data-action="studio-panel-toggle"]').count(),0,'Timer opener belongs in lessons only');
  await page.goto(base+'#/lesson/1',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.studio-timer-large').count(),0,'Optional timer is closed when opening a lesson');
  await page.locator('[data-action="studio-panel-toggle"]').click();
  assert.equal(await page.locator('.studio-timer-large').count(),1,'Optional timer opens after click');
  await page.locator('[data-action="studio-duration"][data-min="15"]').click();
  await page.locator('.studio-focus-panel [data-action="studio-toggle"]').click();
  assert.equal(await page.locator('.studio-timer-dock,.floating-timer').count(),0,'Started timer must not float over content');
  assert.equal(await page.locator('.studio-focus-panel [data-studio-time]').count(),1,'Active timer appears only in its open panel');
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.studio-timer-dock,.floating-timer').count(),0,'Active timer remains invisible on home');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.studio-timer-dock,.floating-timer').count(),0,'Previously started timer does not reappear after reload');
  assert.equal(await page.locator('[data-studio-time]').count(),0,'No numeric countdown on home after reload');
  await page.goto(base+'#/lesson/1',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('[data-studio-time]').count(),0,'Returning to lesson does not auto-open timer');
  await page.locator('[data-action="studio-panel-toggle"]').click();
  assert.equal(await page.locator('.studio-focus-panel [data-studio-time]').count(),1,'Saved timer accessible on demand');
  await page.locator('.studio-focus-panel [data-action="studio-reset"]').click();
  assert.equal(await page.locator('.studio-timer-dock,.floating-timer').count(),0,'Reset cannot create floating timer');
  await page.locator('[data-action="studio-panel-toggle"]').click();
  assert.equal(await page.locator('.studio-timer-large').count(),0,'Timer panel collapses on request');
  console.log('PASS Chromium: optional timer never appears on entry, including saved active sessions');
  await page.locator('.studio-search-trigger').click();
  await page.locator('#studio-search-input').fill('النقطة العمياء');
  assert(await page.locator('#studio-search-results .studio-result').count()>0,'Search indexes course concepts');
  await page.locator('[data-action="studio-search-close"]').click();
  console.log('PASS Chromium: timer and search');
  await page.goto(base+'#/lesson/1',{waitUntil:'domcontentloaded'});
  await page.locator('.studio-checkpoint summary').click();
  await page.locator('[data-action="studio-diagnostic"]').first().click();
  assert((await page.locator('.studio-checkpoint .studio-diagnostic-feedback').count())===1,'Diagnostic feedback visible');
  await page.reload({waitUntil:'domcontentloaded'});
  assert((await page.locator('.studio-checkpoint .studio-diagnostic-feedback').count())===1,'Diagnostic answer must persist');
  console.log('PASS Chromium: diagnostic answer and learning recap');
  await page.goto(base+'#/videos',{waitUntil:'domcontentloaded'});
  await page.locator('[data-video-note]').first().fill('02:15 — الانتباه لحركة السيارة');
  assert.equal(await page.locator('.video-time-jumps [data-action="video-seek"]').first().count(),1,'Video timestamp link should be generated');
  await page.locator('.video-time-jumps [data-action="video-seek"]').first().click();
  assert.match(await page.locator('.study-video .video-player iframe').first().getAttribute('src'),/start=135/,'Video should open at saved time');
  console.log('PASS Chromium: timestamped video notes');
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  await page.locator('.study-command-grid .study-today-item').first().waitFor();
  assert.equal(await page.locator('.study-today-item').count(),4,'Daily learning studio needs four clear steps');
  assert.equal(await page.locator('.adaptive-task').count(),3,'Home should build a three-part adaptive study session');
  assert((await page.locator('.adaptive-plan').innerText()).includes('وش تذاكرين الآن؟'),'Adaptive plan heading is missing');
  assert.equal(await page.locator('.hero-status-strip > span').count(),4,'Automotive hero should expose four study status metrics');
  await page.locator('[data-action="study-star"]').click();
  await page.reload({waitUntil:'domcontentloaded'});
  assert((await page.locator('[data-action="study-star"]').innerText()).includes('إلغاء نجمة اليوم'),'Daily study star did not persist after reload');
  await page.locator('[data-action="study-star"]').click();
  console.log('PASS Chromium: daily learning studio and optional stars persist');
  // Start from a beginner's menu: a menu group must expose its contents.
  await page.goto(base+'#/weeks',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.learning-phase').count(),4,'Educational phase grouping is incomplete');
  await page.locator('.sidebar-nav-group').first().locator('summary').click();
  assert((await page.locator('.sidebar-nav-group').first().getAttribute('open'))!==null,'Menu category accordion did not expand');
  await page.goto(base+'#/lesson/1',{waitUntil:'domcontentloaded'});
  await page.locator('textarea[data-activity-note="ACT-001"]').waitFor();
  await page.locator('.lesson-journey').waitFor();
  await page.locator('.lesson-recall').waitFor();
  await page.locator('[data-action="focus-mode"]').click();
  assert((await page.locator('#app').getAttribute('class')||'').includes('focus-mode'),'Focus mode class was not activated');
  assert.equal(await page.locator('.lesson-aside').evaluate(el=>getComputedStyle(el).display),'none','Lesson aside should disappear in focus mode');
  await page.reload({waitUntil:'domcontentloaded'});
  assert((await page.locator('#app').getAttribute('class')||'').includes('focus-mode'),'Focus mode preference did not persist after reload');
  await page.locator('[data-action="focus-mode"]').click();
  assert.equal(await page.locator('.lesson-recall-prompts > div').count(),3,'Every lesson needs three retrieval prompts');
  await page.locator('.lesson-recall-answer summary').click();
  assert((await page.locator('.lesson-recall-answer').innerText()).includes('جربت من الذاكرة'),'Retrieval answer reveal is missing');
  await page.locator('[data-action="study-read"]').click();
  await page.reload({waitUntil:'domcontentloaded'});
  assert((await page.locator('[data-action="study-read"]').innerText()).includes('تم تسجيل قراءة'),'Lesson reading state did not persist');
  await page.locator('[data-action="study-read"]').click();
  console.log('PASS Chromium: four-step lesson journey and reading toggle'); 
  // First-time learner flow: the reference should expand in the same lesson, not open a new tab.
  const chapters=page.locator('.source-chapter');
  assert((await chapters.count())>=1,'A beginner must find a linked source inside the lesson');
  await chapters.first().locator('summary').click();
  assert(await chapters.first().locator('.source-chapter-inner').isVisible(),'Book chapter summary does not expand');
  assert((await chapters.first().locator('.source-honesty').innerText()).includes('ليس نسخًا حرفيًا'),'The book paraphrase is not labeled');
  assert.equal(await chapters.first().locator('[data-action="hub-pick"]').count(),0,'Lesson source must not require a manual file upload');
  await chapters.first().locator('[data-action="hub-source-summary"]').click();
  await chapters.first().locator('.source-page-summary').waitFor({timeout:10000});
  assert((await chapters.first().locator('.source-page-summary').innerText()).includes('ليس صورة أو نسخًا حرفيًا'),'Source summary must clearly distinguish Masar explanation from the original page');
  console.log('PASS Chromium: lesson references open inside Masar without a manual upload');

  await page.locator('textarea[data-activity-note="ACT-001"]').fill('اختبار حفظ Chromium: لاحظت الفرامل والحزام');
  await page.locator('input[data-activity-check="ACT-001"]').check();
  await page.waitForTimeout(800);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('textarea[data-activity-note="ACT-001"]').waitFor();
  assert.equal(await page.locator('textarea[data-activity-note="ACT-001"]').inputValue(),'اختبار حفظ Chromium: لاحظت الفرامل والحزام');
  assert.equal(await page.locator('input[data-activity-check="ACT-001"]').isChecked(),true);
  console.log('PASS Chromium: lesson reflection and check state survive reload');
  await page.locator('[data-action="lesson-answer"]').first().click();
  await page.locator('.feedback').waitFor();
  assert((await page.locator('.feedback-reason').innerText()).trim().length>8,'Lesson feedback should explain why the answer is correct or wrong');
  assert((await page.locator('.feedback-source').innerText()).includes('مرجع للمراجعة'),'Lesson feedback should expose a linked reading reference');
  console.log('PASS Chromium: lesson questions give immediate rationale and a visible review reference');
  await page.goto(base+'#/lesson/8',{waitUntil:'domcontentloaded'});
  await page.getByText('موثق رسميًا في نطاق محدد').first().waitFor();
  assert((await page.locator('.lesson-verification').innerText()).includes('وجوب التوقف التام عند علامة قف'),'Official verification scope should be visible');
  await page.locator('#practice-extra [data-action="hub-answer"]').first().click();
  await page.locator('#practice-extra .feedback').waitFor();
  assert((await page.locator('#practice-extra .feedback-reason').innerText()).trim().length>8,'Extra review question must explain its answer');
  console.log('PASS Chromium: verified lesson status and second review question are visible');
  await page.goto(base+'#/traffic-signs',{waitUntil:'domcontentloaded'});
  await page.locator('.ts-grid .ts-card').first().waitFor();
  assert.equal(await page.locator('.ts-grid .ts-card').count(),course.sign_library.length);
  await page.locator('[data-action="sign-filter"][data-filter="علامات أرضية"]').click();
  assert.equal(await page.locator('.ts-grid .ts-card').count(),course.sign_library.filter(x=>x.category==='علامات أرضية').length);
  await page.locator('[data-action="sign-filter"][data-filter="all"]').click();
  assert.equal(await page.locator('.ts-compare-card').count(),3);
  assert.equal(await page.locator('.ts-mastery-summary > div').count(),4);
  await page.locator('[data-action="sign-mode"][data-mode="quiz"]').click();
  const firstSign=course.sign_library[0];
  await page.locator('[data-action="sign-quiz-kind"][data-kind="meaning"]').click();
  await page.getByRole('button',{name:firstSign.title,exact:true}).click();
  await page.locator('.ts-explanation').waitFor();
  assert((await page.locator('.ts-explanation').innerText()).includes('التصرف'),'Meaning question must still teach the driving action');
  await page.locator('[data-action="sign-quiz-kind"][data-kind="action"]').click();
  await page.getByRole('button',{name:firstSign.action,exact:true}).click();
  await page.locator('.ts-explanation').waitFor();
  await page.locator('[data-action="sign-mode"][data-mode="study"]').click();
  await page.locator('[data-action="sign-filter"][data-filter="mastered"]').click();
  assert((await page.locator('.ts-card').count())>=1,'A sign should be mastered only after correct meaning and action retrieval');
  console.log('PASS Chromium: traffic signs test both recognition and the correct driving action');
  await page.goto(base+'#/practice-quiz',{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="hub-filter"][data-topic="all"]').click();
  await page.locator('.hub-sign-scene .masar-question-visual').waitFor();
  const seenVisualKeys=new Set();
  for(let i=0;i<course.review_questions.length;i++){
    const key=await page.locator('.hub-sign-scene .masar-question-visual').getAttribute('data-visual-key');
    seenVisualKeys.add(key);
    if(i<course.review_questions.length-1)await page.locator('[data-action="hub-next"]').click();
  }
  const expectedKeys=new Set(course.review_questions.map(q=>q.visual_key));
  assert.deepEqual([...seenVisualKeys].sort(),[...expectedKeys].sort(),'Review bank must render a meaningful visual for every visual_key in the dataset');
  assert.equal(await page.locator('.hub-sign-scene [aria-label*="المفهوم"]').count(),0,'Review bank must not fall back to a generic question-mark image');
  console.log('PASS Chromium: all review-question visual types render as real educational diagrams');
  assert.match(await page.locator('.hub-sign-scene figcaption').first().innerText(),/رسم تعليمي/,'Review illustrations must be accurately labeled');
  await page.goto(base+'#/videos',{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="video-watched"]').first().click();
  await page.waitForTimeout(300);
  assert((await page.locator('.video-watch-status.done').count())>=1,'Watched video should expose a persistent completed state');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.video-watch-status.done').first().waitFor();
  console.log('PASS Chromium: watched-video progress persists and feeds the learning flow');
  await page.goto(base+'#/practice-checklist',{waitUntil:'domcontentloaded'});
  await page.locator('.hub-school-policy').waitFor();
  assert((await page.locator('.hub-school-policy').innerText()).includes('6 و15 و30 ساعة'),'School-specific source policy missing');
  console.log('PASS Chromium: school assessment differences are properly labeled');
  // Navigation and media: beginner should see understandable phases, and videos play in-page.
  await page.goto(base+'#/weeks',{waitUntil:'domcontentloaded'});
  await page.locator('.learning-phase').first().waitFor();
  assert.equal(await page.locator('.learning-phase').count(),4,'The 16 weeks must be grouped by four learning stages');
  await page.goto(base+'#/videos',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'مقاطع تعليم القيادة'}).waitFor();
  assert.equal(await page.locator('.video-gallery-grid .study-video').count(),3,'Only verified direct-video links may be presented as playable');
  await page.locator('.video-gallery-grid [data-action="video-load"]').first().click();
  const playerFrame=page.locator('.video-gallery-grid .video-player iframe').first();
  await playerFrame.waitFor();
  assert.match(await playerFrame.getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\/[\w-]{11}$/);
  assert.equal(page.url(),base+'#/videos','Video play should not navigate away from Masar');
  await page.locator('.video-gallery-grid textarea[data-video-note]').first().fill('فحص درس الفيديو داخل مِسار');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.video-gallery-grid textarea[data-video-note]').first().inputValue(),'فحص درس الفيديو داخل مِسار');
  console.log('PASS Chromium: four learning phases, in-page video playback and notes persistence');

  await page.goto(base+'#/mock-exam',{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="coach-mock-start"][data-mode="learning"]').click();
  await page.locator('[data-action="coach-mock-answer"]').first().click();
  assert.equal(await page.locator('[data-action="coach-mock-answer"].active').count(),1);
  await page.locator('.coach-live-feedback').waitFor();
  assert.equal(await page.locator('[data-action="coach-mock-answer"].is-correct').count(),1);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('[data-action="coach-mock-answer"].active').count(),1);
  await page.locator('.coach-live-feedback').waitFor();
  await page.locator('[data-action="coach-mock-finish"]').click();
  await page.getByText('نتيجة تدريبية شخصية').waitFor();
  console.log('PASS Chromium: learning-mode mock gives instant feedback, resumes and saves results');
  await page.goto(base+'#/sources',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'المصادر وملفاتي الخاصة'}).waitFor();
  assert.equal(await page.locator('[data-action="hub-pick"]').count(),0,'Sources page must not ask the learner to upload PDFs');
  assert.equal(await page.locator('[data-action="hub-batch-pick"]').count(),0,'Bulk upload should not be part of the normal sources workflow');
  assert.equal(await page.locator('.source-visual-preview').count(),course.uploaded_image_index.length,'Every indexed visual reference should have an in-page educational preview');
  assert.equal(await page.locator('.masar-library-cover').count(),course.personal_documents.length,'Illustrated covers for seven indexed books must render');
  assert.match(await page.locator('.masar-library-cover').first().getAttribute('aria-label'),/ليس صورة الغلاف الأصلي/);
  assert.equal(await page.locator('.hub-source [data-action="hub-pick"]').count(),0,'Reading source excerpts should not require uploaded books');
  const pageOpen=page.locator('[data-action="hub-open-page"]').first();
  await pageOpen.waitFor();
  await pageOpen.click();
  await page.locator('.hub-source .source-page-summary').first().waitFor({timeout:10000});
  assert((await page.locator('.hub-source .source-page-summary').first().innerText()).includes('فتح الدرس الكامل'),'Source page button must open an actionable in-page summary');
  console.log('PASS Chromium: sources are useful without uploads and visual references are no longer blank');

  await page.goto(base+'#/review',{waitUntil:'domcontentloaded'});
  await page.getByText('خطتي لمراجعة أخطائي').waitFor();
  console.log('PASS Chromium: spaced-review dashboard renders');
  await page.goto(base,{waitUntil:'load'});
  const sw=await page.evaluate(async()=>{
   if(!('serviceWorker' in navigator))return false;
   const registration=await navigator.serviceWorker.ready;
   return Boolean(registration&&registration.active);
  });
  assert.equal(sw,true,'service worker should register on localhost for offline testing');
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#app h1').first().waitFor({timeout:10000});assert((await page.locator('#app h1').first().innerText()).includes('مسارك لتعلّم القيادة'),'Home hero heading is missing');
  console.log('PASS Chromium: site loads from service-worker cache without network');
  await context.setOffline(false);
  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('[data-action="theme-toggle"]').isVisible(),'Theme switch must remain available on mobile');
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  await page.locator('.study-command-grid').waitFor();
  await page.locator('.mobile-dock').waitFor();
  assert.equal(await page.locator('.mobile-dock a').count(),5,'Mobile dock should expose five primary study routes');
  assert.equal(await page.locator('.mobile-dock').evaluate(el=>getComputedStyle(el).display),'grid','Mobile dock should be visible at 390px');
  const homeSizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(homeSizes.scroll<=homeSizes.width+8,'Mobile learning studio horizontal overflow: '+JSON.stringify(homeSizes));
  console.log('PASS Chromium: mobile learning studio avoids horizontal scrolling');
  const heroMobile=await page.locator('.hero-premium').evaluate(el=>{
    const copy=el.querySelector('.hero-copy').getBoundingClientRect(),
      img=el.querySelector('.hero-car-image'),frame=img.getBoundingClientRect();
    return {copyWidth:copy.width,imageWidth:frame.width,imageHeight:frame.height,
      imageTop:frame.top,copyBottom:copy.bottom,loaded:img.naturalWidth>0,
      overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert(heroMobile.copyWidth>=280,'Mobile title must be readable: '+JSON.stringify(heroMobile));
  assert(heroMobile.loaded,'User selected BMW photo must load on mobile');
  assert(heroMobile.imageTop>=heroMobile.copyBottom-8,'BMW car must stack below text on mobile: '+JSON.stringify(heroMobile));
  assert(heroMobile.imageHeight>=180,'Mobile BMW photograph should remain clear: '+JSON.stringify(heroMobile));
  assert(heroMobile.overflow<=8,'Mobile BMW hero cannot overflow: '+JSON.stringify(heroMobile));
  console.log('PASS Chromium: selected transparent BMW stacks below title on mobile');

  await page.goto(base+'#/traffic-signs',{waitUntil:'domcontentloaded'});
  await page.locator('.ts-grid').waitFor();
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(sizes.scroll<=sizes.width+8,'Mobile viewport has unwanted horizontal overflow: '+JSON.stringify(sizes));
  console.log('PASS Chromium: mobile layout avoids horizontal scrolling');
  await page.goto(base+'#/videos',{waitUntil:'domcontentloaded'});
  await page.locator('.video-gallery-grid').waitFor();
  const mediaWidth=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(mediaWidth.scroll<=mediaWidth.viewport+8,'Mobile videos overflow horizontally: '+JSON.stringify(mediaWidth));
  await page.goto(base+'#/lesson/1',{waitUntil:'domcontentloaded'});
  await page.locator('.source-chapter').first().locator('summary').click();
  const readingWidth=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(readingWidth.scroll<=readingWidth.viewport+8,'Mobile textbook accordion overflows horizontally: '+JSON.stringify(readingWidth));
  console.log('PASS Chromium: mobile video and on-page textbook reader avoid horizontal overflow');

  assert.deepEqual(errors,[], 'Unexpected browser script exceptions');
  console.log('PASS Chromium: no uncaught JavaScript page errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
