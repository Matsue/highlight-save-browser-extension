import { describe, it, expect } from 'vitest';
import { buildPageRequest } from '../src/core/page-request.js';

const DB = '01234567-89ab-cdef-0123-456789abcdef';
const rt = (s) => [{ type: 'text', text: { content: s } }];
const FULL = { title: 'Name', url: 'URL', pageTitle: 'Page', note: 'Memo' };
const MINIMAL = { title: 'Name', url: null, pageTitle: null, note: null };

describe('buildPageRequest', () => {
  const base = {
    databaseId: DB,
    pageTitle: 'Page Title',
    url: 'https://ex.com/a',
    text: 'selected',
    note: 'my note',
  };

  it('選択テキストをタイトルにし、他はマッピング先のプロパティに入れる', () => {
    expect(buildPageRequest({ ...base, mapping: FULL })).toEqual({
      parent: { database_id: DB },
      properties: {
        Name: { title: rt('selected') },
        URL: { url: 'https://ex.com/a' },
        Page: { rich_text: rt('Page Title') },
        Memo: { rich_text: rt('my note') },
      },
    });
  });

  it('マッピング先が無い値は保存しない（本文には何も書かない）', () => {
    const req = buildPageRequest({ ...base, mapping: MINIMAL });
    expect(req).toEqual({
      parent: { database_id: DB },
      properties: { Name: { title: rt('selected') } },
    });
    expect(req.children).toBeUndefined();
  });

  it('選択テキストの前後の空白を除く', () => {
    const req = buildPageRequest({ ...base, text: '  sel\n', mapping: MINIMAL });
    expect(req.properties.Name).toEqual({ title: rt('sel') });
  });

  it('選択が空ならページタイトルをタイトルにする', () => {
    const req = buildPageRequest({ ...base, text: '  ', mapping: MINIMAL });
    expect(req.properties.Name).toEqual({ title: rt('Page Title') });
  });

  it('選択もページタイトルも空ならURLをタイトルにする', () => {
    const req = buildPageRequest({ ...base, text: '', pageTitle: '', mapping: MINIMAL });
    expect(req.properties.Name).toEqual({ title: rt('https://ex.com/a') });
  });

  it('空のページタイトルやメモはプロパティに含めない', () => {
    const req = buildPageRequest({ ...base, pageTitle: ' ', note: '', mapping: FULL });
    expect(Object.keys(req.properties)).toEqual(['Name', 'URL']);
  });

  it('http(s) 以外のURL（about: 等）は保存しない', () => {
    const req = buildPageRequest({ ...base, url: 'about:reader?url=x', mapping: FULL });
    expect(req.properties.URL).toBeUndefined();
  });

  it('旧設定（text マッピングあり・pageTitle なし）でも動く', () => {
    const req = buildPageRequest({
      ...base,
      mapping: { title: 'Name', url: 'URL', text: 'Quote', note: null },
    });
    expect(req.properties).toEqual({
      Name: { title: rt('selected') },
      URL: { url: 'https://ex.com/a' },
    });
  });
});
