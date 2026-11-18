# 第3章：機転を利かせる（完成版）

同じ目標（崖上に着く）に対して、BFS・ダイクストラ法・A*（重みつきを含む）を切り替え、得られる計画・コスト・展開ノード数を比べるCLIです。解決経路の一覧と、選んだ計画を実行したログも出します。資源配分の別演習として、動的計画法（DP）による体力・魔力の配分も扱います。

## 1. 起動

```sh
npm ci
npm start                                      # 崖の谷の計画（--algo dijkstra）
npm start -- --algo bfs                        # 実行する計画の探索法を変える（bfs / dijkstra / astar / all）
npm start -- --algo astar --weight 3           # 重みつき A*
npm start -- --climb 2 --stamina 10            # アリアの登攀Lvと体力を変える
npm start -- --mode dp                         # DP による資源配分
npm start -- --mode cliff                      # 第2章：崖の前のアフォーダンス
npm start -- --mode battle --seed 7            # 第1章：戦闘
npm start -- --mode adventure                  # 序章：冒険
```

比較表には、BFS・ダイクストラ法・A*（重み1）・A*（重み3）の4つを常に表示します。`--weight` は、比較表の重みつき A* の重み（既定3）と、`--algo astar` で実行する A* の重み（既定1）を指定します。

第3章は乱数を使いません。同じ入力からは常に同じ計画になります。再現性は、後続の順序（`ActionId` の辞書順）と、探索の同点処理を固定することで保証します。ログの1行目のシードの欄は `-` です。

## 2. 期待される出力

`npm start`：

<!-- output -->
```text
# seed: - / algo: dijkstra / catalog: cliff-valley@0.1
# アリア：登攀3・体力20 / 目標：崖上に着く

== 探索法の比較 ==
探索法          手数  体力  展開  計画
BFS                3    11     9  村→分かれ道→崖下→崖を直接よじ登る
ダイクストラ法     7     7    18  村→分かれ道→崖下→物置小屋→鉤縄を拾う→崖下→鉤縄を岩の突起に掛ける→鉤縄を登る
A*（重み1）        7     7    11  村→分かれ道→崖下→物置小屋→鉤縄を拾う→崖下→鉤縄を岩の突起に掛ける→鉤縄を登る
A*（重み3）        4     8     4  村→分かれ道→崖下→蔦をつたって岩棚へ→岩棚から崖上へ

== 解決経路（体力20以内、包含について極小なもの） ==
{anchor, cap:climb, rope}   岩の突起・登攀・鉤縄  体力7・7手
{cap:climb, vine}           登攀・蔦              体力8・4手
{cap:climb, cliff}          登攀・崖              体力11・3手

== 実行（ダイクストラ法） ==
[0] アリアはじっくり考えた。鉤縄を使えば、少ない体力で崖上に行けそうだ。（候補3通り・7手・体力7）
[1] アリアは村から分かれ道へ歩いた。（体力 20→19）
[2] アリアは分かれ道から崖下へ歩いた。（体力 19→18）
[3] アリアは崖下から物置小屋へ歩いた。（体力 18→17）
[4] アリアは物置小屋の壁から鉤縄を外し、肩に掛けた。（体力 17→16）
[5] アリアは物置小屋から崖下へ歩いた。（体力 16→15）
[6] アリアは鉤縄を投げ、岩の突起に掛けた。（体力 15→14 / 鉤縄：巻かれている→掛かっている）
[7] アリアは鉤縄を登り、崖上に着いた。（体力 14→13）
アリアは崖上に立った。（残りの体力 13）
```
<!-- /output -->

`npm start -- --mode dp`：

<!-- output:dp args="--mode dp" -->
```text
# seed: - / mode: dp

== 山道の障害と越え方（体力, 魔力, 時間） ==
崖      : 登る (4, 0, 3) / 浮遊 (0, 3, 1) / 遠回り (1, 0, 6)
急流    : 泳ぐ (5, 0, 2) / 凍結の魔法 (0, 4, 1) / 浅瀬を探す (2, 0, 5)
茨の壁  : 切り開く (3, 0, 2) / 炎の魔法 (0, 2, 1) / 迂回 (1, 0, 4)

== 予算ごとの配分（DP と貪欲法） ==
予算（体力7, 魔力4）
  DP    : 登る・凍結の魔法・切り開く    時間6（部分問題10個）
  貪欲法: 浮遊・泳ぐ・迂回              時間7  ← 先に魔力を使い切り、後で遅い手しか残らない
予算（体力8, 魔力5）
  DP    : 浮遊・泳ぐ・炎の魔法          時間4（部分問題10個）
  貪欲法: 浮遊・泳ぐ・炎の魔法          時間4
予算（体力3, 魔力2）
  DP    : 遠回り・浅瀬を探す・炎の魔法  時間12（部分問題3個）
  貪欲法: 遠回り・浅瀬を探す・炎の魔法  時間12
予算（体力0, 魔力9）
  DP    : 浮遊・凍結の魔法・炎の魔法    時間3（部分問題3個）
  貪欲法: 浮遊・凍結の魔法・炎の魔法    時間3
予算（体力2, 魔力1）
  DP    : 越えられない
  貪欲法: 越えられない
```
<!-- /output -->

