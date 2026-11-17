import type { ReactNode } from 'react';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
export function PublicReadingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">
    <Header />
    <main className="container mx-auto px-4 py-10 pb-28 md:pb-10">{children}</main>
    <MobileBottomNav />
  </div>;
}