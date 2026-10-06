// 直近の選択テキストを覚えておく。
// Android ではメニューから拡張機能を開くと選択が解除されることがあるため、
// ポップアップは「今の選択」が空ならこのキャッシュを使う。
(() => {
  let cached = '';
  let cachedAt = 0;

  const readSelection = () => {
    const el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) {
      const { selectionStart: s, selectionEnd: e } = el;
      if (typeof s === 'number' && e > s) return el.value.slice(s, e);
    }
    return String(window.getSelection() ?? '');
  };

  document.addEventListener('selectionchange', () => {
    const text = readSelection();
    if (text.trim()) {
      cached = text;
      cachedAt = Date.now();
    }
  });

  browser.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'getSelection') {
      return Promise.resolve({ current: readSelection(), cached, cachedAt });
    }
    return undefined;
  });
})();
