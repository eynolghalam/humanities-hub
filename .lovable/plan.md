## هدف
ساخت سیستم تمرین/پاسخ هوشمند + نوار پیشرفت + گیمیفیکیشن کامل برای کل پلتفرم.

## ساختار دیتابیس (مهاجرت)

**جداول جدید:**
- `lesson_exercises` — سوالات هر درس (lesson_id, question, expected_answer, type [short/essay/mcq], options, sort_order, source [extracted/generated])
- `user_exercise_attempts` — پاسخ‌های کاربر (user_id, exercise_id, user_answer, is_correct, ai_feedback, score, created_at)
- `user_lesson_progress` — وضعیت هر درس برای هر کاربر (user_id, lesson_id, status [locked/unlocked/completed], xp_earned, completed_at)
- `user_stats` — XP کل، استریک روزانه، تعداد قلب/جان، آخرین فعالیت (user_id, total_xp, current_streak, longest_streak, hearts, last_activity_at, league)
- `user_achievements` — نشان‌ها (user_id, badge_key, earned_at)

**RLS:** کاربر فقط رکوردهای خودش را می‌بیند/می‌نویسد؛ ادمین/استاد دسترسی کامل به سوالات.

## Server Functions جدید (`src/lib/exercises.functions.ts`)

1. **`extractOrGenerateExercises({ lessonId })`** — متن درس را می‌خواند، با Gemini سوالات موجود را استخراج می‌کند؛ اگر نبود، تولید می‌کند. در `lesson_exercises` ذخیره می‌کند.
2. **`gradeAnswer({ exerciseId, userAnswer })`** — با AI پاسخ را تحلیل می‌کند، خروجی ساختاریافته: `{ is_correct, score (0-100), feedback_fa, correct_answer }`. XP اضافه می‌کند، قلب در صورت اشتباه کم می‌کند، استریک به‌روزرسانی می‌کند.
3. **`getLessonExercises({ lessonId })`** — لیست سوالات + آخرین پاسخ کاربر.
4. **`getUserStats()`** — XP، استریک، قلب، لیگ، نشان‌ها.
5. **`getBookProgress({ bookId })`** و **`getCourseProgress({ courseId })`** — درصد پیشرفت.

## صفحات و کامپوننت‌های UI

**کاربر:**
- در صفحه `/lessons/$lessonId`: بخش جدید «پرسش و تمرین» با فرم پاسخ، دکمه «بررسی پاسخ»، نمایش feedback رنگی (سبز/قرمز) + توضیح اشتباه + پاسخ درست + XP کسب‌شده.
- در صفحه `/books/$bookId` و `/courses/$courseId`: نوار پیشرفت (Progress) با درصد و تعداد درس کامل‌شده.
- صفحه جدید `/journey` — مسیر Duolingo‌مانند: درس‌ها به ترتیب، قفل/باز/کامل، آیکون دایره‌ای پلکانی.
- هدر: نمایش XP، استریک (🔥)، قلب‌ها (❤️) به صورت همیشگی.
- صفحه جدید `/profile/stats` — آمار کامل، نشان‌ها، لیگ هفتگی.

**ادمین/استاد:**
- در `/admin/books/$bookId` و صفحه ویرایش درس: دکمه «استخراج سوالات از متن درس» (فراخوانی AI)، لیست/ویرایش/حذف سوالات.

## منطق گیمیفیکیشن

- **XP:** پاسخ درست = 10، عالی (score≥90) = 15، تکمیل کل درس = +20 بونوس.
- **قلب:** کاربر روزانه 5 قلب دارد، هر پاسخ غلط = -1، صفر شد = 1 ساعت انتظار یا تماشای آگهی/تمرین مرور.
- **استریک:** هر روز حداقل یک تمرین درست → +1، یک روز کامل بدون فعالیت → ریست.
- **لیگ:** بر اساس XP هفتگی (Bronze/Silver/Gold/Diamond)، به‌روزرسانی روزانه.
- **نشان:** اولین درس، 7 روز استریک، تکمیل اولین کتاب، 1000 XP و ...

## مدل AI

- استخراج/تولید سوالات: `google/gemini-2.5-flash` با tool calling (ساختار JSON).
- تصحیح پاسخ: `google/gemini-2.5-flash` با structured output؛ زبان feedback: فارسی.

## ترتیب پیاده‌سازی (یک پاس)

1. مهاجرت SQL (جداول + RLS + GRANT + تریگر updated_at).
2. سه فایل server function: `exercises.functions.ts`, `progress.functions.ts`, `gamification.functions.ts`.
3. کامپوننت‌های UI: `ExerciseBlock`, `ProgressBar`, `StatsBar` (هدر), `JourneyMap`.
4. به‌روزرسانی صفحات: `lessons.$lessonId`, `books.$bookId`, `courses.$courseId`, `admin.books.$bookId`, افزودن `/journey` و `/profile/stats`.
5. i18n: کلیدهای فارسی/عربی/انگلیسی.

## نکات فنی
- همه فراخوانی‌های AI سمت سرور (LOVABLE_API_KEY).
- استفاده از structured output (tool_choice) برای پایداری.
- نمایش خطا برای 402/429.
- ذخیره attempt حتی در صورت خطای AI (با وضعیت pending).

آماده‌ام شروع کنم؟