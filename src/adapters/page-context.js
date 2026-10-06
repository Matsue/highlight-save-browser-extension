import { pickSelection } from '../core/selection.js';

const isExtensionPage = (url) => /^moz-extension:/.test(url ?? '');

/** ポップアップから見た「いま閲覧中のタブ」を返す（Android でポップアップ自身を拾わないよう除外） */
export async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab && !isExtensionPage(tab.url)) return tab;
  const tabs = await browser.tabs.query({ active: true });
  return tabs.find((t) => !isExtensionPage(t.url)) ?? tab;
}

async function readSelection(tabId) {
  try {
    return await browser.tabs.sendMessage(tabId, { type: 'getSelection' });
  } catch {
    // インストール前から開いていたタブなどコンテンツスクリプトが居ない場合
    try {
      const [current] = await browser.tabs.executeScript(tabId, {
        code: 'String(window.getSelection() ?? "")',
      });
      return { current };
    } catch {
      return {}; // about: ページなどスクリプトを注入できないページ
    }
  }
}

/** @returns {Promise<{ title: string, url: string, text: string }>} */
export async function getPageContext(tab) {
  const raw = tab?.id === undefined ? {} : await readSelection(tab.id);
  return {
    title: tab?.title ?? '',
    url: tab?.url ?? '',
    text: pickSelection({ ...raw, now: Date.now() }),
  };
}
