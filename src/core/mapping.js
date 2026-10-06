const PAGE_TITLE_NAME = /page ?title|source|article|ページタイトル|ページ名|記事|出典|元ページ/i;
const NOTE_NAME = /note|memo|comment|メモ|コメント|備考/i;

/**
 * @typedef {{ title: string, url: string|null, pageTitle: string|null, note: string|null }} Mapping
 * title には選択テキストが入る。null のプロパティは保存しない。
 */

/** @returns {string[]} */
export function listPropertyOptions(properties, type) {
  return Object.entries(properties)
    .filter(([, p]) => p.type === type)
    .map(([name]) => name);
}

/**
 * DB スキーマから保存先プロパティを推測する。
 * @returns {Mapping}
 */
export function detectMapping(properties) {
  const [title] = listPropertyOptions(properties, 'title');
  if (!title) throw new Error('DBに title プロパティが見つかりません');

  const richTexts = listPropertyOptions(properties, 'rich_text');
  const note = richTexts.find((n) => NOTE_NAME.test(n)) ?? null;
  const pageTitle = richTexts.find((n) => n !== note && PAGE_TITLE_NAME.test(n)) ?? null;

  return {
    title,
    url: listPropertyOptions(properties, 'url')[0] ?? null,
    pageTitle,
    note,
  };
}
