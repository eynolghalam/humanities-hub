import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/app-manifest')({ server: { handlers: { GET: async () => {
  const { readPublicBrand } = await import('@/lib/brand-head.server');
  const brand = await readPublicBrand();
  return Response.json({ id: '/', name: 'حوزتنا', short_name: 'حوزتنا', lang: 'fa', dir: 'rtl', start_url: '/', scope: '/', display: 'standalone', icons: brand ? [{ src: brand.app, sizes: '512x512', type: 'image/png', purpose: 'any' }] : [{ src: '/icons/hozatona-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/hozatona-512.png', sizes: '512x512', type: 'image/png' }] }, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/manifest+json' } });
} } } });