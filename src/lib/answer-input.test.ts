import { describe, test, expect } from 'vitest';
import { answerInput, sourcesText } from './answer-input';
import { fitImage, IMAGE_PRESETS } from './image-optimization';
describe('requested image and source rules', () => {
  test('covers fit their template without stretching or upscaling', () => {
    expect(fitImage(2000, 3000, IMAGE_PRESETS.cover.width, IMAGE_PRESETS.cover.height)).toEqual({ width: 256, height: 384 });
    expect(fitImage(100, 150, 256, 384)).toEqual({ width: 100, height: 150 });
  });
  test('one or several books are mandatory', () => {
    expect(answerInput.safeParse({ bookIds: [], question: 'سوال' }).success).toBe(false);
    expect(answerInput.safeParse({ bookIds: ['81df4be0-0beb-4653-b150-16d89d0ff84c'], question: 'سوال' }).success).toBe(true);
  });
  test('unselected books never enter the answering source', () => {
    const result = sourcesText([{ id: 'selected', title: 'منطق' }], [
      { book_id: 'other', title: 'درس دیگر', original_text: 'متن ممنوع', content: null, translation: null, explanation: null },
      { book_id: 'selected', title: 'درس اول', original_text: 'متن مجاز', content: null, translation: null, explanation: null },
    ]);
    expect(result).toContain('متن مجاز'); expect(result).not.toContain('متن ممنوع');
  });
});