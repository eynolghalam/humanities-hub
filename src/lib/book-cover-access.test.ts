import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const migration = readFileSync(resolve('drizzle/migrations/0005_owner_only_cover_management.sql'), 'utf8');
test('cover mutation is guarded in database independently of book editing', () => {
  expect(migration).toContain("NOT public.has_role(auth.uid(),'owner')");
  expect(migration).toContain('NEW.cover_path IS DISTINCT FROM OLD.cover_path');
  expect(migration).toContain('BEFORE INSERT OR UPDATE ON public.books');
  expect(migration).toContain('DROP POLICY "Assigned educators upload book covers"');
});
