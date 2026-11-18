# アーキテクチャ設計書（リポジトリと章の構成）

- 文書種別：設計文書
- 版：0.1（教材MVP・縦切り試作用：トップページ＋序章〜第3章）
- 前提文書：`docs/spec.md`、`docs/design/affordance-model.md`

## 1. 方針の要約

| 論点 | 決定 |
|---|---|
| 章ごとのコード | `examples/chXX/{starter,solution}` は、それぞれ単独で `npm ci`・`npm start`・`npm test` できる独立したnpmプロジェクトにする。章どうしのコードの重複は意図したものとする（仕様書8章）。 |
| 実行形態（序章〜第12章） | Node.js上のCLI（`tsx` で実行）とする。ブラウザUIは第13章から導入する。理由は5.4節。 |
| 言語設定 | TypeScriptの `strict` を有効にし、`noUncheckedIndexedAccess` も有効にする。 |
| テスト | Vitest。演習用テストは `tests/exercises/` に分け、starterでは既定の実行から外す。 |
| モジュール境界 | `domain` ← `rules` ← `planner` ← `sim` ← `ui(main)` の一方向の依存とする。`narration` と `analysis` は横に置く。依存の規則はテストで機械的に確かめる。 |
| 教材サイト | 手書きの静的HTML（ビルドなし）とする。コード片と出力例は、完成版コードからスクリプトで同期する。 |
| CI | GitHub Actionsで、章のプロジェクトごとに型チェックとテストを並列に実行する。サイトはGitHub Pagesに配置する。 |

## 2. リポジトリ構成

仕様書8.3の案をもとに、`docs/`・`scripts/`・`.github/` を加える。

```text
reading-rpg-course/
├── index.html                    # 教材トップページ
├── parts/                        # 各部の概要HTML（part1.html〜part4.html）
├── chapters/                     # ch00.html〜ch16.html
├── assets/
│   ├── course.css                # 教材共通のスタイル
│   ├── course.js                 # 目次・コピー用ボタンなど最小限のJS
│   └── img/                      # 図（必要になったら）
├── references/                   # 最小文法・用語・コマンド集（HTML）
├── examples/
│   ├── ch00/{starter,solution}/  # 各ディレクトリが独立したnpmプロジェクト
│   ├── ch01/{starter,solution}/
│   ├── ch02/{starter,solution}/
│   └── ch03/{starter,solution}/  # 今回の試作範囲はここまで。ch04〜ch16は同じ形で追加する
├── docs/
│   ├── spec.md                   # 仕様書（公開しない）
│   └── design/                   # 設計文書（公開しない）
├── scripts/                      # 依存パッケージなしで動くNodeスクリプト（.mjs）
│   ├── list-examples.mjs         # examples/*/* を列挙（CIのmatrix用）
│   ├── each-example.mjs          # 全プロジェクトで同じコマンドを実行
│   ├── check-exercises.mjs       # 演習用テストがstarterとsolutionで一致するか
│   ├── check-deps.mjs            # 全プロジェクトの devDependencies の版がそろっているか
│   ├── sync-snippets.mjs         # HTML内のコード片・出力例を完成版から同期（--check で差分検出）
│   └── build-site.mjs            # 公開用の _site/ を組み立てる
├── .github/workflows/
│   ├── ci.yml                    # 型チェック・テスト・整合性チェック
│   └── pages.yml                 # GitHub Pages への配置
├── package.json                  # ルート：依存なし、scripts のみ
├── .nvmrc                        # 24
├── .editorconfig
├── .gitignore                    # node_modules/, _site/, coverage/
└── README.md
```

### 2.1 ルートの `package.json`

ルートは依存パッケージを持たず、`node` だけで動くスクリプトを呼ぶ。npm workspacesは使わない（9.1節の判断A）。

```json
{
  "name": "reading-rpg-course",
  "private": true,
  "type": "module",
  "scripts": {
    "check:all": "node scripts/each-example.mjs \"npm ci\" \"npm run check\"",
    "check:exercises": "node scripts/check-exercises.mjs",
    "check:deps": "node scripts/check-deps.mjs",
    "check:snippets": "node scripts/sync-snippets.mjs --check",
    "sync:snippets": "node scripts/sync-snippets.mjs",
    "build:site": "node scripts/build-site.mjs"
  }
}
```

リポジトリ全体を確かめるときは、ルートで次を実行する。

```sh
npm run check:all        # 全章の starter / solution で npm ci → 型チェック → テスト
npm run check:exercises  # 演習用テストの一致
npm run check:deps       # 依存パッケージの版のそろい
```

## 3. 各章プロジェクトの構成

### 3.1 共通のファイル

```text
examples/chXX/{starter|solution}/
├── package.json
├── package-lock.json             # 必ずコミットする（npm ci で再現するため）
├── tsconfig.json
├── vitest.config.ts              # 既定のテスト（tests/**、exercises を除く）
├── vitest.exercises.config.ts    # 演習用テストだけを実行
├── README.md                     # 起動方法、期待される出力、前章からの変更点
├── src/
│   ├── main.ts                   # CLIの入口（UI層）
│   └── ...                       # 4章で定めるモジュール
└── tests/
    ├── *.test.ts                 # 既定のテスト（starter でも通る）
    └── exercises/*.test.ts       # 演習用テスト（starter では演習を解くまで失敗する）
```

`package.json`（starter・solution 共通の形）：

```json
{
  "name": "reading-rpg-ch02-solution",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "start": "tsx src/main.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:exercises": "vitest run --config vitest.exercises.config.ts",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm test"
  },
  "devDependencies": {
    "@types/node": "(実装時点の版)",
    "tsx": "(実装時点の版)",
    "typescript": "(実装時点の版)",
    "vitest": "(実装時点の版)"
  }
}
```

- 依存パッケージの版は、この文書では決めない。実装を始める時点の安定版を `npm install -D` で入れ、`package-lock.json` で固定する。全章で同じ版を使い、`scripts/check-deps.mjs` で確かめる。
- `solution` の `vitest.config.ts` は `tests/**/*.test.ts` をすべて含める（演習用テストも含む）。`starter` の `vitest.config.ts` は `tests/exercises/**` を除外する。
- 演習用テストの除外には、設定ファイルを2つ使う。環境変数やCLIの除外オプションは使わない。環境変数はWindowsで書き方が変わり、CLIオプションはVitestの版によって挙動が変わる可能性があるためである。

