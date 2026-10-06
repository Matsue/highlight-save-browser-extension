// リリース処理のうち副作用を持たない部分

export const assetName = (version) => `highlight-save-${version}.xpi`;

/** GitHub Release のアセット URL。tag が null なら最新リリースを指す */
export function releaseAssetUrl(repo, tag, file) {
  const base = `https://github.com/${repo}/releases`;
  return tag ? `${base}/download/${tag}/${file}` : `${base}/latest/download/${file}`;
}

/** Firefox の update manifest（updates.json） */
export function buildUpdatesManifest({ id, version, updateLink }) {
  return { addons: { [id]: { updates: [{ version, update_link: updateLink }] } } };
}

/** web-ext sign が出力した `<hash>-<version>.xpi` を探す */
export function findSignedXpi(files, version) {
  return (
    files.find((f) => {
      const m = f.match(/^(.+)-([^-]+)\.xpi$/);
      return m && m[2] === version && f !== assetName(version);
    }) ?? null
  );
}
