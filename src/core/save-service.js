import { buildPageRequest } from './page-request.js';
import { NotionError } from './notion-client.js';

/**
 * 「保存」ユースケース。ストレージや HTTP の実体は依存として注入する。
 * @param {{ loadSettings: () => Promise<any>, createClient: (token: string) => { createPage: Function } }} deps
 */
export function createSaveService({ loadSettings, createClient }) {
  return {
    async save({ text, pageTitle, url, note }) {
      const settings = await loadSettings();
      if (!settings?.token || !settings.databaseId || !settings.mapping?.title) {
        throw new NotionError(0, 'not_configured', 'not configured');
      }
      const body = buildPageRequest({
        databaseId: settings.databaseId,
        mapping: settings.mapping,
        text,
        pageTitle,
        url,
        note,
      });
      const page = await createClient(settings.token).createPage(body);
      return { id: page.id, url: page.url };
    },
  };
}
