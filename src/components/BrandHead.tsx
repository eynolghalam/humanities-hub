import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandQuery } from '@/lib/brand';
export function BrandHead() {
  const { data } = useQuery(brandQuery);
  useEffect(() => {
    if (!data) return;
    for (const [rel, url] of [['icon', data.icon], ['apple-touch-icon', data.apple]]) {
      document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`).forEach(link => { link.href = url; });
    }
  }, [data]);
  return null;
}