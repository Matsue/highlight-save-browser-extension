// 署名 → updates.json 生成 → GitHub Release 作成 を一括で行う。
// 使い方: WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... npm run release
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assetName,
  buildUpdatesManifest,
  findSignedXpi,
  releaseAssetUrl,
} from './release-lib.js';

const REPO = 'Matsue/highlight-save-browser-extension';
const DIST = 'dist';
const OUT = join(DIST, 'release');

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const read = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};
const succeeds = (cmd, args) => {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const manifest = JSON.parse(readFileSync('src/manifest.json', 'utf8'));
const { version } = manifest;
const { id, update_url: updateUrl } = manifest.browser_specific_settings.gecko;
const tag = `v${version}`;

// --- 事前チェック ---------------------------------------------------------
if (updateUrl !== releaseAssetUrl(REPO, null, 'updates.json')) {
  fail(`manifest の update_url が想定と異なります: ${updateUrl}`);
}
if (read('git', ['status', '--porcelain'])) fail('未コミットの変更があります。');
if (read('git', ['rev-parse', 'HEAD']) !== read('git', ['rev-parse', '@{u}'])) {
  fail('push されていないコミットがあります。先に git push してください。');
}
if (succeeds('gh', ['release', 'view', tag, '--repo', REPO])) {
  fail(`${tag} は既にリリース済みです。manifest.json の version を上げてください。`);
}

run('npm', ['test']);
run('npm', ['run', 'lint']);

// --- 署名（前回タイムアウトして xpi だけ後から取得した場合はスキップ） ------
mkdirSync(DIST, { recursive: true });
let signed = findSignedXpi(readdirSync(DIST), version);
if (!signed) {
  if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET) {
    fail('WEB_EXT_API_KEY / WEB_EXT_API_SECRET を環境変数で指定してください。');
  }
  try {
    run('npx', ['web-ext', 'sign', '--source-dir', 'src', '--artifacts-dir', DIST, '--channel', 'unlisted']);
  } catch {
    fail(
      '署名を完了できませんでした。審査待ちの場合は、承認後に AMO 開発者ハブから\n' +
        `  署名済み xpi を ${DIST}/ に保存し、もう一度 npm run release を実行してください。`,
    );
  }
  signed = findSignedXpi(readdirSync(DIST), version);
  if (!signed) fail(`${DIST}/ に ${version} の署名済み xpi が見つかりません。`);
}

// --- アセット作成とリリース ---------------------------------------------
mkdirSync(OUT, { recursive: true });
const xpi = join(OUT, assetName(version));
const updates = join(OUT, 'updates.json');
copyFileSync(join(DIST, signed), xpi);
writeFileSync(
  updates,
  `${JSON.stringify(
    buildUpdatesManifest({ id, version, updateLink: releaseAssetUrl(REPO, tag, assetName(version)) }),
    null,
    2,
  )}\n`,
);

run('gh', [
  'release', 'create', tag, xpi, updates,
  '--repo', REPO,
  '--target', read('git', ['rev-parse', 'HEAD']),
  '--title', tag,
  '--notes', `署名済み xpi（${assetName(version)}）。インストール済みの Firefox は自動で更新されます。`,
]);
console.log(`\n✓ ${tag} をリリースしました`);
