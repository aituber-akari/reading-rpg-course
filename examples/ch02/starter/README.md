# 第2章：障害を乗り越える（演習用）

同じ崖の前で、人物の技能・持ち物と環境の違いによって、使える行為（アフォーダンス）が変わることを一覧で示すCLIです。行為を1つ実行するたびに、新しいアフォーダンスが現れたり消えたりする様子も示します。

## 1. 起動

```sh
npm ci
npm start                                           # 崖の前のアフォーダンス（第2章）
npm start -- --mode battle --seed 7 --policy coward # 第1章の戦闘
npm start -- --mode adventure                       # 序章の冒険
```

第2章は乱数を使いません。使える行為は `ActionId` の辞書順に並べます。

## 2. 期待される出力

<!-- output -->
```text
# seed: - / catalog: cliff@0.1
== 崖下（通常） ==
アリア（登攀3）      : 崖を直接よじ登る[体力9] / 蔦をつたって岩棚へ[体力3]
ボルド（登攀1・鉤縄）: 蔦をつたって岩棚へ[体力3] / 鉤縄を岩の突起に掛ける[体力1]
セナ（浮遊1）        : 浮遊の魔法で崖上へ[魔力4]
  ボルドには使えない：「崖を直接よじ登る」（登攀Lv3以上が必要）
  セナには使えない：「崖を直接よじ登る」（登攀Lv3以上が必要） / 「蔦をつたって岩棚へ」（登攀Lv1以上が必要）
== 崖下（嵐で蔦が切れた） ==
アリア（登攀3）      : 崖を直接よじ登る[体力9]
ボルド（登攀1・鉤縄）: 鉤縄を岩の突起に掛ける[体力1]
セナ（浮遊1）        : 浮遊の魔法で崖上へ[魔力4]
  ボルドには使えない：「崖を直接よじ登る」（登攀Lv3以上が必要）
  セナには使えない：「崖を直接よじ登る」（登攀Lv3以上が必要）
== 崖下（岩の突起が崩れた） ==
アリア（登攀3）      : 崖を直接よじ登る[体力9] / 蔦をつたって岩棚へ[体力3]
ボルド（登攀1・鉤縄）: 蔦をつたって岩棚へ[体力3]
セナ（浮遊1）        : 浮遊の魔法で崖上へ[魔力4]
  ボルドには使えない：「崖を直接よじ登る」（登攀Lv3以上が必要）
  セナには使えない：「崖を直接よじ登る」（登攀Lv3以上が必要） / 「蔦をつたって岩棚へ」（登攀Lv1以上が必要）

-- ボルドが鉤縄を岩の突起に掛ける --
[1] ボルドは鉤縄を投げ、岩の突起に掛けた。（体力 20→19 / 鉤縄：巻かれている→掛かっている）
  アリア（崖下）：崖を直接よじ登る / 鉤縄を登る（新しく現れた） / 蔦をつたって岩棚へ
  ボルド（崖下）：鉤縄を登る（新しく現れた） / 蔦をつたって岩棚へ　（消えた：鉤縄を岩の突起に掛ける）
  セナ（崖下）：浮遊の魔法で崖上へ

-- アリアが蔦をつたって岩棚へ --
[2] アリアは蔦をつたって岩棚へ登った。（体力 20→17 / 蔦の強度 2→1）
  アリア（岩棚）：岩棚から崖上へ（新しく現れた）　（消えた：崖を直接よじ登る / 鉤縄を登る / 蔦をつたって岩棚へ）
  ボルド（崖下）：鉤縄を登る / 蔦をつたって岩棚へ
  セナ（崖下）：浮遊の魔法で崖上へ

-- ボルドが蔦をつたって岩棚へ --
[3] ボルドは蔦をつたって岩棚へ登った。（体力 19→16 / 蔦の強度 1→0 / 蔦：無傷→切れた）
  アリア（岩棚）：岩棚から崖上へ
  ボルド（岩棚）：（できることがない）　（消えた：鉤縄を登る / 蔦をつたって岩棚へ）
  セナ（崖下）：浮遊の魔法で崖上へ
```
<!-- /output -->

## 3. テスト

```sh
npm test                # 既定のテスト（starter でも通る）
npm run test:exercises  # 演習用テストだけを実行
npm run check           # 型チェック → テスト
```

`tests/architecture.test.ts` は、`src/` の `import` を読み、モジュールの依存の規則（`domain` ← `rules` ← `sim` など）に反していないかを確かめます。

## 4. 前章からの変更点

| 記号 | ファイル | 内容 |
|---|---|---|
| ~ | `src/domain/types.ts` | affordance-model.md 4.2 の [ch02] までの型（`Params`、`Significance`、`WorldObject`、`Place`、`Scene`、`CapabilityDef`、`Condition`、`Effect`、`Cost`、`ActionDef`、`Affordance`、`ActionCheck`、`Catalog`、`Change.via`） |
| + | `src/domain/entities.ts` | `getEntity`、`getAgent`、`getObject`、`getPlace`、`paramLabel` |
| + | `src/rules/params.ts` | `param`（未定義は0） |
| + | `src/rules/refs.ts` | `RuleContext`、`resolveRef` |
| + | `src/rules/conditions.ts` | `evaluate`、`describeCondition` |
| + | `src/rules/effects.ts` | `applyEffects` |
| + | `src/rules/transitions.ts` | `applyTransitions` |
| + | `src/rules/affordances.ts` | `checkAction`、`availableAffordances`、`sceneOf`、`costConditions`、`costEffects` |
| + | `src/rules/apply.ts` | `applyAction` |
| ~ | `src/rules/combat.ts`、`src/sim/policies.ts`、`src/sim/adventure.ts` | パラメータを `param()` で読む。`Change` に `via` を付ける |
| + | `src/content/cliff.ts` | 崖のカタログ、人物3人、環境の3パターン（`cliffWorld`）、叙述用の表示名 |
| ~ | `src/content/battle.ts`、`src/content/scenario.ts` | 人物に `capabilities` を追加 |
| ~ | `src/narration/format.ts` | `formatAffordances`、`formatAffordanceDiff`、`formatActionEvent`（変化 before→after を含む） |
| + | `src/ui/cliff.ts` | `--mode cliff` の表示を組み立てる `cliffReport` |
| ~ | `src/main.ts` | `--mode cliff`（既定）/ `battle` / `adventure` |
| + | `tests/conditions.test.ts`、`effects.test.ts`、`transitions.test.ts`、`affordances.test.ts`、`apply.test.ts`、`serialization.test.ts`、`architecture.test.ts` | 既定のテスト |
| + | `tests/exercises/jump.test.ts` | 演習「跳躍」のテスト |
| ~ | `tests/combat.test.ts`、`tests/adventure.test.ts`、スナップショット | 型の一般化と `Change.via` に合わせた |

記号：+ 追加 / ~ 変更

## 5. 演習

| 演習 | 編集するところ | 合格の基準 |
|---|---|---|
| 跳躍の能力と行為を追加する | `src/content/cliff.ts` の2か所の `TODO` | `tests/exercises/jump.test.ts` が通る |

`jump:ledge`：崖下から岩棚へ跳び上がる行為。前提条件は「崖下にいる」「跳躍Lv2以上」、効果は「行為者を岩棚へ移す」、コストは体力2です。規則（`src/rules/`）は変更しません。