`tsconfig.json`（全章共通。第13章で `lib` に `DOM` を加える）：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "*.config.ts"]
}
```

- `lib` に `DOM` を入れない。ドメインのコードが誤ってブラウザのAPIに依存することを、型チェックの段階で防ぐ。`console` の型は `@types/node` から得る。
- `import` には拡張子を付けない（`moduleResolution: "Bundler"` のため）。`tsx`・Vitest・第13章のViteのいずれでも、同じ書き方で動く。

### 3.2 starterとsolutionの関係

| 項目 | starter | solution |
|---|---|---|
| 出発点 | 前章のsolutionをコピーし、今回の章の雛形（型、関数の宣言、`TODO`）を加えたもの | 今回の章の課題をすべて実装したもの |
| `npm start` | 動く（未実装の部分は「未実装」と表示する） | 期待される出力を出す |
| `npm test` | 通る | 通る |
| `npm run test:exercises` | 演習を解くまで失敗する | 通る |
| `tests/exercises/` | solution と**同一の内容** | starter と同一の内容 |
| 演習の解答に依存する既定のテスト | 置かない（例：第3章の `tests/search.astar.test.ts`） | 置く |

`scripts/check-exercises.mjs` は、各章の `starter/tests/exercises/*.test.ts` が `solution/tests/exercises/` に同じ内容で存在することを確かめる。starterに渡した演習用テストにsolutionが合格することは、solutionの `npm test` で保証される。

### 3.3 READMEに書くこと（各プロジェクト）

1. 起動：`npm ci` → `npm start`（シードなどの引数の例）
2. 期待される出力（教材ページと同じもの。`sync-snippets` の同期元になる）
3. テスト：`npm test`、`npm run test:exercises`
4. 前章からの変更点：追加・変更したファイルと関数の一覧（仕様書8.2-4）

## 4. モジュール境界と依存方向

### 4.1 モジュールの一覧

| モジュール | 責務 | 依存してよい先 | 導入章 |
|---|---|---|---|
| `domain/` | 型定義と、型に付随する小さな純粋関数（ID、補助的な型ガード） | なし | ch00 |
| `lib/` | 汎用の道具（乱数 `rng`、`stableStringify`） | なし | ch01 |
| `content/` | 作品データ（人物・物・場所・行為の定義、シナリオ）。データだけを置く | `domain` | ch00 |
| `rules/` | 規則の評価器（条件、効果、遷移、アフォーダンスの列挙、行為の適用、第1章の戦闘規則） | `domain`, `lib` | ch01 |
| `planner/search/` | 汎用の探索（BFS、ダイクストラ法、A*）。`SearchProblem<S>` だけを知る | `planner/search` 内のみ | ch03 |
| `planner/`（それ以外） | 世界状態を探索問題に変換する部分、ヒューリスティック、DPによる資源配分 | `domain`, `lib`, `rules`, `planner/search` | ch03 |
| `analysis/` | 研究用の指標（経路の識別子、解決経路の数など） | `domain`, `lib`, `rules`, `planner` | ch03 |
| `sim/` | 時間を進め、行為を実行し、イベント列を作る（戦闘の進行、計画の実行） | `domain`, `lib`, `rules`, `planner` | ch01 |
| `narration/` | イベントを日本語の文に変換する | `domain`, `lib` | ch00 |
| `mind/` | 人物の意思決定（方策、有限状態機械、記憶） | `domain`, `lib`, `rules`, `planner` | ch05 |
| `worldgen/` | 世界の生成 | `domain`, `lib`, `content` | ch09 |
| `history/` | 歴史の索引と検索 | `domain`, `lib` | ch12 |
| `persistence/` | 保存データの変換・検証・移行（`localStorage` には触れない） | `domain`, `lib` | ch14 |
| `ui/`・`main.ts` | 入出力（CLI、第13章からWeb）。各モジュールを組み立てる | すべて | ch00 |

序章では `domain/`・`content/`・`narration/` の役割を、少数のファイルで先取りする（6.1節）。フォルダの形は第1章からそろえる。

### 4.2 依存方向

```text
                 ui / main.ts
                      │
        ┌─────────────┼───────────────┬──────────────┐
        ▼             ▼               ▼              ▼
       sim ──────► planner ───► planner/search    narration
        │             │                              │
        ├──► analysis ┤                              │
        ▼             ▼                              │
      rules ◄─────────┘                              │
        │                                            │
        ▼                                            ▼
      domain ◄──────── content                     domain
        ▲
       lib（どこからでも使ってよい。lib 自身は何にも依存しない）
```

規則：

1. **循環を禁止する。**
2. **下位から上位への依存を禁止する。** 例：`rules` は `planner` や `sim` を読み込まない。
3. **`narration` は `rules`・`planner`・`sim` に依存しない。** 叙述はイベントとカタログ（ラベル）だけから作る。叙述を差し替えても、シミュレーションの結果は変わらない。
4. **`planner/search` は世界のことを知らない。** 汎用のインタフェース `SearchProblem<S>` だけに依存する。探索法の差し替えと、探索法の単体テストを、世界のモデルと切り離して行えるようにするためである（仕様書6.1「探索法だけを差し替えられる構造」）。
5. **Node固有のAPI（`node:` で始まるモジュール、`process`）は `main.ts` と `ui/` でだけ使う。** テストのコードは例外とする。
6. **`Math.random` を使わない。** 乱数は必ず `lib/rng` を通す。

### 4.3 依存規則の確かめ方

第2章から、各プロジェクトに `tests/architecture.test.ts` を置く。`src/` 以下のファイルを読み、`import` の指定子を正規表現で取り出し、上の規則に反するものがあれば失敗させる。ESLintなどの追加の道具は使わない。テストとして書くことで、学習者が規則を読める形で手元に置ける。

```ts
// tests/architecture.test.ts（考え方）
const allowed: Record<string, string[]> = {
  domain: [],
  lib: [],
  content: ['domain'],
  rules: ['domain', 'lib'],
  'planner/search': ['planner/search'],
  planner: ['domain', 'lib', 'rules', 'planner/search', 'planner'],
  analysis: ['domain', 'lib', 'rules', 'planner', 'planner/search'],
  sim: ['domain', 'lib', 'rules', 'planner', 'planner/search'],
  narration: ['domain', 'lib'],
};
// 各ファイルについて：属するモジュールを求め、相対 import の行き先が allowed に入っているかを確かめる。
// あわせて src/ 全体で 'Math.random' と、main.ts 以外での 'node:' の出現を禁止する。
```

## 5. パッケージとツールの方針

### 5.1 TypeScript

- `strict` と `noUncheckedIndexedAccess` を全章で有効にする。`Record<string, number>` のパラメータを読むと `number | undefined` になるので、第2章で `param(e, key)`（未定義は0）を導入し、この不便さを「規則を1か所に集める理由」として教材に使う。
- 序章では、`noUncheckedIndexedAccess` の影響を受けないように、配列は `for...of` で読み、オブジェクトは具体的な型（`{ hp: number }`）で書く。
- 型は `interface` と `type` を使い分ける（オブジェクトの形は `interface`、共用体は `type`）。クラスは使わない。データがJSONに変換できる形のまま保たれるようにするためである。

### 5.2 テスト（Vitest）

- `describe` / `it` / `expect` は明示的に `import` する（グローバルにしない）。どこから来た関数かを学習者が追えるようにするためである。
- テストの名前は Given/When/Then の形の日本語で書く。例：`it('登攀Lv1でロープを持つとき、崖下では「鉤縄を掛ける」が使える')`。
- 乱数を使うテストでは、固定の値を順に返す `fixedRng([0.5, 0.3])` を使う。シードによる統合テストには、スナップショット（`toMatchSnapshot`）を使う。スナップショットファイルもコミットする。

### 5.3 実行（tsx）

- `npm start` は `tsx src/main.ts` を実行する。引数は `npm start -- --seed 42 --algo astar` のように渡す。
- 引数の解析には `node:util` の `parseArgs` を使い、追加のパッケージは入れない。

### 5.4 序章〜第3章はCLIか、ブラウザか

**判断：序章〜第12章はNodeのCLIで動かす。ブラウザUIは第13章で導入する。**

| 観点 | 案A：CLI（採用） | 案B：最初からVite＋ブラウザ |
|---|---|---|
| 最初に覚えること | TypeScript、`npm`、`tsx` | 加えてHTML、DOM、Vite、開発サーバ |
| 出力 | ログ（テキスト）をそのまま表示する。題材そのものがログである | `<pre>` への書き出しが必要。見た目に手が回りがち |
| テスト | 実行とテストが同じNode環境で動く | 画面の確認は手作業になりがち |
| 引数の切り替え | `--seed`、`--algo` で簡単に切り替えられる | フォームなどのUIを作る必要がある |
| 仕様書との関係 | 開発対象はブラウザアプリなので、第13章で必ずWeb化する | 最初からブラウザで動く |
| ローカル環境がない学習者 | ブラウザ上でNodeを動かせる開発環境なら動く（サービス名は制作時に確認） | 静的ホスティングでも動く |

選定理由：第1〜3部の学習の中心は、データ構造とアルゴリズムと、ログを読むことにある。ブラウザの仕組みを同時に学ぶと負荷が大きく、題材にも合わない。ブラウザで動かす利点は、第13章で同じドメインのコードを再利用して得る。そのために、次の制約を序章から守る。

- ドメイン側（`main.ts` と `ui/` 以外）は、Node固有のAPIにもDOMにも依存しない（4.2節の規則5、`lib` から `DOM` を外した `tsconfig`）。
- 出力は「イベント列 → 文字列の配列」という純粋関数で作る。`console.log` を呼ぶのは `main.ts` だけにする。

**影響範囲とロールバック**：第13章より前にブラウザで動かしたくなった場合でも、`ui/web/` を追加し、`main.ts` と同じ組み立てを行えばよい。ドメイン側の変更は不要である。

### 5.5 乱数（`lib/rng`）

```ts
export interface RngState { seed: number; s: number }
export interface Rng {
  next(): number;                         // [0, 1)
  int(min: number, max: number): number;  // min 以上 max 以下の整数 = min + floor(next() * (max - min + 1))
  snapshot(): RngState;                   // 保存用（第14章）
}
export function createRng(seed: number): Rng;            // mulberry32
export function restoreRng(state: RngState): Rng;        // 第14章
```

- アルゴリズムはmulberry32に固定し、コードは第1章のstarterで完成した形で渡す（演習の対象にしない）。アルゴリズムを変えると、すべてのスナップショットが変わるためである。
- CLIの既定のシードは42とする。ログの1行目に、シードを必ず表示する。

### 5.6 リンタ・整形

序章〜第3章では、ESLintとPrettierを入れない。依存規則は `architecture.test.ts` で確かめ、書式は `.editorconfig` だけでそろえる。第2部（レビューとリファクタリングを学ぶ部）で導入を検討する。

## 6. 章別設計（序章〜第3章）

### 6.1 序章：最初の冒険を動かす

**作るもの**：冒険者が村を出発し、移動し、敵と遭遇するログを出すCLI。設定（名前、HP、道のり）を書き換えると、ログが変わる。

**ファイル**（solution）：

```text
src/domain/types.ts      # Agent, Step, WorldEvent, Change
src/content/scenario.ts  # 主人公の設定、道のり、名前の対応表
src/adventure.ts         # runAdventure（序章では sim と rules の役割を1ファイルで持つ。第1章で sim/ に移す）
src/narration/format.ts  # formatEvent, formatLog
src/main.ts              # 実行して console.log する
tests/adventure.test.ts
tests/exercises/rest.test.ts
```

**型**（affordance-model.md の部分集合）：

```ts
export interface Agent { id: string; name: string; params: { hp: number }; location: string }

export type Step =
  | { kind: 'move'; to: string }
  | { kind: 'encounter'; enemy: { id: string; name: string; power: number } }
  | { kind: 'rest'; amount: number };              // 演習で追加する

export interface Change { entity: string; field: 'param'; key: 'hp'; before: number; after: number }

export interface WorldEvent {
  t: number;
  type: 'action' | 'encounter' | 'defeated';
  actor: string;
  action?: 'depart' | 'move' | 'rest';
  target?: string;
  place?: string;
  changes?: Change[];
}
```

**主要な関数**：

```ts
export function runAdventure(hero: Agent, steps: Step[]): { hero: Agent; events: WorldEvent[] };
export function formatEvent(e: WorldEvent, names: Record<string, string>): string;
export function formatLog(events: WorldEvent[], names: Record<string, string>): string[];
```

規則：最初に `depart` のイベントを出す。遭遇すると `hp` が `power` だけ減る（0未満にはしない）。`hp` が0になったら `defeated` を出し、残りの手順は処理しない。`runAdventure` は引数の `hero` を書き換えず、新しいオブジェクトを返す。

**期待される出力**（主人公リナ、HP12）：

```text
[1] リナは村を出発した。（HP 12）
[2] リナは森へ移動した。
[3] リナはスライムに遭遇した！ HP 12→9
[4] リナは洞窟の入口へ移動した。
[5] リナは大コウモリに遭遇した！ HP 9→5
```

**テスト**：

| # | Given | When | Then |
|---|---|---|---|
| 1 | 主人公の名前が「リナ」 | `runAdventure` → `formatLog` | 1行目に「リナ」と「出発」が含まれる |
| 2 | 既定の道のり | `runAdventure` | イベントの `type` の並びが `action, action, encounter, action, encounter` |
| 3 | HP 6 で既定の道のり | `runAdventure` | 2回目の遭遇で HP 3→0、続けて `defeated` が出て、それ以降のイベントはない |
| 4 | 名前とHPが異なる2つの設定 | それぞれ実行 | ログが異なる（完成条件） |
| 5 | 任意の設定 | `runAdventure` | 引数の `hero` の `hp` が変わっていない |
| 演習 | HP 5 で `{ kind:'rest', amount: 3 }` | `runAdventure` | HP 5→8 の `Change` があり、ログに「休んだ」が含まれる |

**固定シード**：乱数を使わない。同じ設定なら、常に同じログになる。

**Git**：教材ページで、設定を変えてコミットし、`git diff` で差分を確かめる手順を扱う（コードには影響しない）。

### 6.2 第1章：戦闘する冒険者

**作るもの**：攻撃・防御・逃走を選ぶ1対1の戦闘シミュレータ。方策（policy）とシードを引数で切り替える。

**ファイルの変更**（前章のsolutionから）：

```text
# 記号：+ 追加 / ~ 変更 / > 移動
+ src/lib/rng.ts               # createRng（starter で完成品を渡す）
~ src/domain/types.ts          # kind, state, 戦闘パラメータ, WorldState, BattleAction, outcome
+ src/rules/combat.ts          # damageOf, fleeChance, resolveRound
+ src/sim/battle.ts            # runBattle
+ src/sim/policies.ts          # aggressive, cautious, coward
+ src/content/battle.ts        # アリアと灰色オオカミ
~ src/narration/format.ts      # 戦闘イベントの文
~ src/main.ts                  # --seed, --policy
> src/adventure.ts → src/sim/adventure.ts に移す（序章の機能は `--mode adventure` で引き続き動く）
+ tests/rng.test.ts, tests/combat.test.ts, tests/battle.test.ts, tests/policies.test.ts
+ tests/exercises/policy.test.ts
```

**型の追加**：

```ts
export interface CombatParams { hp: number; maxHp: number; atk: number; def: number; agi: number }
export interface Agent {
  id: string; kind: 'agent'; name: string; state: 'alive' | 'down';
  params: CombatParams; location: string;
}
export interface WorldState { t: number; entities: Record<string, Agent> }
export type BattleAction = 'attack' | 'defend' | 'flee';
export type Policy = (world: WorldState, selfId: string, enemyId: string) => BattleAction;
```

**規則**（`rules/combat.ts`）：

- ダメージ：`max(1, 攻撃側.atk − 防御側.def + rng.int(-1, 1))`。防御側がそのラウンドで `defend` を選んでいれば、`max(1, floor(ダメージ / 2))`。
- 逃走の成功確率：`clamp(0.5 + 0.1 × (自分.agi − 相手.agi), 0.1, 0.9)`。`rng.next() < 確率` なら成功し、戦闘を終える。
- 1ラウンドの手順：両者が行動を宣言する → `agi` の高い順に解決する（同じなら主人公が先）→ 防御はそのラウンドの最初から有効になる。
- 乱数の消費順：行動の解決順に、攻撃は揺らぎで1回、逃走は判定で1回、乱数を消費する。防御は消費しない。
- `hp <= 0` で `state` を `down` にし、`defeated` を出し、戦闘を終える。20ラウンドで決着しなければ `outcome: 'draw'` とする。

**主要な関数**：

```ts
export function damageOf(att: Agent, def: Agent, defending: boolean, rng: Rng): number;
export function fleeChance(self: Agent, enemy: Agent): number;
export function resolveRound(world: WorldState, heroId: string, heroAction: BattleAction,
  enemyId: string, enemyAction: BattleAction, rng: Rng): { world: WorldState; events: WorldEvent[]; ended: boolean };
export function runBattle(world: WorldState, heroId: string, enemyId: string,
  policies: { hero: Policy; enemy: Policy }, rng: Rng, maxRounds?: number)
  : { world: WorldState; events: WorldEvent[]; outcome: 'victory' | 'defeat' | 'fled' | 'draw' };
```

**データ**：アリア（hp 20, atk 6, def 2, agi 5）、灰色オオカミ（hp 14, atk 5, def 1, agi 6）。

**テスト**（`fixedRng(values)` は値を順に返し、尽きたら最後の値を返し続ける）：

| # | Given | When | Then |
|---|---|---|---|
| 1 | `fixedRng([0.5])`（揺らぎ0） | アリア `attack`、オオカミ `attack` で1ラウンド | 先に動くのはオオカミ（agi 6）。アリア HP 20→17、オオカミ HP 14→9 |
| 2 | 同上 | アリア `defend` | アリア HP 20→19（3の半分を切り捨てて1）、オオカミ HP 14 のまま |
| 3 | `fixedRng([0.5, 0.3])` | アリア `flee`（成功確率0.4） | 逃走に成功し、`battleEnd` の `outcome` が `fled` |
| 4 | `fixedRng([0.5, 0.5])` | アリア `flee` | 逃走に失敗し、戦闘が続く |
| 5 | テスト1〜3の同じ初期状態 | 行動だけを変える | 3通りの結果の世界状態がすべて異なる（完成条件） |
| 6 | `fixedRng([0.5])`、両者 `aggressive` | `runBattle` | 3ラウンドで `victory`、アリアの残りHPは11、オオカミの `state` は `down` |
| 7 | アリア HP 6/20 | `cautious` 方策 | `defend` を選ぶ（HPが最大の30%以下） |
| 8 | シード42 | `runBattle` を2回 | イベント列が完全に一致する。さらにスナップショットと一致する |
| 演習 | 自作の方策「HPが半分以下なら逃げる」 | HP 9/20 の状況 | `flee` を返す |

**固定シード**：CLIの既定は `--seed 42`。テストでは、単体テストに `fixedRng`、統合テストにシード42のスナップショットを使う。

### 6.3 第2章：障害を乗り越える

**作るもの**：同じ崖の前で、人物の技能・持ち物と環境の違いによって、利用できる行為が変わることを一覧で示すCLI。行為を1つ実行すると、新しいアフォーダンスが現れたり消えたりする様子も示す。

**ファイルの変更**：

```text
~ src/domain/types.ts        # affordance-model.md 4.2 の [ch02] までの型
+ src/domain/entities.ts     # getEntity(), getAgent() などの補助関数、paramLabel()
+ src/rules/params.ts        # param()
+ src/rules/refs.ts          # resolveRef()
+ src/rules/conditions.ts    # evaluate(), describeCondition()（日本語の説明）
+ src/rules/effects.ts       # applyEffects()
+ src/rules/transitions.ts   # applyTransitions()
+ src/rules/affordances.ts   # checkAction(), availableAffordances(), sceneOf()
+ src/rules/apply.ts         # applyAction()
+ src/content/cliff.ts       # 崖のカタログ、人物3人、環境の3パターン
~ src/narration/format.ts    # formatAffordances(), formatAffordanceDiff(), formatActionEvent()（変化 before→after を含む）
+ src/ui/cliff.ts            # --mode cliff の表示を組み立てる（main.ts を薄く保つため）
~ src/main.ts                # --mode cliff（既定）/ battle / adventure
+ tests/conditions.test.ts, effects.test.ts, transitions.test.ts, affordances.test.ts,
  apply.test.ts, serialization.test.ts, architecture.test.ts
+ tests/exercises/jump.test.ts
```

**主要な関数**：

```ts
export function param(e: Entity, key: string): number;
export function evaluate(c: Condition, ctx: RuleContext): boolean;
export function describeCondition(c: Condition, world: WorldState, catalog: Catalog): string; // 「登攀Lv1以上が必要」
export function checkAction(world: WorldState, catalog: Catalog, actorId: EntityId, actionId: ActionId): ActionCheck;
export function availableAffordances(world: WorldState, catalog: Catalog, actorId: EntityId): Affordance[];
export function applyAction(world: WorldState, catalog: Catalog, actorId: EntityId, actionId: ActionId)
  : { world: WorldState; event: WorldEvent };
export function sceneOf(world: WorldState, placeId: EntityId): Scene;
```

**データ**（`content/cliff.ts`）：

| 種類 | ID | 名前 | 初期状態・パラメータ | 重要度 {play, story} |
|---|---|---|---|---|
| 場所 | `cliff-bottom` / `ledge` / `cliff-top` | 崖下 / 岩棚 / 崖上 | — | — |
| 物 | `cliff` | 崖 | 1STATE（`standing`）、static | {3, 1} |
| 物 | `vine` | 蔦 | `intact`、strength 2。strength ≦ 0 で `torn` | {2, 0} |
| 物 | `anchor` | 岩の突起 | `solid`（`crumbled` もある）、崖上にある | {1, 0} |
| 物（Item） | `rope` | 鉤縄 | `coiled`（`hooked` もある）、ボルドが持つ | {2, 0} |
| 人物 | `aria` | アリア | 登攀3、体力20 | — |
| 人物 | `bord` | ボルド | 登攀1、体力20、鉤縄を所持 | — |
| 人物 | `sena` | セナ | 登攀0、浮遊1、体力20、魔力6 | — |

| 行為 | 主な前提条件 | 効果 | コスト |
|---|---|---|---|
| `climb:direct` 崖を直接よじ登る | 崖下にいる、登攀≧3 | 行為者→崖上 | 体力9 |
| `climb:vine` 蔦をつたって岩棚へ | 崖下、蔦が `intact`、登攀≧1 | 行為者→岩棚、蔦 strength −1 | 体力3 |
| `climb:ledge` 岩棚から崖上へ | 岩棚、登攀≧2 | 行為者→崖上 | 体力3 |
| `hook:rope` 鉤縄を岩の突起に掛ける | 崖下、鉤縄を持つ、鉤縄が `coiled`、突起が `solid` | 鉤縄→崖下、鉤縄 `hooked` | 体力1 |
| `climb:rope` 鉤縄を登る | 崖下、鉤縄が崖下にあり `hooked`、登攀≧1 | 行為者→崖上 | 体力1 |
| `cast:levitate` 浮遊の魔法で崖上へ | 崖下、浮遊≧1 | 行為者→崖上 | 魔力4 |

**期待される出力**（抜粋）：

```text
== 崖下（通常） ==
アリア（登攀3）      : 崖を直接よじ登る[体力9] / 蔦をつたって岩棚へ[体力3]
ボルド（登攀1・鉤縄）: 蔦をつたって岩棚へ[体力3] / 鉤縄を岩の突起に掛ける[体力1]
セナ（浮遊1）        : 浮遊の魔法で崖上へ[魔力4]
  セナは「蔦をつたって岩棚へ」を使えない：登攀Lv1以上が必要
== 崖下（嵐で蔦が切れた） ==
...
-- ボルドが鉤縄を岩の突起に掛ける --
[1] ボルドは鉤縄を投げ、岩の突起に掛けた。（体力 20→19 / 鉤縄：巻かれている→掛かっている）
アリア：崖を直接よじ登る / 鉤縄を登る（新しく現れた） / 蔦をつたって岩棚へ
```

**テスト**：

| # | Given | When | Then |
|---|---|---|---|
| 1 | 通常の環境 | 3人それぞれの `availableAffordances` | アリア＝{direct, vine}、ボルド＝{hook, vine}、セナ＝{levitate}（同じ崖でも技能・持ち物で変わる） |
| 2 | 蔦が `torn` の環境 | 同上 | アリア＝{direct}、ボルド＝{hook}、セナ＝{levitate}（環境で変わる） |
| 3 | 突起が `crumbled` の環境 | ボルド | {vine} のみ |
| 4 | セナ | `checkAction('climb:vine')` | `ok: false`、満たされない条件は登攀の条件1つ |
| 5 | 蔦の strength が 1 | アリアが `climb:vine` | 蔦の `state` が `torn` になり、`Change` に `via: 'transition'` がある。以後、ボルドの `climb:vine` は使えない |
| 6 | ボルドが `hook:rope` を実行した後 | アリアの `availableAffordances` | `climb:rope` が含まれる（他者の行為が環境を変え、アフォーダンスを生む） |
| 7 | 体力 2 のアリア | `availableAffordances` | `climb:vine`（体力3）が含まれない（コストは前提条件に展開される） |
| 8 | 任意の行為 | `applyAction` | 引数の世界状態は変わらない（不変更新） |
| 9 | カタログと初期世界 | `JSON.parse(JSON.stringify(x))` | 元と深く等しい |
| 10 | `src/` 以下 | `architecture.test.ts` | 依存規則に違反がない |
| 演習 | 「跳躍」の能力と行為 `jump:ledge`（崖下→岩棚、跳躍≧2、体力2）を追加 | 跳躍2の人物 | 利用できる行為に `jump:ledge` が加わる（行為をデータとして追加するだけで新しい手段が増える） |

**固定シード**：乱数を使わない。列挙の順序は `ActionId` の辞書順に固定する。

### 6.4 第3章：機転を利かせる

**作るもの**：同じ目標（崖上に着く）に対して、BFS・ダイクストラ法・A*（重みつきを含む）を切り替え、得られる計画・コスト・展開ノード数を比べるCLI。解決経路の一覧と、選んだ計画を実行したログも出す。資源配分の別演習として、DPによる体力・魔力の配分を扱う。

**ファイルの変更**：

```text
+ src/lib/stableStringify.ts
~ src/domain/types.ts            # Goal, DecisionRecord, EventType に 'plan'
+ src/planner/search/types.ts    # SearchProblem<S>, Successor<S>, SearchResult<S>
+ src/planner/search/bfs.ts
+ src/planner/search/dijkstra.ts
+ src/planner/search/astar.ts
+ src/planner/worldProblem.ts    # makeWorldProblem(), stateKey()
+ src/planner/heuristics.ts      # manhattanToPlace()
+ src/planner/allocate.ts        # DP による資源配分、比較用の貪欲法
+ src/analysis/routes.ts         # routeSignature(), listRoutes()
+ src/sim/executePlan.ts         # 計画を実行してイベント列を作る
+ src/content/cliffValley.ts     # 第3章の地図と行為（walkActions で移動を生成）
+ src/content/obstacleCourse.ts  # DP 演習のデータ
~ src/narration/format.ts        # 計画イベント（formatPlanEvent, formatPlanLog）
+ src/ui/plan.ts, src/ui/dp.ts   # 比較表・解決経路・実行ログ、DP の比較表を組み立てる
~ src/main.ts                    # --mode plan（既定）|dp|cliff|battle|adventure, --algo bfs|dijkstra|astar|all, --weight, --climb, --stamina
+ tests/search.bfs.test.ts, search.dijkstra.test.ts, search.astar.test.ts（小さな抽象グラフ）
+ tests/worldProblem.test.ts, heuristics.test.ts, routes.test.ts, allocate.test.ts, executePlan.test.ts
+ tests/exercises/levitate-route.test.ts, tests/exercises/astar.test.ts
```

#### 探索のインタフェース

```ts
export interface Successor<S> { action: string; state: S; cost: number }
export interface SearchProblem<S> {
  start: S;
  isGoal(s: S): boolean;
  successors(s: S): Successor<S>[];   // 順序は決定的であること
  key(s: S): string;                  // 状態の同一性
  heuristic?(s: S): number;           // A* 用
}
export interface SearchResult<S> {
  found: boolean;
  actions: string[];
  states: S[];
  cost: number;
  expanded: number;     // 取り出して後続を生成したノードの数（目標のノードと、処理済みで捨てたノードは数えない）
  generated: number;    // 開集合に入れたノードの数
}
export function bfs<S>(p: SearchProblem<S>, opts?: { maxExpanded?: number }): SearchResult<S>;
export function dijkstra<S>(p: SearchProblem<S>, opts?: { maxExpanded?: number }): SearchResult<S>;
export function astar<S>(p: SearchProblem<S>, opts?: { weight?: number; maxExpanded?: number }): SearchResult<S>;
```

結果を再現できるよう、実装の細部を次のとおり固定する。

- 目標判定は、ノードを**取り出したとき**に行う（3つの探索法で共通）。
- BFS：先入れ先出し。一度生成した状態（`key`）は二度と生成しない。
- ダイクストラ法・A*：開集合は配列とし、取り出すたびに最小のものを選ぶ。比較は、まず `f = g + weight × h`（ダイクストラ法では `h = 0`）、同じならA*では `h` の小さい方、それも同じなら追加した順とする。処理済みの状態は捨てる。より小さい `g` が見つかったときだけ追加する。二分ヒープは発展課題とする。
- 後続の順序は、`availableAffordances` の順（`ActionId` の辞書順）とする。

#### 世界状態を探索問題にする

```ts
export function makeWorldProblem(world: WorldState, catalog: Catalog, actorId: EntityId, goal: Goal,
  opts?: { costWeights?: Partial<Record<'stamina' | 'mana', number>>;   // 'time' は Cost.time を導入する第8章で加える
           heuristic?: (w: WorldState) => number }): SearchProblem<WorldState>;
export function stateKey(world: WorldState, ignore?: { entity: EntityId; keys: string[] }[]): string;
export function manhattanToPlace(goalPlaceId: EntityId, actorId: EntityId): (w: WorldState) => number;
```

- 辺のコスト＝Σ（重み × 行為のコスト）。重みの既定値は `{ stamina: 1 }`。
- `stateKey` は、全エンティティの `state`・`params`・`location` を、IDの順に `stableStringify` したもの。
- **単一の資源だけを最小化するときは、その資源（行為者の `stamina`）を `stateKey` から外す。** 同じ場所・同じ物の配置に、より少ない消費で着いた経路は、残りの資源も多いので、後から着いた経路より常に有利である。そのため、資源の値を状態に含めなくても、ダイクストラ法とA*の最適性は保たれる。資源が足りるかどうかは、シミュレーション上の前提条件（コストの展開）がそのまま判定する。ただしBFSは、最初に見つけた経路が資源を多く使っている場合に、資源が厳しいと解を取り逃がすことがある。これは教材の中で「状態に何を含めるか」を考える題材にする。重みを2つ以上の資源に付けるときは、資源を状態から外さない。
- ヒューリスティック：`h = |x − x_goal| + |y − y_goal| + (目標の場所にいなければ 1)`。座標は場所の `params.x`・`params.y`。歩く行為はどれもコスト1でマンハッタン距離を1だけ縮め、崖を越える行為はどれもコスト1以上なので、`h` は許容的（実際の残りコストを超えない）かつ無矛盾である。

#### 例題：崖の谷（`content/cliffValley.ts`）

場所と座標（崖下・岩棚・崖上は同じ地図座標で、高さだけが違う）：

| ID | 名前 | x | y | | ID | 名前 | x | y |
|---|---|---|---|---|---|---|---|---|
| `village` | 村（出発地） | 0 | −2 | | `wheat-field` | 麦畑 | −1 | −2 |
| `fork` | 分かれ道 | 0 | −1 | | `windmill` | 風車小屋 | −2 | −2 |
| `cliff-bottom` | 崖下 | 0 | 0 | | `old-well` | 古井戸 | −3 | −2 |
| `ledge` | 岩棚 | 0 | 0 | | `stone-bridge` | 石橋 | 0 | −3 |
| `cliff-top` | 崖上（目標） | 0 | 0 | | `inn-ruins` | 宿場跡 | 0 | −4 |
| `shed` | 物置小屋（鉤縄がある） | 1 | 0 | | `checkpoint` | 関所跡 | 0 | −5 |
| | | | | | `riverside` / `ferry` / `reed-marsh` | 川辺 / 渡し場 / 葦原 | 1 / 2 / 3 | −2 |

道（双方向、どれも体力1）：村–分かれ道、分かれ道–崖下、崖下–物置小屋、村–麦畑–風車小屋–古井戸、村–石橋–宿場跡–関所跡、村–川辺–渡し場–葦原。村の西・南・東の道は崖から遠ざかる「寄り道」で、ダイクストラ法とA*の探索量の差を見せるために置く。

崖まわりの行為は第2章と同じとする（`climb:direct` 体力9、`climb:vine` 体力3、`climb:ledge` 体力3、`hook:rope` 体力1、`climb:rope` 体力1）。これに `take:rope`（物置小屋で鉤縄を拾う、体力1）を加える。鉤縄は物置小屋にある。`climb:ledge` は物を対象にしない。崖を対象にすると、蔦の経路の識別子が直接登る経路の識別子を含んでしまい、別解として数えられなくなるためである。

人物：アリア（村にいる、体力20、登攀3）。目標：`{ type:'at', of:'aria', place:'cliff-top' }`。

**期待される結果**（実装で確認した値。展開ノード数はスナップショットで固定した）：

| 条件 | 探索法 | 計画 | 手数 | 体力 | 展開ノード |
|---|---|---|---|---|---|
| 登攀3・体力20 | BFS | 村→分かれ道→崖下→崖を直接登る | 3 | 11 | 9 |
| 〃 | ダイクストラ法 | 村→分かれ道→崖下→物置小屋→鉤縄を拾う→崖下→鉤縄を掛ける→鉤縄を登る | 7 | 7 | 18 |
| 〃 | A*（重み1） | ダイクストラ法と同じ | 7 | 7 | 11 |
| 〃 | A*（重み3） | 村→分かれ道→崖下→蔦→岩棚から崖上 | 4 | 8 | 4 |
| 登攀2・体力20 | BFS | 蔦の経路 | 4 | 8 | 14 |
| 〃 | ダイクストラ法／A* | ロープの経路 | 7 | 7 | 18 / 11 |
| 登攀1・体力20 | 3つとも | ロープの経路 | 7 | 7 | 19 / 18 / 11 |
| 登攀3・体力10 | BFS | 蔦の経路（直接登ると体力が足りない） | 4 | 8 | 14 |
| 登攀3・体力6 | 3つとも | 計画なし | — | — | — |

- BFSは「手数が最小」、ダイクストラ法は「体力の消費が最小」の計画を返すので、同じ問題で結果が分かれる（仕様書8.4の第3章）。
- A*（重み1）は、ダイクストラ法と同じ最適な計画を、より少ない展開で見つける。重み3にすると、さらに少ない展開で見つかるが、最適ではない計画（体力8）になる。ヒューリスティックの強さと解の質の関係を観察できる。
- 展開ノード数は、上に固定した実装の細部に依存する。テストでは、計画とコストは正確な値で確かめ、展開ノード数は大小関係（`astar.expanded < dijkstra.expanded`、`weighted.expanded < astar.expanded`）で確かめる。実装後に得た値は、スナップショットとして記録する。

**解決経路**（`analysis/routes.ts`）：

```ts
export function routeSignature(plan: ActionId[], catalog: Catalog, world: WorldState): EntityId[];
export function listRoutes(world: WorldState, catalog: Catalog, actorId: EntityId, goal: Goal,
  opts: { maxCost: number; costWeights?: Partial<Record<'stamina' | 'mana', number>> })
  : { signature: EntityId[]; plan: ActionId[]; cost: number }[];   // 返す順序：コスト → 識別子
```

`listRoutes` は、状態と「これまでに使った物の集合」の組を状態とする均一コスト探索を行う。目標に着いても探索を止めず、コストの上限以内で目標に届く経路の識別子を集め、包含について極小なものだけを返す（affordance-model.md 8.3節）。試作での結果は次のとおり。

| 条件 | 経路（識別子：体力／手数） |
|---|---|
| 登攀3・上限20 | `{anchor, cap:climb, rope}`：7／7、`{cap:climb, vine}`：8／4、`{cap:climb, cliff}`：11／3 |
| 登攀2・上限20 | `{anchor, cap:climb, rope}`：7／7、`{cap:climb, vine}`：8／4 |
| 登攀1・上限20 | `{anchor, cap:climb, rope}`：7／7 |

「鉤縄を持ったまま蔦を登る」計画（`{cap:climb, rope, vine}`）なども目標に届くが、`{cap:climb, vine}` を含むので数えない。

**計画の実行とログ**（`sim/executePlan.ts`）：

```ts
export function executePlan(world: WorldState, catalog: Catalog, actorId: EntityId, plan: ActionId[],
  decision: DecisionRecord): { world: WorldState; events: WorldEvent[] };
```

最初に `type:'plan'` のイベント（`decision` 付き）を出し、続けて行為ごとに `type:'action'` のイベントを出す。

```text
# seed: - / algo: dijkstra / catalog: cliff-valley@0.1
[0] アリアは考えた。鉤縄を使えば、少ない体力で崖上に行けそうだ。（候補3通り・7手・体力7）
[1] アリアは村から分かれ道へ歩いた。（体力 20→19）
...
[6] アリアは鉤縄を投げ、岩の突起に掛けた。（鉤縄：巻かれている→掛かっている）
[7] アリアは鉤縄を登り、崖上に着いた。（体力 14→13）
```

**テスト**：

| # | Given | When | Then |
|---|---|---|---|
| 1 | 5ノードの抽象グラフ（辺の重みが異なる） | `bfs` / `dijkstra` | BFSは辺の数が最小の経路、ダイクストラ法は重みの和が最小の経路を返す |
| 2 | 到達できない目標 | 3つの探索法 | `found: false` |
| 3 | 抽象グラフで `heuristic = 0` | `astar` | `dijkstra` と同じ経路・コスト |
| 4 | 崖の谷、登攀3・体力20 | `bfs` | 3手・体力11（直接登る） |
| 5 | 同上 | `dijkstra` | 7手・体力7（ロープの経路） |
| 6 | 同上 | `astar`（重み1） | 計画とコストはダイクストラ法と同じで、`expanded` はダイクストラ法より少ない |
| 7 | 同上 | `astar`（重み3） | 体力8（蔦の経路）。`expanded` は重み1より少ない |
| 8 | 登攀2 / 登攀1 | `bfs` | 蔦の経路 / ロープの経路 |
| 9 | 体力10 / 体力6 | `bfs` / 3つとも | 蔦の経路 / 計画なし |
| 10 | ダイクストラ法が処理したすべての状態と辺 | `manhattanToPlace` | `h(s) ≦ cost + h(s')`（無矛盾性）、目標で `h = 0` |
| 11 | 登攀3・上限20 | `listRoutes` | 3通り（上の表） |
| 12 | ダイクストラ法の計画 | `executePlan` | 最初が `plan` イベント、最後の世界でアリアは崖上、鉤縄は `hooked` |
| 13 | 同じ入力 | 2回実行 | 結果が完全に一致する（決定性） |
| 演習1 | カタログに `cast:levitate`（崖下で浮遊≧1、魔力4）を加え、アリアに浮遊1と魔力6を与える。重みは `{ stamina:1, mana:1 }` | `listRoutes` と `dijkstra` | 経路が4通りになり、新しい経路 `{cap:levitate}` が現れる。ダイクストラ法の計画は、歩いて崖下へ行き魔法を使う経路（コスト6）に変わる（仕様書6.3の発展課題） |
| 演習2 | starter の `astar` が未実装 | 学習者が実装 | テスト6・7が通る |

演習1の補足：経路の識別子に能力（`cap:`）を含めているのは、この演習のためでもある。物だけで識別すると、物を使わない浮遊の経路の識別子は空集合になる。空集合は他のすべての識別子に含まれるので、極小なものに限ると浮遊の経路しか残らない。教材では、識別子から能力を外した場合の結果も示し、「経路をどう数えるか」が設計上の選択であることを考えさせる。重みを2つの資源に付けるので、この演習では資源を `stateKey` から外さない（9.4節）。

#### DPによる資源配分（`planner/allocate.ts`、`--mode dp`）

山道に障害が3つ続き、それぞれ3つの越え方から1つを選ぶ。体力と魔力の予算の中で、かかる時間の合計を最小にする。

| 障害 | 越え方（体力, 魔力, 時間） |
|---|---|
| 崖 | 登る (4, 0, 3) / 浮遊 (0, 3, 1) / 遠回り (1, 0, 6) |
| 急流 | 泳ぐ (5, 0, 2) / 凍結の魔法 (0, 4, 1) / 浅瀬を探す (2, 0, 5) |
| 茨の壁 | 切り開く (3, 0, 2) / 炎の魔法 (0, 2, 1) / 迂回 (1, 0, 4) |

```ts
export interface AllocOption { actionId: ActionId; label: string; stamina: number; mana: number; time: number }
export interface Obstacle { id: string; label: string; options: AllocOption[] }
export interface Allocation { choices: ActionId[]; totalTime: number; states: number }
export function allocate(obstacles: Obstacle[], budget: { stamina: number; mana: number }): Allocation | null;
export function greedyAllocate(obstacles: Obstacle[], budget: { stamina: number; mana: number }): Allocation | null;
```

部分問題は「i番目以降の障害を、残り体力s・残り魔力mで越えるときの最小時間」とし、`(i, s, m)` をキーにメモ化する。`states` はメモに記録した部分問題の数である（すべての障害を越えた後の基底 `i = n` はメモに記録しない）。

`AllocOption` と `Obstacle` の型は `domain/types.ts` に置き、`planner/allocate.ts` から再エクスポートする。作品データ `content/obstacleCourse.ts` がこの型を使い、`content` は `domain` にだけ依存してよい（4.2節）ためである。

| 予算（体力, 魔力） | DPの結果 | 貪欲法（各障害で最速の手を選ぶ） |
|---|---|---|
| (7, 4) | 登る・凍結・切り開く：時間6（部分問題10個） | 浮遊・泳ぐ・迂回：時間7 |
| (8, 5) | 浮遊・泳ぐ・炎：時間4 | 同じ（時間4） |
| (3, 2) | 遠回り・浅瀬を探す・炎：時間12 | 同じ |
| (0, 9) | 浮遊・凍結・炎：時間3 | 同じ |
| (2, 1) | `null`（越えられない） | `null` |

テスト：上の表の各行を Given/When/Then として確かめる。加えて、全組合せ（3³ = 27通り）を調べる素朴な実装と、DPの結果が一致することを確かめる。予算(7, 4)の例は、貪欲法では最善にならない（最初に魔力を使い切ると、後の障害で遅い手しか残らない）ことを示す。

**固定シード**：第3章は乱数を使わない。同じ入力からは常に同じ計画になる。再現性は、列挙の順序と探索の同点処理を固定することで保証する（シードではない）。CLIのログ1行目には、シードの欄を `-` と表示する（第5章以降の形式とそろえるため）。

## 7. テストとCI

### 7.1 品質ゲート（各プロジェクト）

- [ ] `npm run typecheck` が成功する
- [ ] `npm test` が成功する（solutionでは演習用テストも含む）
- [ ] `tests/architecture.test.ts` が成功する（第2章以降）
- [ ] READMEの期待される出力と、`npm start` の出力が一致する（`check:snippets`）

### 7.2 リポジトリ全体のゲート

- [ ] `check:exercises`：演習用テストがstarterとsolutionで一致する
- [ ] `check:deps`：全プロジェクトの `devDependencies` の版がそろっている
- [ ] `check:snippets`：教材HTMLのコード片・出力例が、完成版と一致する

### 7.3 GitHub Actions

`ci.yml`（`push` と `pull_request` で実行）：

```yaml
jobs:
  discover:            # node scripts/list-examples.mjs で examples/*/* を JSON 配列にして出力
  check:
    needs: discover
    strategy:
      fail-fast: false
      matrix:
        dir: ${{ fromJSON(needs.discover.outputs.dirs) }}
    steps:
      - uses: actions/checkout
      - uses: actions/setup-node   # node-version: 24, cache: npm, cache-dependency-path: ${{ matrix.dir }}/package-lock.json
      - run: npm ci
        working-directory: ${{ matrix.dir }}
      - run: npm run check
        working-directory: ${{ matrix.dir }}
  repo-checks:         # check:exercises, check:deps, check:snippets（依存のインストール不要）
