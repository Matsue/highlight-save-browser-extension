import { describe, it, expect } from 'vitest';
import {
  buildUpdatesManifest,
  releaseAssetUrl,
  findSignedXpi,
  assetName,
} from '../scripts/release-lib.js';

const REPO = 'Matsue/highlight-save-browser-extension';
const ID = 'highlight-save-notion@matsuehiroki.local';

describe('releaseAssetUrl', () => {
  it('タグ付きリリースのアセットURLを返す', () => {
    expect(releaseAssetUrl(REPO, 'v0.3.0', 'a.xpi')).toBe(
      'https://github.com/Matsue/highlight-save-browser-extension/releases/download/v0.3.0/a.xpi',
    );
  });

  it('タグ省略時は latest を指す（update_url 用）', () => {
    expect(releaseAssetUrl(REPO, null, 'updates.json')).toBe(
      'https://github.com/Matsue/highlight-save-browser-extension/releases/latest/download/updates.json',
    );
  });
});

describe('assetName', () => {
  it('バージョン付きの xpi 名を返す', () => {
    expect(assetName('0.3.0')).toBe('highlight-save-0.3.0.xpi');
  });
});

describe('buildUpdatesManifest', () => {
  it('Firefox の update manifest 形式を返す', () => {
    expect(
      buildUpdatesManifest({ id: ID, version: '0.3.0', updateLink: 'https://x/a.xpi' }),
    ).toEqual({
      addons: {
        [ID]: { updates: [{ version: '0.3.0', update_link: 'https://x/a.xpi' }] },
      },
    });
  });
});

describe('findSignedXpi', () => {
  it('web-ext sign が出力した該当バージョンの xpi を探す', () => {
    const files = ['abc-0.2.0.xpi', 'abc-0.3.0.xpi', 'highlight_save-0.3.0.zip', 'updates.json'];
    expect(findSignedXpi(files, '0.3.0')).toBe('abc-0.3.0.xpi');
  });

  it('0.3.0 と 10.3.0 を取り違えない', () => {
    expect(findSignedXpi(['abc-10.3.0.xpi'], '0.3.0')).toBeNull();
  });

  it('ハッシュが数字で終わっていても見つける', () => {
    expect(findSignedXpi(['0b02c97a596046968c19-0.3.0.xpi'], '0.3.0')).toBe(
      '0b02c97a596046968c19-0.3.0.xpi',
    );
  });

  it('リネーム済みの xpi は対象外', () => {
    expect(findSignedXpi(['highlight-save-0.3.0.xpi'], '0.3.0')).toBeNull();
  });
});
