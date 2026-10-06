import { createNotionClient, describeError } from './core/notion-client.js';
import { createSaveService } from './core/save-service.js';
import { loadSettings } from './adapters/settings.js';
import { getPageContext } from './adapters/page-context.js';

const service = createSaveService({
  loadSettings,
  createClient: (token) => createNotionClient(token),
});

const save = (payload) =>
  service.save(payload).then(
    (page) => ({ ok: true, page }),
    (err) => ({ ok: false, error: describeError(err), code: err?.code }),
  );

// ポップアップからの保存要求。ポップアップが閉じても処理が完了するよう background で実行する。
browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'save') return save(msg.payload);
  return undefined;
});

// 右クリックメニュー（デスクトップのみ。Android には menus API が無い）
if (browser.menus) {
  const MENU_ID = 'save-to-notion';
  browser.menus.removeAll().then(() =>
    browser.menus.create({
      id: MENU_ID,
      title: 'Notionに保存',
      contexts: ['selection', 'page', 'link'],
    }),
  );

  browser.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID) return;
    const ctx = await getPageContext(tab);
    const payload = {
      text: ctx.text || info.selectionText || '',
      // リンク上で開いた場合はリンク先を保存する
      pageTitle: info.linkUrl ? info.linkText || '' : ctx.title,
      url: info.linkUrl ?? ctx.url,
    };
    const result = await save(payload);
    browser.notifications?.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.svg'),
      title: result.ok ? 'Notionに保存しました' : 'Notionへの保存に失敗しました',
      message: result.ok ? payload.text || payload.pageTitle || payload.url : result.error,
    });
  });
}
