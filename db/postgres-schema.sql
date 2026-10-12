-- MASAR BMW | FUTURE cloud schema (PostgreSQL + Supabase Auth)
-- NOT ACTIVE. Site currently uses local IndexedDB. Run only in a new isolated project.
BEGIN;

CREATE TABLE IF NOT EXISTS public.weeks (
  id TEXT PRIMARY KEY,
  week_number SMALLINT NOT NULL UNIQUE CHECK (week_number BETWEEN 1 AND 16),
  title TEXT NOT NULL,
  content_status TEXT NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  lesson_number SMALLINT NOT NULL UNIQUE CHECK (lesson_number BETWEEN 1 AND 48),
  title TEXT NOT NULL,
  estimated_minutes SMALLINT NOT NULL DEFAULT 30 CHECK (estimated_minutes BETWEEN 1 AND 180),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','review','approved')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_masar_lessons_week ON public.lessons (week_id);
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  correct_choice_index SMALLINT NOT NULL CHECK (correct_choice_index BETWEEN 0 AND 5),
  review_status TEXT NOT NULL DEFAULT 'draft'
);
CREATE INDEX IF NOT EXISTS idx_masar_questions_lesson ON public.questions (lesson_id);
CREATE TABLE IF NOT EXISTS public.question_choices (
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  choice_index SMALLINT NOT NULL CHECK (choice_index BETWEEN 0 AND 5),
  choice_text TEXT NOT NULL,
  PRIMARY KEY (question_id, choice_index)
);
CREATE TABLE IF NOT EXISTS public.sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at DATE
);
CREATE TABLE IF NOT EXISTS public.lesson_sources (
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  note TEXT,
  PRIMARY KEY (lesson_id, source_id)
);

-- Per-user data is private and requires Supabase Auth.
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id),
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id),
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS public.question_answers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id),
  selected_choice_index SMALLINT NOT NULL CHECK (selected_choice_index BETWEEN 0 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,question_id)
);
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score>=0),
  total INTEGER NOT NULL CHECK (total>0 AND score<=total),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_masar_quiz_user ON public.quiz_attempts(user_id,attempted_at DESC);

-- Enable RLS, including readable public curriculum metadata.
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS masar_weeks_read ON public.weeks;
CREATE POLICY masar_weeks_read ON public.weeks FOR SELECT USING(true);
DROP POLICY IF EXISTS masar_lessons_read ON public.lessons;
CREATE POLICY masar_lessons_read ON public.lessons FOR SELECT USING(true);
DROP POLICY IF EXISTS masar_questions_read ON public.questions;
CREATE POLICY masar_questions_read ON public.questions FOR SELECT USING(true);
DROP POLICY IF EXISTS masar_choices_read ON public.question_choices;
CREATE POLICY masar_choices_read ON public.question_choices FOR SELECT USING(true);
DROP POLICY IF EXISTS masar_sources_read ON public.sources;
CREATE POLICY masar_sources_read ON public.sources FOR SELECT USING(true);
DROP POLICY IF EXISTS masar_lesson_sources_read ON public.lesson_sources;
CREATE POLICY masar_lesson_sources_read ON public.lesson_sources FOR SELECT USING(true);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS masar_progress_own ON public.lesson_progress;
CREATE POLICY masar_progress_own ON public.lesson_progress FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS masar_notes_own ON public.lesson_notes;
CREATE POLICY masar_notes_own ON public.lesson_notes FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS masar_bookmarks_own ON public.lesson_bookmarks;
CREATE POLICY masar_bookmarks_own ON public.lesson_bookmarks FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS masar_answers_own ON public.question_answers;
CREATE POLICY masar_answers_own ON public.question_answers FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS masar_attempts_own ON public.quiz_attempts;
CREATE POLICY masar_attempts_own ON public.quiz_attempts FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
COMMIT;