```

`pages.yml`（`main` への `push` で実行）：`node scripts/build-site.mjs` で、`index.html`・`parts/`・`chapters/`・`assets/`・`references/` を `_site/` にコピーし、GitHub Pagesに配置する。`examples/` は公開サイトには含めず、各章のページからGitHubのリポジトリ上のディレクトリへリンクする。第13章以降のWeb版の完成版は、ビルドした成果物を `_site/apps/chXX/` に置く（その時点で設計する）。

アクションの版は、この文書では決めない。実装の時点で、各アクションの公式のREADMEに書かれた最新の主要版を指定する。

## 8. 教材サイトとコードの整合

- 教材ページ（`chapters/chXX.html`）のコード片は、`<!-- snippet:examples/ch02/solution/src/rules/conditions.ts#evaluate -->` と `<!-- /snippet -->` で囲む。ソース側は `// #region evaluate` 〜 `// #endregion` で範囲を示す。
- 出力例は `<!-- output:ch02 -->` で囲み、`solution` で `npm start` を実行した結果を埋め込む。
- `npm run sync:snippets` で書き換え、`npm run check:snippets` で差分がないことをCIで確かめる。仕様書8.2-3（教材との一致）を機械的に保証するためである。
- このスクリプトは教材HTMLの制作を始めるときに作る。今回の試作範囲（トップページ＋序章〜第3章）でも使う。

