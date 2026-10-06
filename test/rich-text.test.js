import { describe, it, expect } from 'vitest';
import { toRichText, MAX_TEXT_LENGTH } from '../src/core/rich-text.js';

const contents = (rt) => rt.map((r) => r.text.content);

describe('toRichText', () => {
  it('短いテキストは1要素になる', () => {
    expect(toRichText('hello')).toEqual([{ type: 'text', text: { content: 'hello' } }]);
  });

  it('空文字は空配列になる', () => {
    expect(toRichText('')).toEqual([]);
    expect(toRichText(undefined)).toEqual([]);
  });

  it('2000文字を超えると分割される', () => {
    const text = 'a'.repeat(MAX_TEXT_LENGTH * 2 + 5);
    const rt = toRichText(text);
    expect(contents(rt).map((c) => c.length)).toEqual([2000, 2000, 5]);
    expect(contents(rt).join('')).toBe(text);
  });

  it('サロゲートペア（絵文字）を途中で切らない', () => {
    const text = 'a'.repeat(MAX_TEXT_LENGTH - 1) + '😀b';
    const rt = toRichText(text);
    expect(contents(rt)).toEqual(['a'.repeat(MAX_TEXT_LENGTH - 1), '😀b']);
  });

  it('Notionの上限である100要素で打ち切る', () => {
    const rt = toRichText('a'.repeat(MAX_TEXT_LENGTH * 101));
    expect(rt).toHaveLength(100);
  });
});
