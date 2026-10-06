import { describe, it, expect, beforeAll } from 'vitest';

let computeButtonPosition;
let isEditable;
beforeAll(async () => {
  // コンテンツスクリプトは通常スクリプトなので globalThis 経由で公開している
  await import('../src/content/floating-logic.js');
  ({ computeButtonPosition, isEditable } = globalThis.HighlightSaveFloating);
});

const viewport = { width: 400, height: 800, scrollX: 0, scrollY: 1000 };
const button = { width: 120, height: 40 };
const GAP = 32;

describe('computeButtonPosition', () => {
  it('選択範囲の下（選択ハンドルを避ける余白付き）に、左端をそろえて置く（ドキュメント座標）', () => {
    const rect = { left: 50, top: 100, bottom: 140, right: 200 };
    expect(computeButtonPosition(rect, viewport, button)).toEqual({
      left: 50,
      top: 1000 + 140 + GAP,
    });
  });

  it('下に入らなければ選択範囲の上に置く', () => {
    const rect = { left: 50, top: 600, bottom: 760, right: 200 };
    expect(computeButtonPosition(rect, viewport, button).top).toBe(1000 + 600 - GAP - 40);
  });

  it('右にはみ出す場合は画面内に収める', () => {
    const rect = { left: 350, top: 100, bottom: 140, right: 390 };
    expect(computeButtonPosition(rect, viewport, button).left).toBe(400 - 120 - 8);
  });

  it('左にはみ出す場合も画面内に収める', () => {
    const rect = { left: -30, top: 100, bottom: 140, right: 10 };
    expect(computeButtonPosition(rect, viewport, button).left).toBe(8);
  });

  it('上下どちらにも入らなければ画面下端に収める', () => {
    const rect = { left: 50, top: 10, bottom: 790, right: 200 };
    expect(computeButtonPosition(rect, viewport, button).top).toBe(1000 + 800 - 40 - 8);
  });

  it('横スクロール量を加える', () => {
    const rect = { left: 50, top: 100, bottom: 140, right: 200 };
    expect(computeButtonPosition(rect, { ...viewport, scrollX: 30 }, button).left).toBe(80);
  });
});

describe('isEditable', () => {
  it.each([
    [{ tagName: 'TEXTAREA' }, true],
    [{ tagName: 'INPUT' }, true],
    [{ tagName: 'DIV', isContentEditable: true }, true],
    [{ tagName: 'DIV', isContentEditable: false }, false],
    [null, false],
  ])('%o → %s', (el, expected) => {
    expect(isEditable(el)).toBe(expected);
  });
});
