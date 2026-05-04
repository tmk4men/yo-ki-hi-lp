# HP制作チェックリスト — yo-ki-hi LP

クライアント遵守事項を運用しやすくしたチェックリスト。

## 1. レスポンシブ / 表示

- [ ] PC（1280以上）・タブレット（768〜1080）・モバイル（〜640）の3断面で確認
- [ ] 文章の折り返しが不自然な場所で起きていないか（特に見出し）
- [ ] `<br>` は意味のある改行のみ。スマホでは打ち消す指示を CSS 側で持つ
- [ ] 行間（line-height）1.7〜1.9 を本文の標準とする
- [ ] スクロール位置調整: ハッシュ遷移時 `scroll-margin-top` を確保

## 2. タイポグラフィ

- [ ] 見出し: セリフ系（明朝・Iowan Old Style 系）でブランドの上品さを担保
- [ ] 本文: サンセリフ（Hiragino Sans / Yu Gothic）で可読性を確保
- [ ] Inter / Roboto / Arial など generic AI font は使わない
- [ ] 字間・行間を調整して密度感をデザインする

## 3. アニメーション

- [ ] スクロール連動の reveal は IntersectionObserver で実装
- [ ] hover, focus-visible にトランジションを持つ
- [ ] CTA など重要要素には微細な lift（translateY）を入れる
- [ ] `prefers-reduced-motion` を尊重する

## 4. 画像

- [ ] 大きな画像は **WebP** に変換（quality 80〜85）
- [ ] `loading="lazy"` をファーストビュー外に
- [ ] `alt` 必須、図解は内容まで記述
- [ ] aspect-ratio で CLS を防ぐ
- [ ] 装飾画像は背景や疑似要素に逃がす

## 5. 記号・装飾

- [ ] 必要な箇所のみモノクロの記号（漢字一字、◎、—、・）で軽く強調
- [ ] AIアイコンセット（Heroicons 過剰利用など）に頼らない
- [ ] グラデや blob はシーンに合わせて 1〜2 種類に制限

## 6. OGP

- [ ] `og:title` `og:description` `og:type` `og:url` `og:image`
- [ ] `twitter:card` `twitter:title` `twitter:description` `twitter:image`
- [ ] 画像は 1200×630 推奨。最低限 SVG/PNG で用意
- [ ] favicon (svg / ico) を用意

## 7. メタ / アクセシビリティ

- [ ] `<html lang="ja">`, `<meta charset>`, viewport
- [ ] description / keywords
- [ ] aria-label, role を必要箇所に
- [ ] コントラスト比 WCAG AA 以上
- [ ] フォーカスリング消さない

## 8. パフォーマンス

- [ ] CSS / JS は最低限。フレームワーク不要なら使わない
- [ ] フォントは system font または 1〜2 ファイルに絞る
- [ ] 画像合計サイズに気を配る（モバイル LCP 2.5s 以下を目安）

## 9. AI臭さチェック（完成後）

- [ ] 「Lorem ipsum」や「サンプルテキスト」が残っていない
- [ ] 紫グラデ on 白背景になっていない
- [ ] 同じ余白・同じ角丸で全カードが画一的になっていない
- [ ] アイコン濫用や絵文字の多用がない
- [ ] コピーが「お客様の課題を解決します」的な汎用文になっていない
- [ ] フォントが Inter / Roboto / Arial に逃げていない
- [ ] hero の見出しが定型句（"Empower your..." "Transform..."）になっていない
