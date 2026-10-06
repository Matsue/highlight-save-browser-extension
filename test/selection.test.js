import { describe, it, expect } from 'vitest';
import { pickSelection, CACHE_TTL_MS } from '../src/core/selection.js';

describe('pickSelection', () => {
  const now = 1_000_000;

  it('現在の選択があればそれを優先する', () => {
    expect(pickSelection({ current: ' now ', cached: 'old', cachedAt: now, now })).toBe('now');
  });

  it('現在の選択が空なら、新しいキャッシュを使う（Androidでメニューを開くと選択が外れる対策）', () => {
    expect(pickSelection({ current: '', cached: 'old', cachedAt: now - 1000, now })).toBe('old');
  });

  it('古いキャッシュは使わない', () => {
    expect(
      pickSelection({ current: '', cached: 'old', cachedAt: now - CACHE_TTL_MS - 1, now }),
    ).toBe('');
  });

  it('入力が欠けていても空文字を返す', () => {
    expect(pickSelection({ now })).toBe('');
  });
});
