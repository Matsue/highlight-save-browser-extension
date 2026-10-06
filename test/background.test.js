import { describe, it, expect, vi, beforeEach } from 'vitest';

const SETTINGS = {
  token: 't',
  databaseId: 'db',
  mapping: { title: 'Name', url: 'URL', pageTitle: null, note: null },
};

const makeBrowser = (settings, os = 'android') => {
  const listeners = {};
  return {
    listeners,
    runtime: {
      onMessage: { addListener: (fn) => (listeners.message = fn) },
      getURL: (p) => `moz-extension://x/${p}`,
      getPlatformInfo: vi.fn().mockResolvedValue({ os }),
    },
    storage: { local: { get: vi.fn().mockResolvedValue({ settings }) } },
    // menus は未定義 = Android 相当
  };
};

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

describe('background', () => {
  beforeEach(() => vi.resetModules());

  const load = async (settings, os) => {
    globalThis.browser = makeBrowser(settings, os);
    await import('../src/background.js');
    return (msg) => browser.listeners.message(msg);
  };

  it('save メッセージで Notion にページを作成し、結果を返す', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okJson({ id: 'p', url: 'https://notion.so/p' }));
    const send = await load(SETTINGS);
    const res = await send({
      type: 'save',
      payload: { pageTitle: 'T', url: 'https://a.com', text: 'hi' },
    });
    expect(res).toEqual({ ok: true, page: { id: 'p', url: 'https://notion.so/p' } });
  });

  it('未設定ならユーザー向けエラーを返す', async () => {
    const send = await load(undefined);
    const res = await send({ type: 'save', payload: {} });
    expect(res).toMatchObject({ ok: false, code: 'not_configured' });
    expect(res.error).toMatch(/設定/);
  });

  it('undo メッセージでページをゴミ箱に移動する', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okJson({ id: 'p', archived: true }));
    const send = await load(SETTINGS);
    expect(await send({ type: 'undo', pageId: 'p' })).toEqual({ ok: true });
    expect(fetch.mock.calls[0][1].method).toBe('PATCH');
  });

  it('undo の権限不足は Update content の案内を返す', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'restricted_resource', message: 'no' }),
    });
    const send = await load(SETTINGS);
    const res = await send({ type: 'undo', pageId: 'p' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Update content/);
  });

  it('getButtonConfig は設定とOSから表示可否だけを返す（トークンは渡さない）', async () => {
    const send = await load({ ...SETTINGS, floatingButton: 'android' }, 'mac');
    expect(await send({ type: 'getButtonConfig' })).toEqual({ enabled: false });
  });

  it('getButtonConfig: 既定は常に表示', async () => {
    const send = await load(SETTINGS, 'mac');
    expect(await send({ type: 'getButtonConfig' })).toEqual({ enabled: true });
  });
});
