import { createClient } from '@supabase/supabase-js';
import { parseBrand } from './brand';
export async function readPublicBrand() {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_')) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const { data } = await client.from('site_settings').select('value_fa').eq('key', 'brand_assets').maybeSingle();
  return parseBrand(data?.value_fa);
}