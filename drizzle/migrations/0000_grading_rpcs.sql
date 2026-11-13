CREATE OR REPLACE FUNCTION public.get_exercise_for_grading(_exercise_id uuid)
RETURNS TABLE(id uuid, lesson_id uuid, question text, expected_answer text, exercise_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.lesson_id, e.question, e.expected_answer, e.exercise_type
  FROM public.lesson_exercises e
  WHERE e.id = _exercise_id AND auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.get_exercise_for_grading(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exercise_for_grading(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_graded_attempt(
  _exercise_id uuid, _user_answer text, _is_correct boolean, _score integer,
  _feedback text, _correct_answer text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _lesson uuid;
  _score_c int := greatest(0, least(100, coalesce(_score,0)));
  _already boolean;
  _recent int;
  _xp int := 0;
  s public.user_stats%ROWTYPE;
  _today date := (now() at time zone 'utc')::date;
  _streak int;
  _hearts int;
  _total int; _weekly int;
  _completed boolean := false;
  _prog public.user_lesson_progress%ROWTYPE;
  _b text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT lesson_id INTO _lesson FROM public.lesson_exercises WHERE id = _exercise_id;
  IF _lesson IS NULL THEN RAISE EXCEPTION 'exercise not found'; END IF;

  -- Rate limit: max 10 attempts per exercise per minute
  SELECT count(*) INTO _recent FROM public.user_exercise_attempts
   WHERE user_id = _uid AND exercise_id = _exercise_id AND created_at > now() - interval '1 minute';
  IF _recent >= 10 THEN RAISE EXCEPTION 'too many attempts'; END IF;

  -- XP computed here; only the first correct attempt per exercise earns XP/hearts
  SELECT EXISTS(SELECT 1 FROM public.user_exercise_attempts
   WHERE user_id = _uid AND exercise_id = _exercise_id AND is_correct) INTO _already;
  IF _is_correct AND NOT _already THEN
    _xp := CASE WHEN _score_c >= 90 THEN 15 ELSE 10 END;
  END IF;

  INSERT INTO public.user_exercise_attempts(user_id, exercise_id, user_answer, is_correct, score, ai_feedback, correct_answer, xp_awarded)
  VALUES (_uid, _exercise_id, left(_user_answer,5000), coalesce(_is_correct,false), _score_c, left(_feedback,2000), left(_correct_answer,2000), _xp);

  INSERT INTO public.user_stats(user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO s FROM public.user_stats WHERE user_id = _uid FOR UPDATE;

  _streak := s.current_streak;
  IF _is_correct AND (s.last_activity_date IS DISTINCT FROM _today) THEN
    _streak := CASE WHEN s.last_activity_date = _today - 1 THEN s.current_streak + 1 ELSE 1 END;
  END IF;
  _hearts := s.hearts + CASE WHEN _xp > 0 THEN 1 ELSE 0 END;
  _total := s.total_xp + _xp; _weekly := s.weekly_xp + _xp;

  -- Lesson completion
  SELECT NOT EXISTS (
    SELECT 1 FROM public.lesson_exercises e WHERE e.lesson_id = _lesson
      AND NOT EXISTS (SELECT 1 FROM public.user_exercise_attempts a
                      WHERE a.user_id = _uid AND a.exercise_id = e.id AND a.is_correct)
  ) INTO _completed;

  IF _completed THEN
    SELECT * INTO _prog FROM public.user_lesson_progress WHERE user_id = _uid AND lesson_id = _lesson;
    IF NOT FOUND OR _prog.status <> 'completed' THEN
      INSERT INTO public.user_lesson_progress(user_id, lesson_id, status, xp_earned, completed_at)
      VALUES (_uid, _lesson, 'completed', 20, now())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET status='completed',
        xp_earned = public.user_lesson_progress.xp_earned + 20, completed_at = now();
      _total := _total + 20; _weekly := _weekly + 20;
    END IF;
  END IF;

  UPDATE public.user_stats SET
    total_xp = _total, weekly_xp = _weekly, current_streak = _streak,
    longest_streak = greatest(s.longest_streak, _streak), hearts = _hearts, hearts_refill_at = NULL,
    last_activity_date = CASE WHEN _is_correct THEN _today ELSE s.last_activity_date END,
    league = CASE WHEN _total >= 5000 THEN 'diamond' WHEN _total >= 2000 THEN 'gold' WHEN _total >= 500 THEN 'silver' ELSE 'bronze' END
  WHERE user_id = _uid;

  FOREACH _b IN ARRAY ARRAY[
    CASE WHEN _completed THEN 'first_lesson' END,
    CASE WHEN _streak >= 7 THEN 'streak_7' END,
    CASE WHEN _streak >= 30 THEN 'streak_30' END,
    CASE WHEN _total >= 100 THEN 'xp_100' END,
    CASE WHEN _total >= 1000 THEN 'xp_1000' END,
    CASE WHEN _total >= 5000 THEN 'xp_5000' END] LOOP
    IF _b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id=_uid AND badge_key=_b) THEN
      INSERT INTO public.user_achievements(user_id, badge_key) VALUES (_uid, _b);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('xp_awarded', _xp, 'lesson_completed', _completed,
    'hearts', _hearts, 'streak', _streak, 'total_xp', _total);
END $$;
REVOKE ALL ON FUNCTION public.record_graded_attempt(uuid,text,boolean,integer,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_graded_attempt(uuid,text,boolean,integer,text,text) TO authenticated;