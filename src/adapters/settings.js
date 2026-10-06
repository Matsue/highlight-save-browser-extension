const KEY = 'settings';

/**
 * @typedef {{ token: string, databaseId: string, databaseTitle?: string,
 *             mapping: import('../core/mapping.js').Mapping }} Settings
 */

/** @returns {Promise<Settings|null>} */
export async function loadSettings() {
  const { [KEY]: settings } = await browser.storage.local.get(KEY);
  return settings ?? null;
}

/** @param {Settings} settings */
export async function saveSettings(settings) {
  await browser.storage.local.set({ [KEY]: settings });
}
