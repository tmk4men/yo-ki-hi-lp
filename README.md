# Yo-Ki-Hi LP

柔道整復師（整骨院・整体院・治療院・サロン）向け、Yo-Ki-Hi 骨盤ベルト／インナーパンツの導入支援 1ページ LP。

## ファイル構成

```
yo-ki-hiLP/
├── index.html              トップページ（1ページ集約・JSON-LD/OGP/PWA）
├── purchase-login.html     パスワード認証
├── purchase-shop.html      購入: 導入店／一般導入者
├── purchase-hiramori.html  購入: 平森先生の塾生
├── purchase-ota.html       購入: 太田先生の塾生
├── tokushoho.html          特定商取引法に基づく表記（雛形）
├── 404.html                Not Found
├── style.css               全ページ共通 CSS（@media print 含む）
├── app.js                  共通 JS（reveal/SW登録/トースト/動画facade）
├── purchase-login.js       パスワード分岐
├── service-worker.js       PWA キャッシュ戦略
├── manifest.webmanifest    PWA マニフェスト
├── _redirects              Netlify clean URL + 404 fallback
├── _headers                Netlify セキュリティヘッダ + キャッシュ
├── sitemap.xml             サイトマップ
├── robots.txt              認証ページの除外
├── assets/                 画像（WebP / SVG）
├── requirements.md         要件定義書
└── knowledge/              制作ナレッジ保管庫
```

## ローカル確認

このリポジトリは静的ファイルのみ。任意の HTTP サーバで配信できます。

```sh
python3 -m http.server 5173
# → http://localhost:5173/
```

※ Service Worker は `https://` でのみ登録される設計（ローカル開発を邪魔しない）。

## デプロイ

Netlify / Cloudflare Pages / Vercel などにそのまま乗せられます。
`_redirects` を読み込むホスティング（Netlify）であれば、`/purchase-login` のような拡張子なし URL と 404 フォールバックが有効になります。
`_headers` も読み込むので、CSP / HSTS / X-Content-Type-Options / Permissions-Policy が自動付与されます。

## 本番デプロイ前のチェックリスト

| 置き換え対象 | 対象ファイル |
| --- | --- |
| `https://yo-ki-hi.example.com` を本番ドメインへ | `*.html` の `og:url` / `twitter:image` / `og:image` / `canonical` / `JSON-LD`、`sitemap.xml` |
| プレースホルダパスワード | `purchase-login.js` の `passwordRoutes`（**本番はサーバー判定推奨**） |
| 仮置き購入リンク `href="#"` | `purchase-shop.html` / `purchase-hiramori.html` / `purchase-ota.html` の `data-purchase-placeholder` 属性付き `<a>` |
| 特商法表記の各項目 | `tokushoho.html` のプレースホルダ各 `<dd>` |

## パフォーマンス・品質指標（Lighthouse）

| カテゴリ | スコア |
| --- | --- |
| Performance | 100 (mobile) |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 (`/`) ／ 91 (認証配下＝意図的 noindex) |

## アクセシビリティ・配慮

- skip-link、`aria-label`、`aria-live`、`role` 整合（ARIA 違反 0）
- `prefers-reduced-motion` でアニメーション無効化（reveal は即表示）
- `@media print` で紙質感そのままに印刷可能
- `lang="ja"`、フォントは Iowan Old Style + Hiragino Mincho/Sans

## サードパーティの扱い

- **YouTube**: クリック時のみ iframe 生成する facade パターン → 初回アクセス時の 3rd-party Cookie ゼロ。
- 埋込ドメインも `youtube-nocookie.com` を採用。

## ナレッジ保管庫

`knowledge/` 以下に、

- 制作時に参照したフロントエンドデザインの SKILL（Anthropic 公式 frontend-design）
- HP 制作チェックリスト
- クライアント受領サマリ
- 参考にしたモックサイトの凍結コピー
- web-design-guide リポ取得状況メモ（取得不可）

を保管しています。
