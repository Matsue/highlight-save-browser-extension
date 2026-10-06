# Highlight Save to Notion

Firefox（Android / macOS）で、選択したテキストと閲覧中のページの URL を Notion のデータベースに保存する拡張機能。

## 使い方

| 環境 | 操作 |
| --- | --- |
| Android | テキストを選択 → メニュー（⋮）→ 拡張機能 →「Notionに保存」→ 保存ボタン |
| macOS | テキストを選択 → 右クリック →「Notionに保存」（ポップアップなしで即保存し、通知で結果を表示） |
| macOS | ツールバーのアイコン、または `Alt+Shift+S` → ポップアップで編集してから保存 |

選択したテキストが Notion ページのタイトルになります（ページ本文には何も書き込みません）。
ポップアップでは保存前にタイトルを編集できます。
Android でメニューを開いた拍子に選択が外れても、直近 5 分以内の選択を復元します。

## 初期設定

1. [Notion のインテグレーション管理](https://www.notion.so/profile/integrations)で内部インテグレーションを作り、シークレットをコピーする
2. 保存先の DB を開き、「…」→「接続」でそのインテグレーションを追加する
3. 拡張機能の設定画面にシークレットと DB の URL を貼り付け、「DBを読み込む」→「保存」

### 保存先プロパティ

DB を読み込むと、各値を保存するプロパティが自動で割り当てられます（設定画面で変更できます）。
割り当て先が無い値は保存しません。

| 値 | 保存先 |
| --- | --- |
| 選択テキスト | title 型プロパティ（選択が空ならページのタイトル → URL の順で代わりに使う） |
| ページの URL | 最初の URL 型プロパティ |
| ページのタイトル | 名前に「ページタイトル・出典・記事 / page title・source…」を含むテキスト型 |
| メモ | 名前に「メモ・コメント・備考 / note・memo…」を含むテキスト型（割り当て時のみポップアップに入力欄を表示） |

## インストール

### macOS（開発用・一時的）

```bash
npm install
npm start          # web-ext run で拡張機能を読み込んだ Firefox を起動
```

または `about:debugging` →「この Firefox」→「一時的なアドオンを読み込む」で `src/manifest.json` を選択します。

### 常用（Android / macOS 共通・自動更新あり）

[Releases](https://github.com/Matsue/highlight-save-browser-extension/releases/latest) から最新の `highlight-save-<version>.xpi` をダウンロードしてインストールします。
一度インストールすれば、以降は Firefox が `updates.json` を定期的に確認して自動で更新します（macOS は `about:addons` の歯車 →「更新を確認」で即時確認も可能）。

- **macOS**: `about:addons` → 歯車 →「ファイルからアドオンをインストール」
- **Android**: 「設定」→「Firefox について」でロゴを 5 回タップしてデバッグメニューを有効化 →「設定」→「ファイルからアドオンをインストール」

> Android で自前ホストの自動更新が動くかは未検証です。届かない場合は同じ手順で入れ直してください。

### Android（開発中の動作確認）

USB デバッグを有効にした端末を接続し、Firefox の「リモートデバッグ」をオンにしてから実行します。

```bash
npm run start:android
```

## 開発

```bash
npm test        # vitest
npm run lint    # web-ext lint
npm run build   # dist/ に zip を作成
```

### リリース

1. `src/manifest.json` の `version` を上げてコミットし、push する
2. [AMO の API キー](https://addons.mozilla.org/developers/addon/api/key/)を環境変数で渡して実行する
   ```bash
   WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... npm run release
   ```

テスト・lint → AMO で非公開（unlisted）署名 → `updates.json` 生成 → GitHub Release 作成までを行います。
署名が審査待ちでタイムアウトした場合は、承認後に AMO 開発者ハブから署名済み xpi を `dist/` に保存して再実行してください（署名はスキップされます）。

AMO の API キーは、あなた名義で署名済みの更新を作れる鍵です。コミットしないでください。

### 構成

```
src/
  core/        純粋ロジック（ブラウザ API に依存しない・テスト対象）
    database-id.js   DB の URL / ID の正規化
    mapping.js       DB スキーマから保存先プロパティを推測
    page-request.js  Notion「ページ作成」リクエストの組み立て（選択テキスト → タイトル）
    rich-text.js     2000 文字・100 要素の API 上限に合わせた分割
    selection.js     現在の選択とキャッシュのどちらを使うかの判定
    notion-client.js Notion API クライアントとエラーメッセージ
    save-service.js  保存ユースケース（設定とクライアントを注入）
  adapters/    browser.* API との境界（storage・tabs）
  background.js  保存処理と右クリックメニュー
  content/       選択テキストのキャッシュ
  popup/ options/ ui/   画面
```

### メモ

- Notion API は `Notion-Version: 2022-06-28` を使用しています。複数のデータソースを持つ DB（2025-09 以降の機能）には対応していません。
- シークレットは `browser.storage.local` に平文で保存されます。インテグレーションの権限は保存先の DB だけに絞ってください。
