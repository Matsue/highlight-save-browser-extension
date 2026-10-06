// テキスト選択時に「Notionに保存」ボタンを表示し、1 タップで保存する。
// トークンは扱わず、表示可否・保存・取り消しはすべて background に依頼する。
(() => {
  const { computeButtonPosition, isEditable } = globalThis.HighlightSaveFloating;
  const SHOW_DELAY_MS = 300;
  const TOAST_MS = 5000;
  const ERROR_TOAST_MS = 8000;

  let enabled = false;
  let ui = null;
  let shownText = ''; // ボタン表示時点の選択。タップで選択が外れても保存できるよう保持する
  let pressing = false;
  let saving = false;
  let updateTimer;
  let toastTimer;

  browser.runtime
    .sendMessage({ type: 'getButtonConfig' })
    .then((config) => {
      enabled = Boolean(config?.enabled);
    })
    .catch(() => {});

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font: 500 14px/1.2 system-ui, -apple-system, "Hiragino Sans", sans-serif; }
    .save {
      position: absolute; margin: 0; padding: 10px 16px; border: 0; border-radius: 999px;
      background: #191919; color: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.3);
      white-space: nowrap; cursor: pointer; touch-action: manipulation; user-select: none;
    }
    .save::before { content: ""; display: inline-block; width: .7em; height: .7em; margin-right: .5em;
      border-radius: 2px; background: #ffd43b; }
    .toast {
      position: fixed; left: 0; right: 0; bottom: 24px; margin: 0 auto;
      width: max-content; max-width: calc(100vw - 32px);
      display: flex; align-items: center; gap: 14px;
      padding: 12px 16px; border-radius: 10px; background: #191919; color: #fff;
      box-shadow: 0 4px 16px rgba(0,0,0,.35);
    }
    .toast.error { background: #c4321b; }
    .msg { white-space: pre-wrap; }
    .undo { margin: 0; padding: 4px 6px; border: 0; background: none; color: #ffd43b;
      font-weight: 700; cursor: pointer; white-space: nowrap; }
    [hidden] { display: none !important; }
  `;

  function el(tag, props) {
    return Object.assign(document.createElement(tag), props);
  }

  function ensureUi() {
    if (ui) return ui;
    const host = el('highlight-save-ui');
    host.style.cssText = 'all: initial; position: absolute; top: 0; left: 0; z-index: 2147483647;';
    // ページの CSS の影響を受けないよう Shadow DOM に閉じ込める
    const root = host.attachShadow({ mode: 'closed' });
    const save = el('button', { className: 'save', type: 'button', textContent: 'Notionに保存', hidden: true });
    const toast = el('div', { className: 'toast', hidden: true, role: 'status' });
    const msg = el('span', { className: 'msg' });
    const undo = el('button', { className: 'undo', type: 'button', textContent: '取り消す', hidden: true });
    toast.append(msg, undo);
    root.append(el('style', { textContent: STYLE }), save, toast);
    document.documentElement.append(host);

    // タップで選択が解除されてもボタンが消えないよう、押下中は表示を維持する
    const keepSelection = (e) => e.preventDefault();
    save.addEventListener('mousedown', keepSelection);
    save.addEventListener('touchstart', keepSelection, { passive: false });
    save.addEventListener('pointerdown', () => {
      pressing = true;
    });
    save.addEventListener('pointercancel', () => {
      pressing = false;
    });
    save.addEventListener('pointerup', () => {
      if (!pressing) return;
      pressing = false;
      saveSelection();
    });
    undo.addEventListener('click', () => undoSave(undo.dataset.pageId));

    ui = { save, toast, msg, undo };
    return ui;
  }

  function currentSelection() {
    if (isEditable(document.activeElement)) return null;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const text = sel.toString();
    if (!text.trim()) return null;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return { text, rect };
  }

  function showButton(rect) {
    const { save } = ensureUi();
    save.hidden = false;
    const root = document.documentElement;
    const pos = computeButtonPosition(
      rect,
      { width: root.clientWidth, height: root.clientHeight, scrollX: window.scrollX, scrollY: window.scrollY },
      { width: save.offsetWidth, height: save.offsetHeight },
    );
    save.style.left = `${pos.left}px`;
    save.style.top = `${pos.top}px`;
  }

  function hideButton() {
    if (ui) ui.save.hidden = true;
  }

  function update() {
    if (pressing || saving) return;
    const selection = enabled ? currentSelection() : null;
    if (!selection) {
      hideButton();
      return;
    }
    shownText = selection.text;
    showButton(selection.rect);
  }

  function showToast(message, { pageId, error = false, sticky = false } = {}) {
    const { toast, msg, undo } = ensureUi();
    clearTimeout(toastTimer);
    msg.textContent = message;
    toast.classList.toggle('error', error);
    undo.hidden = !pageId;
    undo.disabled = false;
    if (pageId) undo.dataset.pageId = pageId;
    toast.hidden = false;
    if (!sticky) {
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, error ? ERROR_TOAST_MS : TOAST_MS);
    }
  }

  const send = (msg) =>
    browser.runtime.sendMessage(msg).catch((err) => ({ ok: false, error: String(err) }));

  async function saveSelection() {
    const text = shownText;
    saving = true;
    hideButton();
    window.getSelection()?.removeAllRanges();
    showToast('保存中…', { sticky: true });
    const result = await send({
      type: 'save',
      payload: { text, pageTitle: document.title, url: location.href },
    });
    saving = false;
    if (result?.ok) showToast('Notionに保存しました', { pageId: result.page.id });
    else showToast(result?.error ?? '保存に失敗しました', { error: true });
  }

  async function undoSave(pageId) {
    if (!pageId) return;
    ui.undo.disabled = true;
    showToast('取り消し中…', { sticky: true });
    const result = await send({ type: 'undo', pageId });
    if (result?.ok) showToast('取り消しました');
    // 権限を直してから再試行できるよう「取り消す」を残す
    else showToast(result?.error ?? '取り消せませんでした', { error: true, pageId });
  }

  document.addEventListener('selectionchange', () => {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(update, SHOW_DELAY_MS);
  });
})();
