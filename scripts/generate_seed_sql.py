"""Generate SQL seed from versioned course.json. No remote database writes."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
course=json.loads((ROOT/'data/course.json').read_text(encoding='utf-8'))
def q(x):
    return 'NULL' if x is None else "'" + str(x).replace("'", "''") + "'"
def j(x):
    return q(json.dumps(x,ensure_ascii=False,separators=(',',':'))) + '::jsonb'
lines=['-- MASAR BMW | draft content, review before any import.','BEGIN;']
for w in course['weeks']:
    lines.append(f"INSERT INTO public.weeks(id,week_number,title,content_status) VALUES ({q(w['id'])},{w['number']},{q(w['title'])},'draft') ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,week_number=EXCLUDED.week_number;")
for l in course['lessons']:
    lines.append(f"INSERT INTO public.lessons(id,week_id,lesson_number,title,estimated_minutes,content,publication_status) VALUES ({q(l['id'])},{q(l['week_id'])},{l['order']},{q(l['title'])},{l['estimated_minutes']},{j(l['study_content'])},'draft') ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,estimated_minutes=EXCLUDED.estimated_minutes;")
for s in course['sources']:
    provenance={'scope':s.get('scope'),'notes':s.get('notes'),'check':s.get('check')}
    lines.append(f"INSERT INTO public.sources(id,title,url,category,provenance) VALUES ({q(s['id'])},{q(s['name'])},{q(s['url'])},{q(s.get('category'))},{j(provenance)}) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,url=EXCLUDED.url,provenance=EXCLUDED.provenance;")
for a in course['questions']:
    lines.append(f"INSERT INTO public.questions(id,lesson_id,prompt,rationale,correct_choice_index,review_status) VALUES ({q(a['id'])},{q(a['lesson_id'])},{q(a['question'])},{q(a['rationale'])},{a['correct_option_index']},'draft') ON CONFLICT(id) DO UPDATE SET prompt=EXCLUDED.prompt,rationale=EXCLUDED.rationale,correct_choice_index=EXCLUDED.correct_choice_index;")
    for i,option in enumerate(a['options']):
        lines.append(f"INSERT INTO public.question_choices(question_id,choice_index,choice_text) VALUES ({q(a['id'])},{i},{q(option)}) ON CONFLICT(question_id,choice_index) DO UPDATE SET choice_text=EXCLUDED.choice_text;")
source_ids={s['id'] for s in course['sources']}
for l in course['lessons']:
    for sid in l.get('source_ids_suggested') or []:
        if sid in source_ids:
            lines.append(f"INSERT INTO public.lesson_sources(lesson_id,source_id,note) VALUES ({q(l['id'])},{q(sid)},'مرجع مقترح غير موثق سطرًا بسطر') ON CONFLICT(lesson_id,source_id) DO NOTHING;")
lines+=['COMMIT;','']
(ROOT/'db/postgres-seed.sql').write_text('\n'.join(lines),encoding='utf-8')
print('Seed statements:',len(lines)-3)
