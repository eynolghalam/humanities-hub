import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteLogo } from '@/components/SiteLogo';
import { brandQuery, type BrandAssets } from '@/lib/brand';
import { optimizeImage, makeBrandIcon } from '@/lib/image-optimization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export function BrandEditor() {
  const qc = useQueryClient(); const { data: current } = useQuery(brandQuery);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true); const paths: string[] = [];
    try {
      const logo = await optimizeImage(file, 'logo');
      const variants = { logo, icon: await makeBrandIcon(logo, 64), apple: await makeBrandIcon(logo, 180), app: await makeBrandIcon(logo, 512) };
      const result: Partial<BrandAssets> = {};
      for (const [key, blob] of Object.entries(variants)) {
        const path = `brand/${crypto.randomUUID()}-${key}.${key === 'logo' ? 'webp' : 'png'}`;
        const { error } = await supabase.storage.from('homepage-images').upload(path, blob, { contentType: blob.type });
        if (error) throw error;
        paths.push(path);
        Object.assign(result, { [key]: supabase.storage.from('homepage-images').getPublicUrl(path).data.publicUrl });
      }
      const value = JSON.stringify({ ...result, paths });
      const { error } = await supabase.from('site_settings').upsert({ key: 'brand_assets', value_fa: value, value_en: value, value_ar: value }, { onConflict: 'key' });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['brand-assets'] });
      if (current?.paths?.length) await supabase.storage.from('homepage-images').remove(current.paths);
      toast.success('لوگو و آیکن‌های سایت به‌روزرسانی شدند');
    } catch (e) { if (paths.length) await supabase.storage.from('homepage-images').remove(paths); toast.error(e instanceof Error ? e.message : 'ذخیره لوگو انجام نشد'); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 border-b border-border pb-8"><h2 className="mb-4 text-lg font-bold">لوگوی سراسری سایت</h2><div className="flex flex-wrap items-center gap-4"><SiteLogo className="h-20 w-20" /><div className="space-y-2"><Label htmlFor="site-logo-upload">تصویر لوگو</Label><Input id="site-logo-upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }} />{busy && <Button disabled variant="ghost"><Loader2 className="animate-spin" /><Upload />در حال ذخیره…</Button>}</div></div></section>;
}