export const IMAGE_PRESETS = {
  cover: { width: 256, height: 384, bytes: 200 * 1024 },
  logo: { width: 512, height: 512, bytes: 300 * 1024 },
  hero: { width: 1536, height: 900, bytes: 600 * 1024 },
  block: { width: 900, height: 600, bytes: 350 * 1024 },
  question: { width: 1800, height: 2400, bytes: 1024 * 1024 },
} as const;

export function fitImage(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export async function optimizeImage(file: Blob, preset: keyof typeof IMAGE_PRESETS): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('تصویر JPG، PNG یا WebP انتخاب کنید.');
  if (file.size > 30 * 1024 * 1024) throw new Error('حجم تصویر بیش از ۳۰ مگابایت است.');
  const bitmap = await createImageBitmap(file);
  try {
    const config = IMAGE_PRESETS[preset];
    const size = fitImage(bitmap.width, bitmap.height, config.width, config.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('پردازش تصویر در این مرورگر امکان‌پذیر نیست.');
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    for (const quality of [0.84, 0.74, 0.64, 0.5]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= config.bytes) return new File([blob], `${preset}.webp`, { type: blob.type });
    }
    throw new Error('تصویر پس از فشرده‌سازی هنوز بزرگ است؛ تصویر ساده‌تری انتخاب کنید.');
  } finally { bitmap.close(); }
}

export async function makeBrandIcon(file: Blob, size: number) {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('پردازش لوگو امکان‌پذیر نیست.');
    const fit = fitImage(bitmap.width, bitmap.height, size * 0.8, size * 0.8);
    ctx.drawImage(bitmap, (size - fit.width) / 2, (size - fit.height) / 2, fit.width, fit.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('ساخت آیکن انجام نشد.');
    return blob;
  } finally { bitmap.close(); }
}