# 第1章：戦闘する冒険者（完成版）

攻撃・防御・逃走を選ぶ1対1の戦闘シミュレータです。主人公の方策（policy）とシードを引数で切り替えられます。

## 1. 起動

```sh
npm ci
npm start                                   # シード42、方策 cautious
npm start -- --seed 7 --policy coward       # シードと方策を変える
npm start -- --mode adventure               # 序章の冒険
```

方策は `aggressive`（いつも攻撃）、`cautious`（HPが30%以下なら防御）、`coward`（いつも逃げる）、`retreatAtHalf`（HPが半分以下なら逃げる。演習）から選べます。敵はいつも `aggressive` です。同じシードと方策なら、常に同じログになります。

## 2. 期待される出力

`npm start`：

<!-- output -->
```text
# seed: 42 / policy: cautious / 敵の方策: aggressive
アリア（HP 20）の前に、灰色オオカミ（HP 14）が立ちはだかった！
[1] 灰色オオカミの攻撃！ アリアに3のダメージ。（HP 20→17）
[2] アリアの攻撃！ 灰色オオカミに5のダメージ。（HP 14→9）
[3] 灰色オオカミの攻撃！ アリアに4のダメージ。（HP 17→13）
[4] アリアの攻撃！ 灰色オオカミに6のダメージ。（HP 9→3）
[5] 灰色オオカミの攻撃！ アリアに2のダメージ。（HP 13→11）
[6] アリアの攻撃！ 灰色オオカミに3のダメージ。（HP 3→0）
[6] 灰色オオカミは倒れた。
== 戦闘終了：勝利 ==
アリア HP 11/20　灰色オオカミ HP 0/14
```
<!-- /output -->

`npm start -- --mode adventure`：

<!-- output:adventure args="--mode adventure" -->
```text
[1] リナは村を出発した。（HP 12）
[2] リナは森へ移動した。
[3] リナはスライムに遭遇した！ HP 12→9
[4] リナは洞窟の入口へ移動した。
[5] リナは大コウモリに遭遇した！ HP 9→5
```
<!-- /output -->

`npm start -- --seed 3 --policy retreatAtHalf`（演習の方策。シード42ではHPが半分以下にならず違いが出ないので、シード3を使う）：

<!-- output:retreat args="--seed 3 --policy retreatAtHalf" -->
```text
# seed: 3 / policy: retreatAtHalf / 敵の方策: aggressive
アリア（HP 20）の前に、灰色オオカミ（HP 14）が立ちはだかった！
[1] 灰色オオカミの攻撃！ アリアに4のダメージ。（HP 20→16）
[2] アリアの攻撃！ 灰色オオカミに4のダメージ。（HP 14→10）
[3] 灰色オオカミの攻撃！ アリアに3のダメージ。（HP 16→13）
[4] アリアの攻撃！ 灰色オオカミに4のダメージ。（HP 10→6）
[5] 灰色オオカミの攻撃！ アリアに4のダメージ。（HP 13→9）
[6] アリアの攻撃！ 灰色オオカミに5のダメージ。（HP 6→1）
[7] 灰色オオカミの攻撃！ アリアに3のダメージ。（HP 9→6）
[8] アリアは灰色オオカミに背を向けて駆け出した……逃げ切った！
== 戦闘終了：逃走 ==
アリア HP 6/20　灰色オオカミ HP 1/14
```
<!-- /output -->

## 3. テスト

```sh
npm test                # 既定のテスト（演習用テストを含む）
npm run test:exercises  # 演習用テストだけを実行
npm run check           # 型チェック → テスト
```

単体テストでは、決めた値を順に返す `fixedRng`（`tests/helpers/fixedRng.ts`）を使います。シード42の戦闘は、スナップショット（`tests/__snapshots__/`）と比べます。

## 4. 前章からの変更点

| 記号 | ファイル | 内容 |
|---|---|---|
| + | `src/lib/rng.ts` | `createRng`（mulberry32）、`Rng`、`RngState` |
| ~ | `src/domain/types.ts` | `CombatParams`、`Agent.kind`・`state`、`WorldState`、`BattleAction`、`Policy`、`Outcome`、イベントの `battleEnd`・`outcome` |
| + | `src/rules/combat.ts` | `damageOf`、`fleeChance`、`resolveRound` |
| + | `src/sim/battle.ts` | `runBattle` |
| + | `src/sim/policies.ts` | `aggressive`、`cautious`、`coward`、`retreatAtHalf`（演習） |
| + | `src/content/battle.ts` | アリアと灰色オオカミ、`battleWorld` |
| ~ | `src/content/scenario.ts` | 主人公に戦闘用のパラメータを追加 |
| ~ | `src/narration/format.ts` | 戦闘の出来事の文 |
| ~ | `src/main.ts` | `--mode`、`--seed`、`--policy` |
| > | `src/adventure.ts` → `src/sim/adventure.ts` | 倒れたときに `state` を `down` にする |
| + | `tests/rng.test.ts`、`tests/combat.test.ts`、`tests/battle.test.ts`、`tests/policies.test.ts`、`tests/helpers/fixedRng.ts` | 既定のテスト |
| + | `tests/exercises/policy.test.ts` | 演習「HPが半分以下なら逃げる」のテスト |
| ~ | `tests/adventure.test.ts` | 序章の演習「休む」のテストを既定のテストに移した |

記号：+ 追加 / ~ 変更 / > 移動

演習の解答は `src/sim/policies.ts` の `retreatAtHalf` です。
