import { queryOptions } from '@tanstack/react-query';
import { readPublicContent } from './public-reading.functions';
export const readingOptions = (kind: 'courses' | 'course' | 'book' | 'lesson', id?: string) => queryOptions({
  queryKey: ['public-reading', kind, id],
  queryFn: () => readPublicContent({ data: { kind, id } }),
  staleTime: 60_000,
});