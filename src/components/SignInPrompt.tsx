import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { needsSignIn, type VisitorFeature } from '@/lib/visitor-access';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

const PromptContext = createContext<((action: () => void, feature?: VisitorFeature) => void) | null>(null);

export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const request = (action: () => void, feature: VisitorFeature = 'ai') => {
    if (needsSignIn(feature, Boolean(user))) setOpen(true);
    else action();
  };
  return <PromptContext.Provider value={request}>
    {children}
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent dir="rtl" className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>ورود یا ایجاد حساب کاربری</AlertDialogTitle>
          <AlertDialogDescription>برای استفاده از هوش مصنوعی، ثبت پیشرفت یا ارتباط با استاد، وارد حساب خود شوید یا حساب جدیدی بسازید. آیا مایلید ادامه دهید؟</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>فعلاً نه</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate({ to: '/auth' })}>ورود / ثبت نام</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </PromptContext.Provider>;
}

export function useSignInPrompt() {
  const prompt = useContext(PromptContext);
  if (!prompt) throw new Error('SignInPromptProvider is required');
  return prompt;
}