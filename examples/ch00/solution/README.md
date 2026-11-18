# 序章：最初の冒険を動かす（完成版）

冒険者が村を出発し、移動し、敵と遭遇するログを出すCLIです。`src/content/scenario.ts` の名前・HP・道のりを書き換えると、ログが変わります。

## 1. 起動

```sh
npm ci
npm start
```

序章では引数を使いません。乱数も使わないので、同じ設定なら常に同じログになります。

## 2. 期待される出力

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
npm test                # 既定のテスト（演習用テストを含む）
npm run test:exercises  # 演習用テストだけを実行
npm run check           # 型チェック → テスト
```

## 4. 前章からの変更点

序章は最初の章なので、すべてのファイルが新規です。

| ファイル | 内容 |
|---|---|
| `src/domain/types.ts` | `Agent`、`Step`、`Change`、`WorldEvent` |
| `src/content/scenario.ts` | 主人公の設定、道のり、名前の対応表（`namesOf`） |
| `src/adventure.ts` | `runAdventure`（第1章で `src/sim/` に移す） |
| `src/narration/format.ts` | `formatEvent`、`formatLog` |
| `src/main.ts` | 冒険を実行して表示する |
| `tests/adventure.test.ts` | 既定のテスト |
| `tests/exercises/rest.test.ts` | 演習「休む」のテスト |

演習「休む」の解答は、`runAdventure` の `rest` の分岐と、`formatEvent` の `rest` の文です。
