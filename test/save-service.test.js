import { describe, it, expect, vi } from 'vitest';
import { createSaveService } from '../src/core/save-service.js';

const settings = {
  token: 'secret',
  databaseId: '01234567-89ab-cdef-0123-456789abcdef',
  mapping: { title: 'Name', url: 'URL', pageTitle: null, note: null },
};

const makeDeps = (overrides = {}) => ({
  loadSettings: vi.fn().mockResolvedValue(settings),
  createClient: vi.fn(() => ({
    createPage: vi.fn().mockResolvedValue({ id: 'p1', url: 'https://notion.so/p1' }),
    archivePage: vi.fn().mockResolvedValue({ id: 'p1', archived: true }),
  })),
  ...overrides,
});

describe('createSaveService', () => {
  it('設定を読み込んでページを作成し、作成結果を返す', async () => {
    const deps = makeDeps();
    const service = createSaveService(deps);
    const result = await service.save({ pageTitle: 'T', url: 'https://a.com', text: 'x', note: '' });

    expect(result).toEqual({ id: 'p1', url: 'https://notion.so/p1' });
    expect(deps.createClient).toHaveBeenCalledWith('secret');
    const client = deps.createClient.mock.results[0].value;
    expect(client.createPage).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { database_id: settings.databaseId },
        properties: expect.objectContaining({
          Name: { title: [{ type: 'text', text: { content: 'x' } }] },
        }),
      }),
    );
  });

  it.each([
    [{ ...settings, token: '' }],
    [{ ...settings, databaseId: '' }],
    [{ ...settings, mapping: null }],
    [null],
  ])('設定が不完全なら NOT_CONFIGURED エラー', async (s) => {
    const service = createSaveService(makeDeps({ loadSettings: vi.fn().mockResolvedValue(s) }));
    await expect(service.save({ pageTitle: 'T', url: 'https://a.com' })).rejects.toMatchObject({
      code: 'not_configured',
    });
  });

  it('undo で作成したページをゴミ箱に移動する', async () => {
    const deps = makeDeps();
    await createSaveService(deps).undo('p1');
    const client = deps.createClient.mock.results[0].value;
    expect(client.archivePage).toHaveBeenCalledWith('p1');
  });

  it('undo も未設定なら NOT_CONFIGURED エラー', async () => {
    const service = createSaveService(makeDeps({ loadSettings: vi.fn().mockResolvedValue(null) }));
    await expect(service.undo('p1')).rejects.toMatchObject({ code: 'not_configured' });
  });
});
