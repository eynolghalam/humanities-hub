import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { brandQuery } from '@/lib/brand';
export function SiteLogo({ className = 'h-9 w-9' }: { className?: string }) {
  const { data } = useQuery(brandQuery);
  return data?.logo ? <img src={data.logo} alt="لوگوی حوزتنا" className={`${className} shrink-0 object-contain`} /> : <span className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-hero text-primary-foreground`}><BookOpen className="h-5 w-5" /></span>;
}