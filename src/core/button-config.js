/** 選択時の保存ボタンの表示条件 */
export const BUTTON_MODES = ['always', 'android', 'off'];
export const DEFAULT_BUTTON_MODE = 'always';

/**
 * @param {import('../adapters/settings.js').Settings|null} settings
 * @param {string} os browser.runtime.getPlatformInfo() の os
 */
export function shouldShowButton(settings, os) {
  if (!settings?.token || !settings.databaseId) return false;
  const mode = settings.floatingButton ?? DEFAULT_BUTTON_MODE;
  return mode === 'always' || (mode === 'android' && os === 'android');
}
