import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export type BrandAssets = { logo: string; icon: string; apple: string; app: string; paths: string[] };
export function parseBrand(value?: string | null): BrandAssets | null {
  try {
    const data = JSON.parse(value || 'null');
    if (!data || !['logo', 'icon', 'apple', 'app'].every(key => typeof data[key] === 'string' && data[key].startsWith('https://'))) return null;
    return data;
  } catch { return null; }
}
export const brandQuery = queryOptions({
  queryKey: ['brand-assets'], staleTime: 60_000, refetchInterval: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('site_settings').select('value_fa').eq('key', 'brand_assets').maybeSingle();
    if (error) throw error;
    return parseBrand(data?.value_fa);
  },
});