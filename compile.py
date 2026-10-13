from pathlib import Path
root=Path(__file__).parent
assets=root/'assets'
assets.mkdir(exist_ok=True)
css='\n'.join((root/name).read_text(encoding='utf-8') for name in ('styles.css','learning-studio.css','bmw-theme.css'))
scripts=['db/indexeddb.js','visuals.js','study-hub.js','traffic-signs.js','study-coach.js',
         'lesson-guides-core.js','lesson-guides-01.js','lesson-guides-02.js','lesson-guides-03.js',
         'lesson-guides-04.js','learning-studio.js','app.js']
js='\n'.join((root/name).read_text(encoding='utf-8') for name in scripts)
course=(root/'data/course.json').read_text(encoding='utf-8')
standalone=(root/'index-template.html').read_text(encoding='utf-8')
standalone=standalone.replace('/* STYLES */',css)
standalone=standalone.replace('/* COURSE DATA */',course.replace('</script','<\\/script'))
standalone=standalone.replace('/* APP CODE */',js)
(root/'index-standalone.html').write_text(standalone,encoding='utf-8')
(assets/'site.css').write_text(css+'\n',encoding='utf-8')
(assets/'course-data.js').write_text('window.MasarCourse='+course+';\n',encoding='utf-8')
(assets/'site.js').write_text(js+'\n',encoding='utf-8')
(root/'index.html').write_text((root/'index-shell.html').read_text(encoding='utf-8'),encoding='utf-8')
print('Built public shell and standalone offline copy')
