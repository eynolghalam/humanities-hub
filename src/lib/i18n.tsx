import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "fa" | "en";

const dict = {
  fa: {
    appName: "حکمت",
    tagline: "پلتفرم آموزشی علوم انسانی",
    heroTitle: "آموزشی نوین برای اندیشه‌ای ژرف",
    heroSub: "دوره‌های منسجم، درس‌های چندرسانه‌ای، و یادگیری بدون مرز در حوزهٔ علوم انسانی.",
    start: "شروع یادگیری",
    login: "ورود",
    signup: "ثبت‌نام",
    logout: "خروج",
    email: "ایمیل",
    password: "رمز عبور",
    fullName: "نام و نام خانوادگی",
    courses: "دوره‌ها",
    admin: "پنل مدیریت",
    dashboard: "داشبورد",
    student: "دانشجو",
    adminRole: "ادمین",
    noCourses: "هنوز دوره‌ای ثبت نشده است.",
    noLessons: "هنوز درسی برای این دوره ثبت نشده است.",
    lessonsCount: "تعداد دروس",
    lessons: "دروس",
    lesson: "درس",
    description: "توضیح درس",
    video: "ویدیو",
    audio: "فایل صوتی",
    slides: "اسلاید",
    downloadSlide: "دانلود اسلاید",
    backToCourse: "بازگشت به دوره",
    backToCourses: "بازگشت به دوره‌ها",
    addCourse: "افزودن دوره",
    addLesson: "افزودن درس",
    editCourse: "ویرایش دوره",
    editLesson: "ویرایش درس",
    deleteCourse: "حذف دوره",
    deleteLesson: "حذف درس",
    title: "عنوان",
    courseDesc: "توضیح دوره",
    sortOrder: "ترتیب",
    videoEmbed: "کد جاسازی ویدیو (یوتیوب / آپارات)",
    audioFile: "فایل صوتی",
    slideFile: "فایل اسلاید (PDF یا تصویر)",
    content: "متن درس (HTML پشتیبانی می‌شود)",
    save: "ذخیره",
    cancel: "انصراف",
    manageLessons: "مدیریت دروس",
    books: "کتاب‌ها",
    book: "کتاب",
    addBook: "افزودن کتاب",
    editBook: "ویرایش کتاب",
    deleteBook: "حذف کتاب",
    manageBooks: "مدیریت کتاب‌ها",
    bookDesc: "توضیح کتاب",
    noBooks: "هنوز کتابی برای این دوره ثبت نشده است.",
    backToBook: "بازگشت به کتاب",
    backToCourse2: "بازگشت به دوره",
    confirmDelete: "آیا از حذف اطمینان دارید؟",
    welcome: "خوش آمدید",
    loading: "در حال بارگذاری…",
    notAdmin: "دسترسی فقط برای ادمین‌ها.",
    signupSuccess: "حساب با موفقیت ساخته شد. اکنون وارد شوید.",
    confirmEmailMsg: "لطفاً ایمیل خود را برای تأیید بررسی کنید.",
    uploading: "در حال آپلود…",
    noFile: "بدون فایل",
    courseList: "فهرست دوره‌ها",
    feature1Title: "محتوای ساخت‌یافته",
    feature1: "دوره‌ها بر اساس پایه و سطح طبقه‌بندی شده‌اند.",
    feature2Title: "چندرسانه‌ای",
    feature2: "متن، ویدیو، صوت و اسلاید در یک صفحه.",
    feature3Title: "دسترسی آسان",
    feature3: "سازگار با موبایل، تجربه‌ای روان در هر دستگاه.",
  },
  en: {
    appName: "Hikmat",
    tagline: "Humanities Learning Platform",
    heroTitle: "Modern Learning for Deeper Thinking",
    heroSub: "Coherent courses, multimedia lessons, and limitless learning in the humanities.",
    start: "Start Learning",
    login: "Sign In",
    signup: "Sign Up",
    logout: "Sign Out",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    courses: "Courses",
    admin: "Admin Panel",
    dashboard: "Dashboard",
    student: "Student",
    adminRole: "Admin",
    noCourses: "No courses yet.",
    noLessons: "No lessons in this course yet.",
    lessonsCount: "Lessons",
    lessons: "Lessons",
    lesson: "Lesson",
    description: "Description",
    video: "Video",
    audio: "Audio",
    slides: "Slides",
    downloadSlide: "Download Slide",
    backToCourse: "Back to Course",
    backToCourses: "Back to Courses",
    addCourse: "Add Course",
    addLesson: "Add Lesson",
    editCourse: "Edit Course",
    editLesson: "Edit Lesson",
    deleteCourse: "Delete Course",
    deleteLesson: "Delete Lesson",
    title: "Title",
    courseDesc: "Course Description",
    sortOrder: "Order",
    videoEmbed: "Video Embed Code (YouTube / Aparat)",
    audioFile: "Audio file",
    slideFile: "Slide file (PDF or Image)",
    content: "Lesson content (HTML supported)",
    save: "Save",
    cancel: "Cancel",
    manageLessons: "Manage Lessons",
    confirmDelete: "Are you sure to delete?",
    welcome: "Welcome",
    loading: "Loading…",
    notAdmin: "Admins only.",
    signupSuccess: "Account created. Sign in now.",
    confirmEmailMsg: "Please check your email to confirm.",
    uploading: "Uploading…",
    noFile: "No file",
    courseList: "All Courses",
    feature1Title: "Structured Content",
    feature1: "Courses organized by grade and level.",
    feature2Title: "Multimedia",
    feature2: "Text, video, audio, and slides in one place.",
    feature3Title: "Easy Access",
    feature3: "Mobile-friendly, smooth on every device.",
  },
} as const;

type Dict = typeof dict.fa;
type Key = keyof Dict;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fa");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "fa";
    setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const dir: "rtl" | "ltr" = lang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = (k: Key) => dict[lang][k];

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
