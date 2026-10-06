import { describe, it, expect, vi } from 'vitest';
import { createNotionClient, NotionError, describeError } from '../src/core/notion-client.js';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('createNotionClient', () => {
  it('認証ヘッダとバージョンヘッダ付きでページを作成する', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { id: 'p1', url: 'u' }));
    const client = createNotionClient('tok', { fetch });
    const res = await client.createPage({ a: 1 });

    expect(res).toEqual({ id: 'p1', url: 'u' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/pages');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body)).toEqual({ a: 1 });
  });

  it('DBを取得する', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { id: 'db', properties: {} }));
    const client = createNotionClient('tok', { fetch });
    await client.retrieveDatabase('db-id');
    expect(fetch.mock.calls[0][0]).toBe('https://api.notion.com/v1/databases/db-id');
    expect(fetch.mock.calls[0][1].method).toBe('GET');
  });

  it('ページをゴミ箱に移動する（archived: true）', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { id: 'p1', archived: true }));
    const client = createNotionClient('tok', { fetch });
    await client.archivePage('p1');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/pages/p1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ archived: true });
  });

  it('APIエラーは NotionError に変換する', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(404, { object: 'error', code: 'object_not_found', message: 'nope' }),
    );
    const client = createNotionClient('tok', { fetch });
    const err = await client.createPage({}).catch((e) => e);
    expect(err).toBeInstanceOf(NotionError);
    expect(err).toMatchObject({ status: 404, code: 'object_not_found', message: 'nope' });
  });
});

describe('describeError', () => {
  it.each([
    ['unauthorized', /トークン/],
    ['object_not_found', /共有|接続/],
    ['validation_error', /プロパティ/],
    ['not_configured', /設定/],
  ])('%s をユーザー向けメッセージにする', (code, pattern) => {
    expect(describeError(new NotionError(0, code, 'x'))).toMatch(pattern);
  });

  it('未知のエラーは元のメッセージを含める', () => {
    expect(describeError(new Error('boom'))).toContain('boom');
  });
});
