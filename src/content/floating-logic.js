// 選択時の保存ボタンの純粋ロジック。
// コンテンツスクリプトは ES モジュールにできないため globalThis に公開する（テストからも読み込む）。
(() => {
  const EDGE = 8; // 画面端との余白
  const GAP = 32; // 選択範囲との間隔（Android の選択ハンドルを避ける）

  const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));

  /**
   * 選択範囲（ビューポート座標）からボタンの位置（ドキュメント座標）を求める。
   * 下に置き、入らなければ上、どちらも無理なら画面下端に置く。
   */
  function computeButtonPosition(rect, viewport, button) {
    const left = clamp(rect.left, EDGE, viewport.width - button.width - EDGE);
    const below = rect.bottom + GAP;
    const above = rect.top - GAP - button.height;
    let top;
    if (below + button.height <= viewport.height - EDGE) top = below;
    else if (above >= EDGE) top = above;
    else top = viewport.height - button.height - EDGE;
    return { left: left + viewport.scrollX, top: top + viewport.scrollY };
  }

  /** 入力欄などの編集可能な要素か */
  function isEditable(el) {
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true;
  }

  globalThis.HighlightSaveFloating = { computeButtonPosition, isEditable };
})();
