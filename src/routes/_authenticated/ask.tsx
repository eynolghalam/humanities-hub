import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { BookOpen, Sparkles, Send, Paperclip, X, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { optimizeImage } from '@/lib/image-optimization';
export const Route = createFileRoute('/_authenticated/ask')({ head: () => ({ meta: [
  { title: 'پاسخ‌یار با منابع کتاب | حوزتنا' }, { name: 'description', content: 'پاسخ به سوالات متنی، تصویر و PDF بر اساس کتاب‌های انتخابی در حوزتنا.' },
  { property: 'og:title', content: 'پاسخ‌یار با منابع کتاب | حوزتنا' }, { property: 'og:description', content: 'پاسخ‌گویی هوشمند با منابع منتخب حوزوی.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
] }), component: AskPage });
function AskPage() {
  const { data: books, isPending } = useQuery({ queryKey: ['answer-books'], queryFn: async () => { const { data, error } = await supabase.from('books').select('id,title,courses(title)').order('title'); if (error) throw error; return data || []; } });
  const [selected, setSelected] = useState<string[]>([]); const [search, setSearch] = useState('');
  const [question, setQuestion] = useState(''); const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false); const [preparing, setPreparing] = useState(false); const [answer, setAnswer] = useState(''); const [reasoning, setReasoning] = useState(''); const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null); const upload = useRef<HTMLInputElement>(null);
  async function attach(list: FileList | null) {
    if (!list) return; setPreparing(true); setError('');
    try {
      const next: File[] = [];
      for (const file of Array.from(list)) next.push(file.type.startsWith('image/') ? await optimizeImage(file, 'question') : file);
      const all = [...files, ...next];
      if (all.length > 5 || all.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) throw new Error('حداکثر ۵ فایل با حجم مجموع ۲۰ مگابایت انتخاب کنید.');
      if (all.some(f => !f.size || !['image/webp', 'image/png', 'image/jpeg', 'application/pdf'].includes(f.type))) throw new Error('فقط تصویر یا PDF معتبر انتخاب کنید.');
      setFiles(all);
    } catch (e) { setError(e instanceof Error ? e.message : 'افزودن فایل انجام نشد'); } finally { setPreparing(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setAnswer(''); setReasoning('');
    const controller = new AbortController(); abort.current = controller;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('ابتدا وارد حساب شوید.');
      const form = new FormData(); form.set('bookIds', JSON.stringify(selected)); form.set('question', question); files.forEach(f => form.append('files', f));
      const res = await fetch('/api/answer', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` }, body: form, signal: controller.signal });
      if (!res.ok) { const payload = await res.json(); throw new Error(payload.message || 'دریافت پاسخ انجام نشد'); }
      const reader = res.body?.getReader(); if (!reader) throw new Error('پاسخ خالی است.');
      const decoder = new TextDecoder(); let pending = '';
      while (true) {
        const chunk = await reader.read(); pending += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = pending.split('\n'); pending = lines.pop() || '';
        for (const line of lines) { if (!line) continue; const event = JSON.parse(line); if (event.type === 'text') setAnswer(value => value + event.text); if (event.type === 'reasoning') setReasoning(value => value + event.text); if (event.type === 'error') setError(event.message); }
        if (chunk.done) break;
      }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'ارتباط قطع شد'); }
    finally { setBusy(false); abort.current = null; }
  }
  return <div className="mx-auto max-w-6xl"><div className="mb-8 flex items-center gap-3"><Sparkles className="h-8 w-8 text-primary" /><h1 className="text-3xl font-extrabold">پاسخ‌یار</h1></div><div className="grid gap-8 lg:grid-cols-[300px_1fr]">
    <aside className="min-w-0"><h2 className="mb-4 flex items-center gap-2 font-bold"><BookOpen className="h-5 w-5" />منابع پاسخ <span className="text-sm text-muted-foreground">({selected.length})</span></h2><Input aria-label="جستجوی کتاب" placeholder="جستجوی کتاب…" value={search} onChange={e => setSearch(e.target.value)} /><div className="mt-4 max-h-80 space-y-1 overflow-y-auto lg:max-h-[560px]">{isPending && <Loader2 className="animate-spin" />}{books?.filter(b => b.title.includes(search)).map(b => <Label key={b.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-3 hover:bg-muted"><Checkbox checked={selected.includes(b.id)} disabled={busy || (!selected.includes(b.id) && selected.length >= 10)} onCheckedChange={checked => setSelected(ids => checked ? [...ids, b.id] : ids.filter(id => id !== b.id))} aria-label={b.title} /><span className="min-w-0 text-sm leading-6">{b.title}<small className="block text-muted-foreground">{b.courses?.title}</small></span></Label>)}</div></aside>
    <section className="min-w-0"><form onSubmit={submit} className="space-y-4"><Label htmlFor="answer-question">سوال یا متن برگه</Label><Textarea id="answer-question" value={question} onChange={e => setQuestion(e.target.value)} rows={7} maxLength={20000} disabled={busy} placeholder="سوال خود را بنویسید…" /><input ref={upload} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e => { void attach(e.target.files); e.target.value = ''; }} /><div className="space-y-2">{files.map((file, i) => <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"><span className="min-w-0 break-all">{file.name} <small className="text-muted-foreground">{Math.round(file.size / 1024)} KB</small></span><Button type="button" size="icon" variant="ghost" aria-label={`حذف ${file.name}`} disabled={busy} onClick={() => setFiles(items => items.filter((_, index) => index !== i))}><X /></Button></div>)}</div><div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" disabled={busy || preparing} onClick={() => upload.current?.click()}><Paperclip />{preparing ? 'آماده‌سازی…' : 'تصویر یا PDF'}</Button>{busy ? <Button type="button" variant="outline" onClick={() => abort.current?.abort()}><Square />توقف</Button> : <Button type="submit" disabled={preparing || !selected.length || (!question.trim() && !files.length)}><Send />دریافت پاسخ</Button>}</div></form>{error && <p role="alert" className="mt-6 break-words rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm leading-7 text-destructive">{error}</p>}{busy && <p role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />در حال بررسی منابع…</p>}{reasoning && <details className="mt-6 text-sm text-muted-foreground"><summary className="cursor-pointer">بررسی منابع</summary><p className="mt-3 whitespace-pre-wrap leading-7">{reasoning}</p></details>}{answer && <article className="mt-8 border-t border-border pt-6"><h2 className="mb-4 text-lg font-bold">پاسخ</h2><div className="whitespace-pre-wrap break-words leading-8">{answer}</div></article>}</section>
  </div></div>;
}