/** キャッシュした選択テキストを有効とみなす時間 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 現在の選択を優先し、空ならば直近にキャッシュした選択を返す。
 * Android ではメニューを開いた瞬間に選択が解除されることがあるための対策。
 */
export function pickSelection({ current, cached, cachedAt, now }) {
  const cur = (current ?? '').trim();
  if (cur) return cur;
  if (cached && typeof cachedAt === 'number' && now - cachedAt <= CACHE_TTL_MS) {
    return cached.trim();
  }
  return '';
}
