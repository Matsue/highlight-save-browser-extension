import { toRichText } from './rich-text.js';

const isWebUrl = (url) => /^https?:\/\//i.test(url ?? '');

/**
 * 保存内容と Mapping から Notion の「ページ作成」リクエストボディを組み立てる。
 * 選択テキストをページタイトルにし、ページ本文には何も書かない。
 * マッピング先のプロパティが無い値は保存しない。
 * @param {{ databaseId: string, mapping: import('./mapping.js').Mapping,
 *           text?: string, pageTitle?: string, url?: string, note?: string }} input
 */
export function buildPageRequest({ databaseId, mapping, text, pageTitle, url, note }) {
  const pageUrl = isWebUrl(url) ? url : '';
  const selected = (text ?? '').trim();
  const sourceTitle = (pageTitle ?? '').trim();
  const memo = (note ?? '').trim();

  const properties = {
    [mapping.title]: { title: toRichText(selected || sourceTitle || pageUrl || 'Untitled') },
  };
  if (mapping.url && pageUrl) properties[mapping.url] = { url: pageUrl };
  if (mapping.pageTitle && sourceTitle) properties[mapping.pageTitle] = { rich_text: toRichText(sourceTitle) };
  if (mapping.note && memo) properties[mapping.note] = { rich_text: toRichText(memo) };

  return { parent: { database_id: databaseId }, properties };
}
