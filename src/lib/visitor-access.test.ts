import { describe, expect, it } from 'vitest';
import { needsSignIn } from './visitor-access';
describe('visitor access', () => {
  it('allows guests to read book text and translations', () => {
    expect(needsSignIn('reading', false)).toBe(false);
  });
  it('requires sign-in for guest AI actions', () => {
    expect(needsSignIn('ai', false)).toBe(true);
    expect(needsSignIn('ai', true)).toBe(false);
  });
  it('requires sign-in for guest teacher communication', () => {
    expect(needsSignIn('teacher', false)).toBe(true);
    expect(needsSignIn('teacher', true)).toBe(false);
  });
});