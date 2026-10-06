import { parseDatabaseId } from '../core/database-id.js';
import { detectMapping, listPropertyOptions } from '../core/mapping.js';
import { createNotionClient, describeError } from '../core/notion-client.js';
import { DEFAULT_BUTTON_MODE } from '../core/button-config.js';
import { loadSettings, saveSettings } from '../adapters/settings.js';

const $ = (id) => document.getElementById(id);
const NONE = ''; // select の値 '' = 保存しない

let databaseTitle = '';

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}

function fillSelect(select, names, { emptyLabel, selected }) {
  select.replaceChildren();
  if (emptyLabel) select.append(new Option(emptyLabel, NONE));
  for (const name of names) select.append(new Option(name, name));
  select.value = selected ?? NONE;
}

function renderMapping(properties, mapping) {
  const richTexts = listPropertyOptions(properties, 'rich_text');
  fillSelect($('map-title'), listPropertyOptions(properties, 'title'), { selected: mapping.title });
  const none = '（保存しない）';
  fillSelect($('map-url'), listPropertyOptions(properties, 'url'), {
    emptyLabel: none,
    selected: mapping.url,
  });
  fillSelect($('map-page-title'), richTexts, { emptyLabel: none, selected: mapping.pageTitle });
  fillSelect($('map-note'), richTexts, { emptyLabel: none, selected: mapping.note });
  $('mapping').disabled = false;
  $('save').disabled = false;
}

const readMapping = () => ({
  title: $('map-title').value,
  url: $('map-url').value || null,
  pageTitle: $('map-page-title').value || null,
  note: $('map-note').value || null,
});

async function loadDatabase({ keepMapping } = {}) {
  const token = $('token').value.trim();
  const databaseId = parseDatabaseId($('database').value);
  if (!token || !databaseId) {
    setStatus('シークレットと正しいDBのURL/IDを入力してください。', 'err');
    return;
  }
  setStatus('読み込み中…');
  try {
    const db = await createNotionClient(token).retrieveDatabase(databaseId);
    databaseTitle = db.title?.map((t) => t.plain_text).join('') || '(無題のDB)';
    $('db-title').textContent = `保存先: ${databaseTitle}`;
    const detected = detectMapping(db.properties);
    renderMapping(db.properties, keepMapping ? { ...detected, ...keepMapping } : detected);
    setStatus('DBを読み込みました。割り当てを確認して「保存」してください。', 'ok');
  } catch (err) {
    setStatus(describeError(err), 'err');
  }
}

async function init() {
  const settings = await loadSettings();
  $('floating-button').value = settings?.floatingButton ?? DEFAULT_BUTTON_MODE;
  if (settings) {
    $('token').value = settings.token;
    $('database').value = settings.databaseId;
    $('db-title').textContent = `保存先: ${settings.databaseTitle ?? ''}`;
    await loadDatabase({ keepMapping: settings.mapping });
  }

  $('load').addEventListener('click', () => loadDatabase());
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings({
      token: $('token').value.trim(),
      databaseId: parseDatabaseId($('database').value),
      databaseTitle,
      mapping: readMapping(),
      floatingButton: $('floating-button').value,
    });
    setStatus('保存しました。ページでテキストを選択して拡張機能を開いてください。', 'ok');
  });
}

init().catch((err) => setStatus(String(err), 'err'));
