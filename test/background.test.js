import { describe, it, expect, vi, beforeEach } from 'vitest';

const makeBrowser = (settings) => {
  const listeners = {};
  return {
    listeners,
    runtime: {
      onMessage: { addListener: (fn) => (listeners.message = fn) },
      getURL: (p) => `moz-extension://x/${p}`,
    },
    storage: { local: { get: vi.fn().mockResolvedValue({ settings }) } },
    // menus は未定義 = Android 相当
  };
};

describe('background', () => {
  beforeEach(() => vi.resetModules());

  it('save メッセージで Notion にページを作成し、結果を返す', async () => {
    globalThis.browser = makeBrowser({
      token: 't',
      databaseId: 'db',
      mapping: { title: 'Name', url: 'URL', pageTitle: null, note: null },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'p', url: 'https://notion.so/p' }),
    });
    await import('../src/background.js');

    const res = await browser.listeners.message({
      type: 'save',
      payload: { pageTitle: 'T', url: 'https://a.com', text: 'hi' },
    });
    expect(res).toEqual({ ok: true, page: { id: 'p', url: 'https://notion.so/p' } });
  });

  it('未設定ならユーザー向けエラーを返す', async () => {
    globalThis.browser = makeBrowser(undefined);
    await import('../src/background.js');
    const res = await browser.listeners.message({ type: 'save', payload: {} });
    expect(res).toMatchObject({ ok: false, code: 'not_configured' });
    expect(res.error).toMatch(/設定/);
  });
});
