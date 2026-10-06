import { describe, it, expect } from 'vitest';
import { parseDatabaseId } from '../src/core/database-id.js';

const ID = '0123456789abcdef0123456789abcdef';
const DASHED = '01234567-89ab-cdef-0123-456789abcdef';

describe('parseDatabaseId', () => {
  it('32桁の16進IDをハイフン付きUUIDに正規化する', () => {
    expect(parseDatabaseId(ID)).toBe(DASHED);
  });

  it('ハイフン付きUUIDはそのまま受け付ける', () => {
    expect(parseDatabaseId(DASHED.toUpperCase())).toBe(DASHED);
  });

  it('NotionのDB URLからIDを取り出す（?v= のビューIDは無視）', () => {
    const url = `https://www.notion.so/myspace/Reading-${ID}?v=ffffffffffffffffffffffffffffffff`;
    expect(parseDatabaseId(url)).toBe(DASHED);
  });

  it('タイトルなしのURLにも対応する', () => {
    expect(parseDatabaseId(`https://notion.so/${ID}`)).toBe(DASHED);
  });

  it('前後の空白を無視する', () => {
    expect(parseDatabaseId(`  ${ID}\n`)).toBe(DASHED);
  });

  it.each(['', 'abc', 'https://example.com/foo', null, undefined])(
    '不正な入力 %s は null を返す',
    (input) => {
      expect(parseDatabaseId(input)).toBeNull();
    },
  );
});
