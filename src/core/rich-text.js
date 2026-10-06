export const MAX_TEXT_LENGTH = 2000;
const MAX_RICH_TEXT_ITEMS = 100;

/**
 * 文字列を Notion の rich_text 配列に変換する。
 * 1要素2000文字・100要素という API 上限に合わせ、サロゲートペアを壊さずに分割する。
 * @param {string|undefined} text
 */
export function toRichText(text) {
  if (!text) return [];
  const chunks = [];
  let current = '';
  for (const ch of text) {
    if (current.length + ch.length > MAX_TEXT_LENGTH) {
      chunks.push(current);
      if (chunks.length === MAX_RICH_TEXT_ITEMS) break;
      current = '';
    }
    current += ch;
  }
  if (current && chunks.length < MAX_RICH_TEXT_ITEMS) chunks.push(current);
  return chunks.map((content) => ({ type: 'text', text: { content } }));
}
