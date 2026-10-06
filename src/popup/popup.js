import { loadSettings } from '../adapters/settings.js';
import { getActiveTab, getPageContext } from '../adapters/page-context.js';

const $ = (id) => document.getElementById(id);
const CLOSE_DELAY_MS = 1200;

const openOptions = () => browser.runtime.openOptionsPage().then(() => window.close());

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}

async function init() {
  const { os } = await browser.runtime.getPlatformInfo();
  if (os === 'android') document.body.classList.add('android');

  $('open-options').addEventListener('click', openOptions);
  $('open-options-setup').addEventListener('click', openOptions);

  const settings = await loadSettings();
  if (!settings?.token || !settings.databaseId) {
    $('unconfigured').classList.remove('hidden');
    return;
  }

  const tab = await getActiveTab();
  const ctx = await getPageContext(tab);
  $('text').value = ctx.text;
  $('page-title').value = ctx.title;
  // 割り当て先プロパティがある項目だけ表示する（無い項目は保存されないため）
  $('page-title-field').classList.toggle('hidden', !settings.mapping?.pageTitle);
  $('note-field').classList.toggle('hidden', !settings.mapping?.note);
  $('url').textContent = ctx.url;
  $('url').title = ctx.url;
  $('form').classList.remove('hidden');
  (ctx.text ? $('save') : $('text')).focus();

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('save').disabled = true;
    setStatus('保存中…');
    const result = await browser.runtime.sendMessage({
      type: 'save',
      payload: {
        text: $('text').value,
        pageTitle: $('page-title').value,
        url: ctx.url,
        note: $('note').value,
      },
    });
    if (result?.ok) {
      setStatus('保存しました ✓', 'ok');
      setTimeout(() => window.close(), CLOSE_DELAY_MS);
    } else {
      setStatus(result?.error ?? '保存に失敗しました', 'err');
      $('save').disabled = false;
    }
  });
}

init().catch((err) => setStatus(String(err), 'err'));