## 9. 主要な判断（代替案と選定理由）

### 9.1 章プロジェクトの束ね方

- **案A（採用）**：章ごとの独立したnpmプロジェクト。それぞれに `package-lock.json` を置き、ルートのスクリプトで一括実行する。
- **案B**：npm workspacesで束ね、依存をルートに集める。
- **理由**：仕様書8.2-1は「その章だけでセットアップ・実行できる」ことを求めている。案Bでは、章のディレクトリだけを取り出したときにロックファイルが付いてこない。また、名前の衝突を避けるための工夫が要る。案Aはディスク容量とインストール時間が増えるが、CIのキャッシュと並列実行で吸収できる。
- **影響とロールバック**：後から案Bに移る場合も、各 `package.json` の内容はそのまま使える。ルートに `workspaces` を足し、ロックファイルをまとめ直すだけで済む。

### 9.2 実行形態（序章〜第12章）

- **案A（採用）**：NodeのCLI（`tsx`）。**案B**：最初からVite＋ブラウザ。理由は5.4節に書いた。

### 9.3 戦闘規則の書き方（第1章）

- **案A（採用）**：第1章では手続き的なコード（`if`・`switch`）で書き、第5章で宣言的な `ActionDef`（`Effect.damage` と `chance`）に移す。
- **案B**：第1章から宣言的な行為定義で書く。
- **理由**：第1章の学習目標は、条件分岐の整理と関数分割である。第2章で「規則をデータにすると何がうれしいか」を、第1章の手続き的なコードと比べながら示せる。パラメータ名とイベントの形は最初から最終形にそろえるので、移行するときにデータを書き換える必要はない。
- **影響**：第5章で、`rules/combat.ts` の代わりに行為定義を使うようにし、第1章のテストを回帰テストとして流用する。

