import { describe, it, expect } from 'vitest';
import { detectMapping, listPropertyOptions } from '../src/core/mapping.js';

const props = {
  名前: { type: 'title' },
  Link: { type: 'url' },
  Tags: { type: 'multi_select' },
  Description: { type: 'rich_text' },
  ページタイトル: { type: 'rich_text' },
  メモ: { type: 'rich_text' },
};

describe('detectMapping', () => {
  it('title / url / ページタイトル / メモ プロパティを推測する', () => {
    expect(detectMapping(props)).toEqual({
      title: '名前',
      url: 'Link',
      pageTitle: 'ページタイトル',
      note: 'メモ',
    });
  });

  it('該当するプロパティが無ければ null（=保存しない）', () => {
    expect(detectMapping({ Title: { type: 'title' } })).toEqual({
      title: 'Title',
      url: null,
      pageTitle: null,
      note: null,
    });
  });

  it('英語名の Page Title / Source / Note も認識する', () => {
    const m = detectMapping({
      Name: { type: 'title' },
      'Page Title': { type: 'rich_text' },
      Note: { type: 'rich_text' },
    });
    expect(m.pageTitle).toBe('Page Title');
    expect(m.note).toBe('Note');
    expect(
      detectMapping({ Name: { type: 'title' }, Source: { type: 'rich_text' } }).pageTitle,
    ).toBe('Source');
  });

  it('名前が一致しない rich_text は自動割り当てしない', () => {
    const m = detectMapping({ Name: { type: 'title' }, Description: { type: 'rich_text' } });
    expect(m.pageTitle).toBeNull();
    expect(m.note).toBeNull();
  });

  it('title プロパティが無いスキーマはエラー', () => {
    expect(() => detectMapping({ Link: { type: 'url' } })).toThrow();
  });
});

describe('listPropertyOptions', () => {
  it('指定した型のプロパティ名だけを返す', () => {
    expect(listPropertyOptions(props, 'rich_text')).toEqual(['Description', 'ページタイトル', 'メモ']);
    expect(listPropertyOptions(props, 'url')).toEqual(['Link']);
  });
});
