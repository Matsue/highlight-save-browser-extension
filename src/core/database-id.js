const HEX32 = /([0-9a-f]{32})$/i;

const toDashed = (hex) =>
  [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join('-')
    .toLowerCase();

/**
 * Notion のDB URL / 32桁ID / UUID を受け取り、ハイフン付き UUID を返す。
 * @param {string|null|undefined} input
 * @returns {string|null}
 */
export function parseDatabaseId(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const { pathname } = new URL(trimmed);
      candidate = pathname.split('/').filter(Boolean).pop() ?? '';
    } catch {
      return null;
    }
  }

  const match = candidate.replaceAll('-', '').match(HEX32);
  return match ? toDashed(match[1]) : null;
}
