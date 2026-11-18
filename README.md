# reading-rpg-course

「読むRPG」の最小実装（MVP）を作りながら、TypeScript・アルゴリズム・Webアプリ開発・Git/GitHub・テスト・CI/CD を学ぶHTML教材です。

読むRPGとは、プレイヤーが操作するのではなく、**数字と短い日本語ログを読んで、冒険の履歴や世界ができていく様子を想像する**ゲームです。教材では次の3つのスケールを順に作り、最後に統合します。

1. **一瞬の行動**：技能・装備・環境から行動を選び、問題を解決する
2. **キャラクターの人生**：目的・性格・記憶・成長によって行動が変わる
3. **世界の歴史**：複数人物の出来事が同じ世界に積み重なる

## 設計思想：アフォーダンス

行動の可能性を「キャラクターの能力 × 対象物の状態 × 環境」の関係としてデータで表します。設計は次の文献に基づきます（詳細は [docs/design/affordance-model.md](docs/design/affordance-model.md)）。

- Pinchbeck, D. (2009). *An affordance based model for gameplay*. Proceedings of DiGRA 2009.
- Baker, B., & Roberts, S. (2025). Understanding Agent Complexity Through Affordances. *Minds and Machines*, 35, 51. https://doi.org/10.1007/s11023-025-09748-7

## 公開状況

| 区分 | 状態 |
|---|---|
| 序章〜第3章 | 試作（イメージ合わせ用） |
| 第4章〜第16章 | 準備中 |

## ディレクトリ

```text
index.html          教材トップページ
chapters/           各章の教材ページ（chXX.html）
parts/              各部の概要ページ
assets/             教材共通のCSS・JS
examples/chXX/
  starter/          演習用コード（学習者が編集する初期状態）
  solution/         その章の完成版コード（単独で起動・テスト可能）
references/         設計思想・用語・コマンド集
docs/spec.md        教材制作仕様書
docs/design/        データモデル・アーキテクチャ・UIの設計文書
```

## 使い方

教材ページはブラウザで `index.html` を開けば読めます。

各章のコードは、それぞれ独立したnpmプロジェクトです。

```sh
cd examples/ch02/solution
npm install
npm start      # ログを出力
npm test       # テストを実行
npm run typecheck
```

必要環境：Node.js 20 以上、npm、Git。
