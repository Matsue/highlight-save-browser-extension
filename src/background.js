import { createNotionClient, describeError } from './core/notion-client.js';
import { createSaveService } from './core/save-service.js';
import { shouldShowButton } from './core/button-config.js';
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

const undo = (pageId) =>
  service.undo(pageId).then(
    () => ({ ok: true }),
    (err) => ({
      ok: false,
      error:
        err?.status === 403
          ? '取り消せませんでした。インテグレーションの「Update content」権限を有効にしてください。'
          : describeError(err),
    }),
  );

// コンテンツスクリプトにはトークンを渡さず、表示可否だけを返す
const getButtonConfig = async () => {
  const [settings, { os }] = await Promise.all([loadSettings(), browser.runtime.getPlatformInfo()]);
  return { enabled: shouldShowButton(settings, os) };
};

// ポップアップ・ページ内ボタンからの要求。ポップアップが閉じても完了するよう background で実行する。
browser.runtime.onMessage.addListener((msg) => {
  switch (msg?.type) {
    case 'save':
      return save(msg.payload);
    case 'undo':
      return undo(msg.pageId);
    case 'getButtonConfig':
      return getButtonConfig();
    default:
      return undefined;
  }
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
