from pathlib import Path
root=Path(__file__).parent
s=(root/'index-template.html').read_text(encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8')
js=(root/'app.js').read_text(encoding='utf-8')
db_js=(root/'db'/'indexeddb.js').read_text(encoding='utf-8')
visual_js=(root/'visuals.js').read_text(encoding='utf-8')
json_text=(root/'data'/'course.json').read_text(encoding='utf-8').replace('</script','<\\/script')
s=s.replace('/* STYLES */',css).replace('/* COURSE DATA */',json_text).replace('/* APP CODE */',db_js+'\n'+visual_js+'\n'+js)
(root/'index.html').write_text(s,encoding='utf-8')
print('Built',root/'index.html',len(s),'chars')