### 9.4 探索の状態の同一性

- **案A（採用）**：単一の資源を最小化するときは、その資源を `stateKey` から外す。
- **案B**：資源の値も状態に含める。
- **理由**：案Bでは、同じ場所に異なる体力で着いた状態を別々に展開するので、ノード数が増える。そのため、ダイクストラ法とA*の差が見えにくくなる。案Aは、ダイクストラ法とA*について最適性を保ったまま状態を減らせる。BFSの限界は、教材の中で考える題材として明示する。
- **影響**：資源を2つ以上同時に最小化する場合や、第8章で時間を加える場合は、案Bに切り替える（`makeWorldProblem` の内部だけを変えればよい）。

### 9.5 演習用テストの置き方

- **案A（採用）**：`tests/exercises/` に分け、starterでは設定ファイルで既定の実行から外す。内容はsolutionと同一にする。
- **案B**：starterのテストを `it.todo` や `it.skip` にしておく。
- **理由**：案Bでは、学習者がテストを書き換えないと合否が分からない。また、solutionの側と内容がずれやすい。案Aなら、演習の合格基準が1つのファイルに固定され、ずれは `check:exercises` が見つける。

### 9.6 教材サイトの作り方

- **案A（採用）**：手書きの静的HTMLと、コード片の同期スクリプト。
- **案B**：静的サイトジェネレータ（Viteのマルチページ構成など）でMarkdownから生成する。
- **理由**：仕様書3章は、教材自体を静的に閲覧・公開できる構成とすることを求めている。ビルドなしで開けるHTMLは、研究で長期保存する教材としても扱いやすい。一方、コードと本文のずれという案Aの弱点は、同期スクリプトで補う。
- **影響**：ページ数が増えて共通部分の重複が負担になった場合は、案Bに移る。その場合も、`snippet` の目印はそのまま使える。

