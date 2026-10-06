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
      id: 'self@ext',
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
    return (msg) => browser.listeners.message(msg, { id: browser.runtime.id });
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

  const PAGE = '01234567-89ab-cdef-0123-456789abcdef';
  const OTHER = 'ffffffff-89ab-cdef-0123-456789abcdef';

  it('undo: この拡張機能で保存したページをゴミ箱に移動する', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okJson({ id: PAGE, url: 'u' }));
    const send = await load(SETTINGS);
    await send({ type: 'save', payload: { text: 'x' } });
    expect(await send({ type: 'undo', pageId: PAGE })).toEqual({ ok: true });
    expect(fetch.mock.calls[1][1].method).toBe('PATCH');
  });

  it('undo: 保存していないページは取り消さない（Notion を呼ばない）', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okJson({ id: PAGE, url: 'u' }));
    const send = await load(SETTINGS);
    await send({ type: 'save', payload: { text: 'x' } });
    const res = await send({ type: 'undo', pageId: OTHER });
    expect(res.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('undo: 同じページは二度取り消さない', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okJson({ id: PAGE, url: 'u' }));
    const send = await load(SETTINGS);
    await send({ type: 'save', payload: { text: 'x' } });
    await send({ type: 'undo', pageId: PAGE });
    expect((await send({ type: 'undo', pageId: PAGE })).ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('undo の権限不足は Update content の案内を返す', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(okJson({ id: PAGE, url: 'u' }))
      .mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ code: 'restricted_resource', message: 'no' }),
      });
    const send = await load(SETTINGS);
    await send({ type: 'save', payload: { text: 'x' } });
    const res = await send({ type: 'undo', pageId: PAGE });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Update content/);
  });

  it('undo が失敗したら、権限を直した後に再試行できる', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(okJson({ id: PAGE, url: 'u' }))
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ code: 'restricted_resource' }) })
      .mockResolvedValueOnce(okJson({ id: PAGE, archived: true }));
    const send = await load(SETTINGS);
    await send({ type: 'save', payload: { text: 'x' } });
    expect((await send({ type: 'undo', pageId: PAGE })).ok).toBe(false);
    expect(await send({ type: 'undo', pageId: PAGE })).toEqual({ ok: true });
  });

  it('他の拡張機能からのメッセージは無視する', async () => {
    const send = await load(SETTINGS);
    expect(browser.listeners.message({ type: 'getButtonConfig' }, { id: 'evil@x' })).toBeUndefined();
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
