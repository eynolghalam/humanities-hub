import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/brand-icon')({ server: { handlers: { GET: async ({ request }) => {
  const { readPublicBrand } = await import('@/lib/brand-head.server');
  const brand = await readPublicBrand();
  const type = new URL(request.url).searchParams.get('type');
  const url = type === 'apple' ? brand?.apple : brand?.icon;
  return new Response(null, { status: 302, headers: { Location: url || '/icons/hozatona-192.png', 'Cache-Control': 'no-store' } });
} } } });