## 10. 第4章以降への接続

| 章 | 追加するモジュール・ファイル | 実行形態 |
|---|---|---|
| 4 | `narration/` に詳細／簡潔の2形式と salience、`analysis/pinchbeck.ts`（`classifyChange`） | CLI（`--format detail\|brief`） |
| 5 | `mind/`（方策、有限状態機械）、戦闘を `content/` の行為定義に移す | CLI |
| 6 | `mind/memory.ts`、読解の行為 | CLI |
| 7 | `rules/growth.ts`、`analysis/repertoire.ts`（`compareRepertoire`） | CLI |
| 8 | `sim/clock.ts`、人生の要約 | CLI |
| 9 | `worldgen/`、`Place.exits` による移動の汎用化、簡易地図の文字表示 | CLI |
| 10〜12 | 複数人物の更新順序、世界の変化、`history/` | CLI |
| 13 | `ui/web/`（Vite、DOM）。ドメイン側は変更しない | ブラウザ |
| 14 | `persistence/`（JSON化・検証・移行）、`ui/web/storage.ts` | ブラウザ |
| 15 | `ui/web/runner.ts`（タイマー）と `sim` の1ステップ実行の分離 | ブラウザ |
| 16 | `pages.yml` でWeb版の完成版を公開、`RunMeta` と JSON Lines の書き出し | ブラウザ＋CI |

## 11. 未決事項

| 事項 | 決める時期 |
|---|---|
| 依存パッケージとGitHub Actionsのアクションの具体的な版 | 実装を始める時点 |
| ローカル環境を使えない学習者向けの、ブラウザ上の開発環境の選定 | 教材HTMLの制作時（仕様書3章） |
| 第13章以降のWeb版の完成版を公開サイトに含める方法 | 第13章の設計時 |
| ~~展開ノード数の最終的な期待値~~ | 決定済み：6.4節の表の値が実装と一致し、スナップショットで固定した |
