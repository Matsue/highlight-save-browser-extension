const API_BASE = 'https://api.notion.com/v1';
// 2025-09-03 以降は data source 単位の API になるが、単一ソースの DB は旧バージョンで扱える
export const NOTION_VERSION = '2022-06-28';

export class NotionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'NotionError';
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {string} token Notion インテグレーションのシークレット
 * @param {{ fetch?: typeof fetch }} [options]
 */
export function createNotionClient(token, { fetch: fetchImpl = globalThis.fetch } = {}) {
  async function request(method, path, body) {
    const res = await fetchImpl(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new NotionError(res.status, json.code ?? 'http_error', json.message ?? `HTTP ${res.status}`);
    }
    return json;
  }

  return {
    retrieveDatabase: (id) => request('GET', `/databases/${id}`),
    createPage: (body) => request('POST', '/pages', body),
    archivePage: (id) => request('PATCH', `/pages/${id}`, { archived: true }),
  };
}

const MESSAGES = {
  unauthorized: 'トークンが無効です。設定画面でインテグレーションのシークレットを確認してください。',
  restricted_resource: 'このDBへのアクセス権がありません。DBの「接続」にインテグレーションを追加してください。',
  object_not_found:
    'DBが見つかりません。IDが正しいか、DBの「…」→「接続」でインテグレーションを共有しているか確認してください。',
  validation_error: 'DBのプロパティ構成と合いません。設定画面で「DBを読み込む」をやり直してください。',
  rate_limited: 'リクエストが多すぎます。少し待ってから再度お試しください。',
  not_configured: '未設定です。設定画面でトークンとDBを登録してください。',
};

/** エラーをユーザー向けの日本語メッセージにする */
export function describeError(err) {
  const known = err && MESSAGES[err.code];
  if (known) return err.code === 'validation_error' ? `${known}\n(${err.message})` : known;
  return `保存に失敗しました: ${err?.message ?? err}`;
}