`npm start -- --algo bfs --stamina 10`（体力が10しかないとき。BFS は直接登る経路を選べない）：

<!-- output:bfs-stamina10 args="--algo bfs --stamina 10" -->
```text
# seed: - / algo: bfs / catalog: cliff-valley@0.1
# アリア：登攀3・体力10 / 目標：崖上に着く

== 探索法の比較 ==
探索法          手数  体力  展開  計画
BFS                4     8    14  村→分かれ道→崖下→蔦をつたって岩棚へ→岩棚から崖上へ
ダイクストラ法     7     7    18  村→分かれ道→崖下→物置小屋→鉤縄を拾う→崖下→鉤縄を岩の突起に掛ける→鉤縄を登る
A*（重み1）        7     7    11  村→分かれ道→崖下→物置小屋→鉤縄を拾う→崖下→鉤縄を岩の突起に掛ける→鉤縄を登る
A*（重み3）        4     8     4  村→分かれ道→崖下→蔦をつたって岩棚へ→岩棚から崖上へ

== 解決経路（体力10以内、包含について極小なもの） ==
{anchor, cap:climb, rope}   岩の突起・登攀・鉤縄  体力7・7手
{cap:climb, vine}           登攀・蔦              体力8・4手

== 実行（BFS） ==
[0] アリアは考えた。蔦を使えば、少ない手数で崖上に行けそうだ。（候補2通り・4手・体力8）
[1] アリアは村から分かれ道へ歩いた。（体力 10→9）
[2] アリアは分かれ道から崖下へ歩いた。（体力 9→8）
[3] アリアは蔦をつたって岩棚へ登った。（体力 8→5 / 蔦の強度 2→1）
[4] アリアは岩棚から崖上へ這い上がった。（体力 5→2）
アリアは崖上に立った。（残りの体力 2）
```
<!-- /output -->

## 3. テスト

```sh
npm test                # 既定のテスト（演習用テストを含む）
npm run test:exercises  # 演習用テストだけを実行
npm run check           # 型チェック → テスト
```

展開ノード数は、`tests/__snapshots__/worldProblem.test.ts.snap`（BFS・ダイクストラ法）と `tests/exercises/__snapshots__/astar.test.ts.snap`（A*）に記録しています。

## 4. 前章からの変更点

| 記号 | ファイル | 内容 |
|---|---|---|
| + | `src/lib/stableStringify.ts` | `stableStringify`（キーを辞書順に並べた JSON） |
| ~ | `src/domain/types.ts` | `Goal`、`DecisionRecord`、`EventType` の `plan`、`WorldEvent.decision`、`AllocOption`、`Obstacle` |
| + | `src/planner/search/types.ts` | `SearchProblem`、`Successor`、`SearchResult`、`SearchNode`、`resultOf` |
| + | `src/planner/search/bfs.ts` | `bfs` |
| + | `src/planner/search/dijkstra.ts` | `dijkstra` |
| + | `src/planner/search/astar.ts` | `astar`（演習2） |
| + | `src/planner/worldProblem.ts` | `makeWorldProblem`、`stateKey`、`weightedCost`、`goalReached` |
| + | `src/planner/heuristics.ts` | `manhattanToPlace` |
| + | `src/planner/allocate.ts` | `allocate`（DP）、`greedyAllocate`（貪欲法） |
| + | `src/analysis/routes.ts` | `routeSignature`、`listRoutes` |
| + | `src/sim/executePlan.ts` | `executePlan` |
| + | `src/content/cliffValley.ts` | 崖の谷の地図・行為（`walkActions` で移動を生成）、`cliffValleyWorld`、`reachTop`、叙述用の表示名。`cast:levitate` は演習1 |
| + | `src/content/obstacleCourse.ts` | DP 演習の障害と予算 |
| ~ | `src/narration/format.ts` | `formatPlanEvent`、`formatPlanLog`、`padStartDisplay` |
| + | `src/ui/plan.ts`、`src/ui/dp.ts` | `--mode plan`・`--mode dp` の表示を組み立てる |
| ~ | `src/main.ts` | `--mode plan`（既定）/ `dp` / `cliff` / `battle` / `adventure`、`--algo`、`--weight`、`--climb`、`--stamina` |
| + | `tests/search.bfs.test.ts`、`search.dijkstra.test.ts`、`search.astar.test.ts`（solution のみ）、`worldProblem.test.ts`、`heuristics.test.ts`、`routes.test.ts`、`allocate.test.ts`、`executePlan.test.ts`、`tests/helpers/graph.ts`、`tests/helpers/valley.ts` | 既定のテスト |
| + | `tests/exercises/levitate-route.test.ts`、`tests/exercises/astar.test.ts` | 演習1・演習2のテスト |
| > | `tests/exercises/jump.test.ts` → `tests/jump.test.ts` | 第2章の演習を既定のテストに移した |
| ~ | `tests/architecture.test.ts` | `planner`・`planner/search`・`analysis` の依存の規則を追加 |

記号：+ 追加 / ~ 変更 / > 移動

演習の解答は、`src/content/cliffValley.ts` の能力 `levitate` と行為 `cast:levitate`（演習1）、`src/planner/search/astar.ts` の `astar`（演習2）です。
