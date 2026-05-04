# クライアント受領 — Yo-Ki-Hi LP 制作依頼サマリ

> 受領日: 2026-05-04
> 出典: ユーザーからの直接指示

## 依頼概要

- 柔道整復師（整骨院・整体院・治療院・サロン関係者）向けの LP を制作する。
- 最後に **入力したパスワードによって購入ページが3つに分岐** する仕組みを入れる。
- モックサイトの段階で顧客は満足しているため、**モックにかなり寄せて構わない**。

## モック・要件定義の所在

- 要件定義（ビジュアル版）: `https://yo-ki-hi-mock.netlify.app/requirements-visual`
- 要件定義（Markdown版）: `https://yo-ki-hi-mock.netlify.app/requirements-summary.md`
- モックトップ: `https://yo-ki-hi-mock.netlify.app/`
- パスワード認証ページ: `https://yo-ki-hi-mock.netlify.app/purchase-login`

## ナレッジ参照指示

1. `https://github.com/mizukiskriii1209-commits/web-design-guide/tree/main/docs` — **取得時点で 404。閲覧不可。**
2. `https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md` — 取得済み（`frontend-design-skill/SKILL.md`）。

## 制作上の遵守事項（HP制作ナレッジ）

- PC・モバイルでの閲覧を両方考慮する
- 文章の折り返しを意識し、適切な位置で改行する
- フォントとアニメーションにこだわる
- 最終的にデプロイすることを前提に組む
- 画像の容量が大きすぎる場合は自律的に WebP に変換する
- 内容に合ったモノクロ記号を必要に応じて差し込む
- レスポンシブ対応必須
- OGP（Open Graph Protocol）の設定を行う
- 画像の差し込み方にも拘る

完成後、サイトを **自律的に確認し、AI 臭さがないか** を見直して再修正する。

## 補足 — パスワード3区分

| 区分 | 用途 |
| --- | --- |
| 導入店 / 一般導入者 | 取扱店契約済みの治療院・サロン向け |
| 平森先生の塾生 | 平森先生主催コミュニティの塾生向け |
| 太田先生の塾生 | 太田先生主催コミュニティの塾生向け |

実パスワードと購入URLは現時点で未確定。本番ではサーバー側判定を推奨する旨を要件に記す。
