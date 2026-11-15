import { z } from 'zod';
export const answerInput = z.object({
  bookIds: z.array(z.string().uuid()).min(1).max(10),
  question: z.string().max(20000).default(''),
}).refine(data => new Set(data.bookIds).size === data.bookIds.length, 'کتاب تکراری انتخاب شده است.');
export function sourcesText(books: { id: string; title: string }[], lessons: { book_id: string; title: string; original_text: string | null; content: string | null; translation: string | null; explanation: string | null }[]) {
  return books.map(book => `کتاب: ${book.title}\n` + lessons.filter(l => l.book_id === book.id).map(l => `درس: ${l.title}\n${[l.original_text, l.content, l.translation, l.explanation].filter(Boolean).join('\n')}`).join('\n\n')).join('\n\n');
}