# 序章：最初の冒険を動かす（演習用）

冒険者が村を出発し、移動し、敵と遭遇するログを出すCLIです。まずはそのまま動かし、次に `src/content/scenario.ts` の名前・HP・道のりを書き換えて、ログがどう変わるかを確かめてください。

## 1. 起動

```sh
npm ci
npm start
```

## 2. 期待される出力

書き換える前は、次のとおりに表示されます。

<!-- output -->
```text
[1] リナは村を出発した。（HP 12）
[2] リナは森へ移動した。
[3] リナはスライムに遭遇した！ HP 12→9
[4] リナは洞窟の入口へ移動した。
[5] リナは大コウモリに遭遇した！ HP 9→5
```
<!-- /output -->

## 3. テスト

```sh
npm test                # 既定のテスト（starter でも通る）
npm run test:exercises  # 演習用テスト（演習を解くまで失敗する）
npm run check           # 型チェック → テスト
```

## 4. 演習

| 演習 | 編集するところ | 合格の基準 |
|---|---|---|
| 設定を変える | `src/content/scenario.ts` の `hero` と `steps` | `npm start` のログが変わる |
| 休む | `src/adventure.ts` の `TODO`、`src/narration/format.ts` の `TODO` | `tests/exercises/rest.test.ts` が通る |

## 5. 前章からの変更点

序章は最初の章なので、すべてのファイルが新規です。ファイルの一覧は `../solution/README.md` を参照してください。
