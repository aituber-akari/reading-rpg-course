# アフォーダンスモデル設計書

- 文書種別：設計文書（中核データモデル）
- 版：0.1（教材MVP・縦切り試作用）
- 対象：教材全体（序章〜第16章）と、後日の本番開発
- 前提文書：`docs/spec.md`（教材制作仕様書 0.1）
- 関連文書：`docs/design/architecture.md`

## 1. この文書の目的

この文書は、教材「読むRPG」で使うデータモデルを定める。モデルの土台には、次の2本の論文が示すアフォーダンスの考え方を置く。

- Pinchbeck, D. (2009). An affordance based model for gameplay. *Proceedings of DiGRA 2009*.（以下「Pinchbeck」）
- Baker, B. & Roberts, S. (2025). Understanding Agent Complexity Through Affordances. *Minds and Machines*, 35:51.（以下「Baker & Roberts」）

アフォーダンスの考え方は、教材の一つの章で扱う話題ではない。教材全体を貫く設計思想として扱う。本番開発ではこのモデルが作品データ（人物・物・場所・行為の定義）の構造をほぼ決めることになるため、次の4点を重視する。

1. 概念と型の対応が追えること。論文の概念ごとに、どの型・フィールド・規則に対応するかを明示する。
2. 宣言的であること。前提条件と効果は関数ではなくデータで書き、JSONにそのまま保存できるようにする。
3. 段階的に導入できること。序章〜第3章で入れる部分が、第16章までの拡張と矛盾しないようにする。
4. 研究で観察できること。「機転・奇策」に見える振る舞いを、イベントログからあとで測れるようにする。

一方で、教材として理解できる単純さを保つことを優先する。汎用プランニング言語（PDDLなど）の完全な再実装は目指さない。

## 2. 用語

| 用語 | この教材での意味 |
|---|---|
| エンティティ（Entity） | 世界に存在するもの全般。人物（Agent）、物（WorldObject）、場所（Place）の3種類がある。 |
| 状態（state） | エンティティの「型」として固定された性質の組を表す名前。例：`intact`（無傷）／`torn`（切れた）。 |
| パラメータ（params） | 状態の中で連続的に変わる数値。例：`hp`、`stamina`、`strength`、座標の`x`・`y`。 |
| 能力（Capability） | 人物が持つ技能・認知能力の水準。例：登攀Lv3、計画Lv2。 |
| 行為定義（ActionDef） | 「誰かが、ある条件のもとで、何かをすると、何が変わるか」を宣言的に書いたデータ。アフォーダンスの**可能性**を表す。 |
| アフォーダンス（Affordance） | ある時点で、ある人物にとって実際に実行できる行為。行為定義・人物・環境の関係から**計算で求める**値であり、保存はしない。 |
| 環境集合（environment set） | Pinchbeckの用語。ある場面に存在するエンティティ全体。この教材では`Scene`（場所とそこにあるもの）として求める。 |
| イベント（WorldEvent） | 起きた出来事の構造化記録。ログ表示、記憶、歴史、研究分析のすべての元データになる。 |
| カタログ（Catalog） | 能力定義と行為定義を集めた**作品データ**。実行中は変わらない。 |
| 世界状態（WorldState） | 実行中に変わる**セーブデータ**の本体。 |

## 3. 文献から設計原則へ

### 3.1 Pinchbeck（2009）の要点と対応

Pinchbeckは、FPSを中心とするゲームのオブジェクトを「状態」と「パラメータ」で分類した。さらに、ゲームプレイ全体を、少数の典型的なアフォーダンスと、それを媒介するパラメータのネットワークとして記述した。

| Pinchbeckの概念 | 要旨 | このモデルでの対応 |
|---|---|---|
| 状態（state） | オブジェクトとその文脈との関係を定める性質の組。状態ごとにアフォーダンスが決まる。 | `EntityBase.state`（現在の状態名）、`WorldObject.states`（取りうる状態の宣言） |
| パラメータ（parameter） | アフォーダンスの発揮のされ方を決める数値（多くは整数）。 | `EntityBase.params: Record<string, number>` |
| 閾値による状態遷移 | パラメータが所定の値（多くは0）に達すると状態が切り替わる（壊れる木箱）。 | `WorldObject.transitions`（宣言的な遷移規則）。効果の適用後に評価する。 |
| プリセットへの一括変化 | 状態の切り替えでパラメータ群が所定の値に一斉に変わる（イコライザのプリセット）。 | `WorldObject.presets`（状態名→パラメータ値）。状態に入るときに上書きする。 |
| 1STATE／多状態（>1STATE） | 状態が1つしかない物と、2つ以上ある物。 | `states.length === 1` なら1STATE。分析関数で判定する。 |
| static／movable | 1STATEの物のうち、動かない物と動かせる物。 | `objectClass: 'static' \| 'movable'`（注釈）。`portable: true` なら持ち運べる（Item）。 |
| CTO／FTO／independent | 決まった使われ方しかしない物（CTO）、自由に使える物（FTO）、自律して動く物（agent）。 | `objectClass: 'controlled' \| 'free'`（注釈）。independentは`Agent`そのもの。 |
| gameplay／diegetic | 他の物を変える力を持つアフォーダンスと、物語世界を支えるだけのアフォーダンス。 | `significance.play` と `significance.story` の2軸 |
| significance（重要度）／critical | 重要度には段階がある。一定以上は「必ず使わなければ進めない」critical。 | `Significance`の各軸を `0..3` で表し、`3` を critical とする。 |
| corroborative／story object | 物語世界を補強するだけの物と、物語の理解を進める物。 | `significance.story` が `1` なら corroborative、`2` 以上なら story object。 |
| 「criticalな物語系の物は、ゲームプレイ系の物でもある」 | 暗号の書かれた日誌は critical なゲームプレイ物体になる。 | 検証規則：`story === 3` ならば `play === 3`。 |
| 典型的なアフォーダンス型 | C/E、CEP、COwnP、COwnL、COP、CAP、SD、STORY。 | 効果（`Effect`）の種類と対象から**分析時に導出する**（4.9節）。データには書かない。 |
| agentの2つの特別なアフォーダンス | 環境を知覚する（PERCEIVE）、入力に応じて出力を選ぶ（SELECT）。 | 知覚＝`availableAffordances()`（利用可能な行為の列挙）、選択＝方策・計画器（`planner`、第5章以降の`mind`） |
| 「構造的な複雑さは、体験される複雑さより小さい」 | 少数の型と媒介変数の組合せで多様な体験が生まれる。 | 行為定義の語彙（条件・効果の種類）を小さく固定し、多様さはデータの組合せで出す。 |

設計原則として、次の4つを採る。

- **P1 すべての物は状態とパラメータで記述する。** 人物も物も場所も、`state` と `params` を持つ同じ基底型（`EntityBase`）から作る。Pinchbeckがagentを「AIの付いた多状態オブジェクト」と捉えたことに対応する。
- **P2 状態の切り替えは宣言的な規則で起こす。** 行為の効果はまずパラメータを変える。状態の切り替えは、閾値規則（`transitions`）が評価して起こす。効果で状態を直接設定すること（`setState`）も許すが、これはスイッチのような「一斉切り替え」に使う。
- **P3 重要度は「設計時の値」として持ち、実行時の使われ方とは分けて扱う。** 研究上の観察（4.10節）で、設計時の重要度と、実際に使われた度合いのずれを測るためである。
- **P4 物語系とゲームプレイ系は同じ物体の2つの軸として扱う。** 別々の仕組みにはしない。Pinchbeckの「物語とゲームプレイのあいだに概念上の区別はない」という主張に従う。

### 3.2 Baker & Roberts（2025）の要点と対応

Baker & Robertsは、エージェントの複雑さを「そのエージェントが環境の中で利用できるアフォーダンスの範囲」で比べる枠組みを提案した。

| Baker & Robertsの概念 | 要旨 | このモデルでの対応 |
|---|---|---|
| アフォーダンス＝能力を発揮する機会 | 環境が、ある能力を持つエージェントに活動を許すこと。エージェントと環境の**関係**である。 | `Affordance` は保存せず、`ActionDef` × 人物の `capabilities`・`params` × 環境の状態から**計算する**。 |
| 行動的／認知的アフォーダンス | 歌う・道具を作るなどの行動と、注意・計画・記憶などの認知を区別する。境界は厳密には決めない。 | `CapabilityDef.kind` と `ActionDef.kind` を `'behavioral' \| 'cognitive'` とする。操作的定義：主な効果が外界に及ぶなら行動的、人物の内部状態（記憶・知識・計画）に及ぶなら認知的。 |
| basic／composite | それ以上分けない基本のアフォーダンスと、複数の基本アフォーダンスが揃って初めて成り立つ複合アフォーダンス。 | basic＝単一の`ActionDef`。composite＝目標を達成する**行為列（計画）**。第6章以降、成功した計画を `CompositeAffordance` として記憶できる。 |
| 粒度の選び方は自由 | どこをbasicとみなすかは、一貫していればよい。 | 「行為定義1件＝basic」と固定する。歩く・掴むなどの身体の細部は扱わない。 |
| 複雑さの比較 | 一方の利用可能集合がもう一方を包含するなら、前者の方が複雑。包含関係がなければ比較できない（不定）こともある。 | `compareRepertoire()`：`'greater' \| 'less' \| 'equal' \| 'incomparable'` を返す（4.10節）。 |
| 能力は時点での性質 | 複雑さはその時点のものであり、学習によって増減する。 | **成長＝利用できるアフォーダンス集合（レパートリー）の拡大**として測る（第7章）。 |
| 認知と行動の相互依存 | 一方が他方を可能にすることがある（紙と鉛筆で考える）。 | 認知的能力（計画Lv）が、行動的アフォーダンスの組合せ（計画の長さ・探索量）を媒介する。物語系の物を「読む」認知的行為が、新しい行動的行為の前提条件（知識）を満たす。 |
| 動機の成分 | 我慢する（遅延報酬）力も、利用できるアフォーダンスを広げる。 | 第5章の性格の重み（`traits`）と目標（`goals`）。研究上の拡張点として残す。 |

設計原則として、次の4つを採る。

- **P5 アフォーダンスは関係であり、計算で求める。** 行為定義（可能性）と、その時点のアフォーダンス（実際に使える行為）を型の上でも分ける。保存するのは行為定義と世界状態だけにする。
- **P6 能力は行動的と認知的の2次元で持つ。** 1本の「強さ」の数値にまとめない。
- **P7 計画と記憶は認知的アフォーダンスとして扱う。** 計画を立てたこと自体を、イベント（`type: 'plan'`）として記録する。
- **P8 複雑さは観察できる指標に落とす。** 利用可能数、レパートリーの包含関係、解決経路の数などを、イベントログと定義データから計算できるようにする。

### 3.3 両論文の接点：読むRPGでは「プレイヤーは読む人」である

Pinchbeckは、勢力どうしが争うゲームでは「プレイヤーの活動とは無関係に、エージェントどうしのやりとりをただ観察できる」と書いている。読むRPGは、この状態を作品の中心に置いたものと言える。

- ゲームプレイ系のアフォーダンス（崖を登る、ロープを掛けるなど）は、すべて人物（independent）が自律的に使う。
- 読み手に残るのは、Pinchbeckの物語系アフォーダンス（SD：物語世界を支える、STORY：筋の理解を進める）だけである。読み手はログという「物」を通して、物語世界の解釈を引き出す。
- Pinchbeckのモデルではアバターのパラメータ変化（CAP）を特別扱いするが、読むRPGにはアバターがいない。そのため CAP は「行為者自身の変化（COwnP／COwnL）」か「他の人物の変化（COP）」に吸収する。

この関係は第9節で詳しく扱う。

## 4. データモデル

### 4.1 全体像

```text
Catalog（作品データ：変わらない）        WorldState（セーブデータ：変わる）
├─ CapabilityDef[]                       ├─ t（時刻）
└─ ActionDef[]                           └─ entities: Record<EntityId, Entity>
      │ pre / effects / cost                     ├─ Agent（人物）
      │ （Condition / Effect の宣言）             ├─ WorldObject（物、Item を含む）
      ▼                                          └─ Place（場所）
  rules（評価器） ── availableAffordances() ──► Affordance[]（計算値・保存しない）
      │
      └─ applyAction() ──► 新しい WorldState ＋ WorldEvent（changes 付き）
                                                   │
                                     History（WorldEvent[]：変わる・追記のみ）
```

- `Catalog` と `WorldState` と `History` は、それぞれ独立にJSONへ変換できる。
- 第14章のセーブデータは `WorldState` と `History` を保存し、`Catalog` は版番号（`catalogVersion`）で参照する。
- 本番開発で作品データを作る作業は、`Catalog` と初期 `WorldState` を書く作業になる。

### 4.2 型定義

各フィールドのコメントの `[chNN]` は、そのフィールドを初めて導入する章を示す（第7節に一覧表がある）。

```ts
// ===== 識別子 =====
export type EntityId = string;      // 例: 'aria', 'rope', 'cliff-bottom'（ASCII。表示名は name に書く）
export type ActionId = string;      // 例: 'climb:vine', 'walk:village->fork'
export type CapabilityId = string;  // 例: 'climb', 'levitate', 'planning'
export type EventId = number;       // [ch04] 世界全体で単調増加する通し番号

// ===== パラメータと重要度 =====
/** 数値パラメータ。存在しないキーは 0 として扱う。 */
export type Params = Record<string, number>;                // [ch00] は { hp: number } から始める

/** 0: なし / 1: 低 / 2: 高 / 3: critical（使わなければ先へ進めない）*/
export type Level = 0 | 1 | 2 | 3;
export interface Significance {
  play: Level;   // ゲームプレイ系の重要度              [ch02]
  story: Level;  // 物語系の重要度 1=corroborative, 2以上=story object  [ch02]
}

// ===== エンティティ =====
export type EntityKind = 'agent' | 'object' | 'place';

export interface EntityBase {
  id: EntityId;                     // [ch00]
  kind: EntityKind;                 // [ch01]
  name: string;                     // [ch00] 表示名（日本語）
  state: string;                    // [ch01] 現在の状態名。人物は 'alive' | 'down' など
  params: Params;                   // [ch00]
  location: EntityId | null;        // [ch00] いる場所の Place、または持ち主の Agent。場所自体は null
  tags?: string[];                  // [ch09] 汎用行為の対象選び（例: 'sturdy', 'climbable'）
  significance?: Significance;      // [ch02] Agent/Place では省略可（既定値 {play:0, story:0}）
}

export interface Agent extends EntityBase {
  kind: 'agent';
  capabilities: Record<CapabilityId, number>;  // [ch02] 能力水準。0 または未定義は「持たない」
  goals?: Goal[];                              // [ch05] 目標（優先順）
  traits?: Record<string, number>;             // [ch05] 性格の重み（例: caution, curiosity）
  mode?: string;                               // [ch05] 有限状態機械のモード（例: 'explore', 'rest'）
  memory?: MemoryEntry[];                      // [ch06] 経験の記憶
  knowledge?: string[];                        // [ch06] 知っている事実（例: 'fact:hidden-path'）
  skills?: CompositeAffordance[];              // [ch06] 成功した計画を「技」として記憶したもの
  xp?: Record<CapabilityId, number>;           // [ch07] 能力ごとの経験値
  bornAt?: number;                             // [ch12]
  diedAt?: number;                             // [ch12]
}

/** Pinchbeck の分類の注釈。規則では使わず、分析と著者の整理に使う。 */
export type ObjectClass = 'static' | 'movable' | 'controlled' | 'free';

export interface StateTransition {
  from?: string;          // 省略時はどの状態からでも
  to: string;
  when: Condition[];      // '$self' で自分を参照する。すべて満たすと遷移する
}

export interface WorldObject extends EntityBase {
  kind: 'object';
  states: string[];                          // [ch02] 取りうる状態。長さ1なら 1STATE
  transitions?: StateTransition[];           // [ch02] 閾値による状態遷移
  presets?: Record<string, Params>;          // [ch02] 状態に入るときに上書きするパラメータ
  portable?: boolean;                        // [ch02] true なら持ち運べる（= Item）
  objectClass?: ObjectClass;                 // [ch02] 注釈
  significance: Significance;                // [ch02] 物には必須
  description?: Record<string, string>;      // [ch04] 状態ごとの描写文（物語系の手がかり）
  lore?: string;                             // [ch06] 読むと得られる文（story object 用）
  grantsKnowledge?: string[];                // [ch06] 読んだ人物が得る知識
  refEvent?: EventId;                        // [ch12] 過去の出来事を記念する物（墓・碑・噂）
}

/** 持ち運べる物。独立した型ではなく、WorldObject の部分型として扱う。 */
export type Item = WorldObject & { portable: true };

export interface Exit {                      // [ch09]
  to: EntityId;
  distance: number;
  when?: Condition[];                        // [ch11] 道が通れる条件（例: 橋の状態が 'intact'）
}

export interface Place extends EntityBase {
  kind: 'place';
  exits?: Exit[];                            // [ch09] 第3章までは移動を ActionDef として個別に書く
}

export type Entity = Agent | WorldObject | Place;

/** 場面 = Pinchbeck の環境集合。保存せず、世界状態から求める。 */
export interface Scene {                     // [ch02]
  place: Place;
  present: Entity[];      // その場所にいる人物・物（人物が持つ物は含めない）
}

// ===== 能力 =====
export interface CapabilityDef {
  id: CapabilityId;                          // [ch02]
  label: string;                             // [ch02] 例: '登攀'
  kind: 'behavioral' | 'cognitive';          // [ch02]
  maxLevel?: number;                         // [ch07]
  growth?: { xpPerUse: number; thresholds: number[] };  // [ch07] Lv1→2, 2→3 ... に必要な累積経験値
}

// ===== 条件（前提条件・目標・遷移条件で共通） =====
/** '$actor' = 行為者, '$target' = 対象, '$self' = 遷移規則の持ち主。それ以外はエンティティID。 */
export type Ref = '$actor' | '$target' | '$self' | EntityId;
export type CompareOp = '>=' | '<=' | '==' | '!=' | '>' | '<';

export type Condition =
  | { type: 'param'; of: Ref; key: string; op: CompareOp; value: number }   // [ch02]
  | { type: 'state'; of: Ref; is: string }                                   // [ch02]
  | { type: 'at'; of: Ref; place: EntityId }                                 // [ch02] of.location === place
  | { type: 'holds'; of: Ref; item: Ref }                                    // [ch02] item.location === of
  | { type: 'colocated'; a: Ref; b: Ref }                                    // [ch02]
  | { type: 'capability'; of: Ref; id: CapabilityId; min: number }           // [ch02]
  | { type: 'not'; cond: Condition }                                         // [ch02]
  | { type: 'any'; conds: Condition[] }                                      // [ch05] いずれかを満たす
  | { type: 'knows'; of: Ref; fact: string }                                 // [ch06]
  | { type: 'remembers'; of: Ref; about: EntityId; kind?: MemoryKind };      // [ch06]
// 配列で並べた条件はすべて満たす（AND）とする。

// ===== 効果 =====
export type Effect =
  | { type: 'addParam'; of: Ref; key: string; delta: number }               // [ch02]
  | { type: 'setParam'; of: Ref; key: string; value: number }               // [ch02]
  | { type: 'setState'; of: Ref; state: string }                            // [ch02]
  | { type: 'moveTo'; of: Ref; to: Ref }                                     // [ch02] 場所への移動、または持ち主への受け渡し
  | { type: 'damage'; of: Ref; amountFrom: { of: Ref; key: string } }       // [ch05] 第1章の戦闘規則を宣言化したもの
  | { type: 'learn'; of: Ref; fact: string }                                 // [ch06] 認知的効果
  | { type: 'raiseCapability'; of: Ref; id: CapabilityId; by: number }      // [ch07]
  | { type: 'remove'; of: Ref }                                              // [ch11] 環境集合から取り除く（location を null に）
  | { type: 'spawn'; entity: Entity };                                       // [ch11] 環境集合に加える

// ===== 行為 =====
/** 行為のコスト。stamina・mana は行為者のパラメータから引かれる。time はゲーム内時間を進める。 */
export type Cost = Partial<Record<'stamina' | 'mana' | 'time', number>>;

export interface ActionDef {
  id: ActionId;                              // [ch02]
  label: string;                             // [ch02] 例: '蔦をつたって岩棚へ登る'
  kind: 'behavioral' | 'cognitive';          // [ch02]
  target?: EntityId | { tag: string };       // [ch02] ID 指定 / [ch09] タグ指定（汎用行為）
  pre: Condition[];                          // [ch02]
  effects: Effect[];                         // [ch02]
  cost: Cost;                                // [ch02]
  chance?: { p: number; onFail: Effect[] };  // [ch05] 成功確率と失敗時の効果
  text?: { detail?: string; brief?: string };// [ch04] 叙述テンプレート
  tags?: string[];                           // [ch05] 方策の評価に使う分類（例: 'risky', 'magic'）
}

/** その時点で実行できる行為。計算値であり保存しない。 */
export interface Affordance {                // [ch02]
  actionId: ActionId;
  actorId: EntityId;
  targetId?: EntityId;
  kind: 'behavioral' | 'cognitive';
  cost: Cost;
}

/** 行為を実行できない理由。教材の説明と、研究での「惜しかった行為」の観察に使う。 */
export interface ActionCheck {               // [ch02]
  ok: boolean;
  failed: Condition[];                       // 満たされなかった条件（コスト由来の条件を含む）
}

export interface Catalog {
  version: string;                           // [ch02] 作品データの版。第14章のセーブで参照する
  capabilities: CapabilityDef[];             // [ch02]
  actions: ActionDef[];                      // [ch02]
}

// ===== 目標・記憶・複合アフォーダンス =====
export interface Goal {                      // [ch03]
  id: string;
  label: string;                             // 例: '崖上に着く'
  conditions: Condition[];                   // 前提条件と同じ言語で書く
}

export type MemoryKind = 'visited' | 'met' | 'succeeded' | 'failed' | 'read';
export interface MemoryEntry {               // [ch06]
  eventId: EventId;
  t: number;
  kind: MemoryKind;
  about: EntityId;
  valence: -1 | 0 | 1;                       // 良い経験か悪い経験か
}

/** Baker & Roberts の composite affordance。成功した計画を技として持つ。 */
export interface CompositeAffordance {       // [ch06]
  goalId: string;
  plan: ActionId[];                          // basic アフォーダンスの列
  learnedAt: EventId;
}

// ===== 世界状態 =====
export interface RngState { seed: number; s: number }  // [ch01] 乱数生成器の内部状態（保存できる形）

export interface WorldState {
  t: number;                                 // [ch01] 時刻。第3章までは行為1回=1、[ch08] から Cost.time で進む
  entities: Record<EntityId, Entity>;        // [ch01] 第1章は人物のみ、[ch02] から物・場所を含む
  seed?: number;                             // [ch09] 世界生成に使ったシード
  rng?: RngState;                            // [ch10] 世界の乱数状態（保存・再開のため）
}

// ===== イベント =====
export type EventType =
  | 'action'          // [ch00] 人物が行為を行った（移動も含む）
  | 'encounter'       // [ch00] 遭遇した
  | 'defeated'        // [ch00] 倒れた
  | 'battleEnd'       // [ch01] 戦闘が終わった
  | 'actionFailed'    // [ch05] 確率判定で失敗した
  | 'plan'            // [ch03] 計画を立てた（認知的行為）
  | 'growth'          // [ch07] 能力が伸びた・行為が増えた
  | 'meet'            // [ch10] 人物どうしが出会った
  | 'discover'        // [ch11] 場所や道を見つけた
  | 'born' | 'died';  // [ch12]

export interface Change {                    // [ch00] は hp のみ、[ch02] で一般化
  entity: EntityId;
  field: 'param' | 'state' | 'location' | 'capability' | 'knowledge';
  key?: string;                              // param / capability のキー
  before: number | string | null;
  after: number | string | null;
  via: 'effect' | 'cost' | 'transition';    // [ch02] 何による変化か
}

export interface WorldEvent {
  id?: EventId;                              // [ch04] 第3章までは省略
  t: number;                                 // [ch00]
  type: EventType;                           // [ch00]
  actor?: EntityId;                          // [ch00]
  action?: ActionId;                         // [ch00] 第0・1章は 'move' 'attack' などの固定ID
  target?: EntityId;                         // [ch00]
  place?: EntityId;                          // [ch00]
  outcome?: 'success' | 'failure' | 'victory' | 'defeat' | 'fled' | 'draw';  // [ch01]
  changes?: Change[];                        // [ch00]
  decision?: DecisionRecord;                 // [ch03] 研究用（第8節）
  causes?: EventId[];                        // [ch12] この出来事の原因になった出来事
}

export interface DecisionRecord {            // [ch03] 最小形、[ch05] で scores を追加
  goalId?: string;
  available: { behavioral: ActionId[]; cognitive: ActionId[] };  // 決定時点のアフォーダンス
  algorithm?: 'bfs' | 'dijkstra' | 'astar' | 'score';
  weight?: number;                           // A* の重み（1 なら通常の A*）
  expanded?: number;                         // 展開したノード数
  plan?: ActionId[];
  planCost?: number;
  exploited?: EntityId[];                    // 計画が利用した物（経路の識別子、8.3節）
  routesKnown?: number;                      // 見つかった別解の数（任意、計算が重い）
  scores?: Record<ActionId, number>;         // [ch05]
}
```

### 4.3 主要な関数（規則の入口）

型定義と対になる、規則側の関数の形を示す。実装の詳細は `architecture.md` の章別設計に書く。

```ts
// rules/
param(e: Entity, key: string): number                        // 未定義は 0
evaluate(c: Condition, ctx: RuleContext): boolean
checkAction(world: WorldState, catalog: Catalog, actorId: EntityId, actionId: ActionId): ActionCheck
availableAffordances(world: WorldState, catalog: Catalog, actorId: EntityId): Affordance[]
applyAction(world: WorldState, catalog: Catalog, actorId: EntityId, actionId: ActionId)
  : { world: WorldState; event: WorldEvent }
sceneOf(world: WorldState, placeId: EntityId): Scene

interface RuleContext { world: WorldState; actorId?: EntityId; targetId?: EntityId; selfId?: EntityId }
```

### 4.4 評価の意味論（規則）

教材のどの章でも同じ意味で動くよう、評価の順序と既定値を次のとおり固定する。

1. **参照の解決**：`'$actor'`・`'$target'`・`'$self'` は文脈（`RuleContext`）から、それ以外はエンティティIDとして解決する。解決できない参照を含む条件は偽とし、効果は例外を投げる（作品データの誤りを早く見つけるため）。
2. **パラメータの既定値**：存在しないパラメータは0とみなす。
3. **コストの展開**：`cost` の `stamina` と `mana` は、評価器が自動的に次の2つに展開する。
   - 前提条件 `{ type:'param', of:'$actor', key:k, op:'>=', value:v }`
   - 効果 `{ type:'addParam', of:'$actor', key:k, delta:-v }`（`Change.via = 'cost'`）

   作者がコストを前提条件や効果として重ねて書く必要はない。
4. **実行の順序**（`applyAction`）：
   1. `checkAction` で前提条件とコスト条件を確かめる。満たさなければ実行しない。
   2. 世界状態を複製する（`structuredClone`）。元の世界状態は変更しない。
   3. コストを引く。
   4. `effects` を書かれた順に適用する。
   5. 変化したエンティティについて `transitions` を評価する。1回の行為につき、各エンティティで最初に条件を満たした規則を1つだけ適用する（連鎖はしない）。遷移先に `presets` があれば、その値でパラメータを上書きする。
   6. すべての変化を `Change[]` として記録し、`WorldEvent` を作る。
5. **決定性**：宣言的な規則（条件・効果・遷移）の評価に乱数は使わない。乱数を使うのは、第1章の戦闘規則（ダメージの揺らぎと逃走判定）、`chance`（第5章以降）、方策だけとする。その場合も、乱数生成器（`lib/rng` の `Rng`。保存するときは `RngState`）を必ず引数で渡す。`Math.random` は使わない。
6. **列挙の順序**：`availableAffordances` は `ActionId` の辞書順（JavaScriptの `<` 比較）で返す。探索結果の再現性は、この順序に依存する。
7. **知覚の範囲**：暗黙の共在条件は置かない。「同じ場所にいること」「見えること」が必要なら、`at`・`colocated` などの条件として明示的に書く（崖下から崖上の岩の突起に鉤縄を掛けるような行為を書けるようにするため）。

### 4.5 JSON化の制約

`Catalog`・`WorldState`・`WorldEvent` には、次の値だけを入れる。

- 文字列、有限の数値、真偽値、`null`、配列、プレーンなオブジェクト
- 入れないもの：関数、`undefined` を値として持つキー、`Date`、`Map`、`Set`、クラスのインスタンス、`NaN`、`Infinity`

第2章から、各章に「`JSON.parse(JSON.stringify(x))` が `x` と深く等しい」ことを確かめるテストを置く。作品データは第13章まではTypeScriptのモジュールとして `satisfies Catalog` 付きで書き、第14章でJSONファイルからの読み込みと検証に移す。

### 4.6 例：崖の問題をデータで書く（第2・3章）

```ts
// 物（抜粋）
const vine: WorldObject = {
  id: 'vine', kind: 'object', name: '蔦', location: 'cliff-bottom',
  state: 'intact', states: ['intact', 'torn'],
  params: { strength: 2 },
  transitions: [{ from: 'intact', to: 'torn',
                  when: [{ type: 'param', of: '$self', key: 'strength', op: '<=', value: 0 }] }],
  objectClass: 'controlled',
  significance: { play: 2, story: 0 },
};

const anchor: WorldObject = {
  id: 'anchor', kind: 'object', name: '岩の突起', location: 'cliff-top',
  state: 'solid', states: ['solid', 'crumbled'], params: {},
  objectClass: 'static',
  significance: { play: 1, story: 0 },   // 設計上は「ただの岩」。ロープと組み合わさると経路の要になる
};

const rope: Item = {
  id: 'rope', kind: 'object', name: '鉤縄', location: 'shed', portable: true,
  state: 'coiled', states: ['coiled', 'hooked'], params: {},
  objectClass: 'free',
  significance: { play: 2, story: 0 },
};

// 行為（抜粋）
const climbVine: ActionDef = {
  id: 'climb:vine', label: '蔦をつたって岩棚へ登る', kind: 'behavioral', target: 'vine',
  pre: [
    { type: 'at', of: '$actor', place: 'cliff-bottom' },
    { type: 'state', of: 'vine', is: 'intact' },
    { type: 'capability', of: '$actor', id: 'climb', min: 1 },
  ],
  effects: [
    { type: 'moveTo', of: '$actor', to: 'ledge' },
    { type: 'addParam', of: 'vine', key: 'strength', delta: -1 },
  ],
  cost: { stamina: 3 },
};

const hookRope: ActionDef = {
  id: 'hook:rope', label: '鉤縄を投げて岩の突起に掛ける', kind: 'behavioral', target: 'anchor',
  pre: [
    { type: 'at', of: '$actor', place: 'cliff-bottom' },
    { type: 'holds', of: '$actor', item: 'rope' },
    { type: 'state', of: 'rope', is: 'coiled' },
    { type: 'state', of: 'anchor', is: 'solid' },
  ],
  effects: [
    { type: 'moveTo', of: 'rope', to: 'cliff-bottom' },  // 崖下に垂れ下がる
    { type: 'setState', of: 'rope', state: 'hooked' },
  ],
  cost: { stamina: 1 },
};
```

蔦の `strength` が0になると、遷移規則が働いて状態が `torn` になる。すると `climb:vine` の前提条件（`state: intact`）が満たされなくなり、蔦を登るアフォーダンスは誰にとっても消える。Pinchbeckが例に挙げた「壊れる木箱」と同じ構造である。逆に、ある人物が鉤縄を掛けると、その場にいる**別の人物**にも「ロープを登る」アフォーダンスが現れる。環境の変化が他者のアフォーダンスを変えることを、データだけで表せる。

### 4.7 主な代替案と選定理由

| 論点 | 案A（採用） | 案B | 選定理由 |
|---|---|---|---|
| 前提条件・効果の表し方 | 少数の型を持つ宣言的データ（判別共用体） | 述語関数 `(world) => boolean` | JSONに保存できる（第14章、本番の作品データ）。条件を日本語で説明でき、研究で分析できる。表現力の不足は、効果の種類（例：`damage`）を規則側に足して補う。データに関数は入れない。 |
| 行為の一般性 | 対象をIDで固定した具体的な行為＋`'$actor'`変数。第9章でタグ指定を追加 | PDDLのような変数つきスキーマ | 学習者が1件の行為定義を読めば意味が分かる。第9章の生成世界では対象が増えるので、そこでタグ指定を入れる。 |
| エンティティの持ち方 | 1つの `entities` 辞書＋`kind`による判別 | 人物・物・場所を別の配列で持つ | 参照（`Ref`）、ID、歴史（第12章）を一様に扱える。Pinchbeckの「すべては物」という立場にも合う。型の絞り込みは `getAgent()` などの補助関数で行う。 |
| アフォーダンスの保存 | 保存しない（毎回計算する） | 物に `affords: ActionId[]` を持たせる | 関係として計算する方が、Baker & Robertsの立場に忠実である。重複データの不整合も起きない。物から見た行為の一覧が必要なら、行為定義の参照から逆引きする。 |
| 重要度の表し方 | `{ play, story }` の2軸、0〜3 | `diegesis: 'gameplay' \| 'corroborative' \| 'story'` ＋1軸 | Pinchbeckは両方の系統にそれぞれ重要度の尺度があると述べている。2軸にしておけば、corroborativeやstory objectは値から導ける。 |
| 状態の更新 | 複製して新しい世界状態を返す（不変更新） | その場で書き換え、取り消し記録を持つ | 探索（第3章）で状態を分岐させやすく、テストも書きやすい。性能は教材の規模なら問題にならない。 |
| イベントと世界状態 | 別々に持つ（`History`） | `WorldState` の中にログを持つ | 探索のたびにログを複製せずに済む。状態の同一性判定（`stateKey`）にもログが混ざらない。 |

**影響範囲とロールバック方針**：型は `domain/types.ts` の1か所に集める。採用案を撤回する場合も、影響は `rules/` の評価器と `content/` のデータに限られる。特に条件の表し方を関数に戻す場合は、`evaluate()` の実装を差し替えるだけで済み、計画器（`planner/`）は変更しなくてよい（計画器は `SearchProblem` インタフェースにしか依存しないため）。

## 5. 状態とパラメータの扱いの詳細

### 5.1 人物の状態

- 第1章から、人物は `state: 'alive' | 'down'` を持つ。`hp <= 0` になると `down` に変わる。第1章では手続き的なコードでこれを判定し、第5章で遷移規則（`transitions`）による表現に移す。`Agent` も遷移規則を持てるよう、第5章で `transitions` を `EntityBase` に移す（データの形は変わらない）。
- 第5章の有限状態機械のモード（探索・休息など）は、生死の `state` とは別に `mode` で持つ。Pinchbeckの「状態＝パラメータの媒介の組」に近いのは `mode` の方である。ただし、生死のように規則で強制される状態と、方策が選ぶモードとを分けておくと、教材として理解しやすい。

### 5.2 位置

- 位置は `location` という1つのフィールドで表す。人物と物はその場所の `Place` のIDを、持たれている物は持ち主の `Agent` のIDを、場所自体は `null` を持つ。
- 物を拾うことは `moveTo` で物の `location` を行為者に変えることであり、物の状態は変わらない。Pinchbeckが救急キットの取得について「物体の状態変化ではなく、環境集合が減ることだ」と述べたことに対応する。
- 地図の座標は、場所の `params.x`・`params.y` として持つ。Pinchbeckが静的な木箱のパラメータを x, y, z 座標としたことに対応する。A*のヒューリスティックはこの値を使う（第3章）。

## 6. 認知的アフォーダンスの扱い

| 認知的アフォーダンス | 媒介する能力 | 導入章 | モデル上の表現 |
|---|---|---|---|
| 知覚（利用可能な行為を知る） | なし（全員が持つ） | ch02 | `availableAffordances()` |
| 計画（行為列を探索する） | `planning` Lv | ch03（道具として）、ch05（人物の能力として） | `type:'plan'` のイベント。Lvごとに探索ノード数の上限を決める（例：Lv0=計画しない、Lv1=20、Lv2=200、Lv3=2000） |
| 記憶（経験を参照する） | `memory` Lv | ch06 | `Agent.memory`、条件 `remembers`。Lvは保持件数の上限 |
| 読解（物語系の物から知識を得る） | `reading` Lv | ch06 | `kind:'cognitive'` の行為 `read:<物ID>`、効果 `learn`、条件 `knows` |
| 技の想起（複合アフォーダンスの再利用） | `memory` Lv | ch06 | `Agent.skills`。探索の前に技を試す |

計画能力を持たない人物（Lv0）は、目標を直接満たす1手の行為か、評価値の高い1手しか選べない。計画Lvが上がると、より長い行為の組合せ（ロープを取りに戻るなど）を見つけられる。認知的アフォーダンスが行動的アフォーダンスの組合せを広げる、というBaker & Robertsの相互依存の具体例として、第5章と第7章でこれを示す。

## 7. 章ごとの導入計画

序章〜第3章で導入するものは、第16章の最終形の**部分集合**になるよう設計する。前の章のデータが、後の章でも同じJSONの形で読めることを原則とする（第14章で版番号による移行を学ぶまでは、形を壊す変更をしない）。

| 章 | 新しく導入する型・フィールド・規則 | アフォーダンス文献との関係 |
|---|---|---|
| 序章 | `Agent`（`id`, `name`, `params: { hp }`, `location`）、`WorldEvent`（`t`, `type`, `actor`, `action`, `target`, `place`, `changes`）、`Change`（hpのみ） | 人物を「パラメータを持つ物」として書き始める（P1の入口） |
| 1 | `EntityBase.kind`・`state`（alive/down）、戦闘用パラメータ（`maxHp`, `atk`, `def`, `agi`）、`WorldState`（`t`, `entities`）、`RngState`、`outcome` | パラメータの閾値（hp≦0）による状態変化を、まず手続き的に書く |
| 2 | `Params` の一般化と `param()`、`Significance`、`WorldObject`（`states`, `transitions`, `presets`, `portable`, `objectClass`）、`Item`、`Place`、`Scene`、`CapabilityDef`、`Agent.capabilities`、`Condition`（param/state/at/holds/colocated/capability/not）、`Effect`（addParam/setParam/setState/moveTo）、`Cost`、`ActionDef`、`Affordance`、`ActionCheck`、`Catalog`、`Change.via` | Pinchbeckの状態・パラメータ・閾値遷移・重要度、Baker & Robertsの「能力×環境＝アフォーダンス」 |
| 3 | `Goal`、`SearchProblem`（計画器側）、`stateKey`、`DecisionRecord`（available, algorithm, weight, expanded, plan, planCost, exploited）、`type:'plan'`、場所の座標パラメータ、経路の列挙 | composite＝計画、計画は認知的アフォーダンス、複数の解決経路 |
| 4 | `WorldEvent.id`、`ActionDef.text`、`WorldObject.description`、イベントの重み付け（salience）、詳細ログ／簡潔ログ | 物語系アフォーダンス（SD／STORY）としてのログ |
| 5 | `Agent.goals`・`traits`・`mode`、`ActionDef.chance`・`tags`、`Condition.any`、`Effect.damage`（戦闘を `ActionDef` に移す）、`transitions` を `EntityBase` に移動、`DecisionRecord.scores`、`planning` 能力 | agentのSELECT、動機の成分、計画Lvによる媒介 |
| 6 | `MemoryEntry`、`Agent.memory`・`knowledge`・`skills`、`CompositeAffordance`、`Condition.knows`・`remembers`、`Effect.learn`、`WorldObject.lore`・`grantsKnowledge`、`memory`・`reading` 能力 | 記憶と読解は認知的アフォーダンス。story objectは人物にとっても知識の源になる |
| 7 | `CapabilityDef.growth`・`maxLevel`、`Agent.xp`、`Effect.raiseCapability`、`type:'growth'`、レパートリーと `compareRepertoire()` | 成長＝利用可能なアフォーダンス集合の拡大。包含による複雑さの比較 |
| 8 | `Cost.time`、時刻の進め方、行動サイクル、人生の要約 | 時間の中での能力の変化（複雑さは時点の性質） |
| 9 | `Place.exits`・`Exit`、`WorldState.seed`、`EntityBase.tags`、`ActionDef.target: { tag }`、場所の生成 | 汎用行為。物の意外な組合せが**作者の想定外**に起こりうるようになる |
| 10 | 複数人物の処理順序、`type:'meet'`、`WorldState.rng` | 他者のいる環境が、新しいアフォーダンスを生む |
| 11 | `Exit.when`、`Effect.remove`・`spawn`、`type:'discover'` | Pinchbeckの環境集合の変化（CEP）。ある人物の行為が他者のアフォーダンスを変える |
| 12 | `WorldEvent.causes`、`WorldObject.refEvent`、`Agent.bornAt`・`diedAt`、`type:'born'`・`'died'`、歴史の索引 | 過去の出来事が story object として世界に残る |
| 13 | 表示用の値（View Model）。ドメインの型は増やさない | — |
| 14 | `SaveData`（`schemaVersion`, `catalogVersion`, `world`, `history`, `meta`）、読み込み時の検証、移行 | 宣言的データであることの利点が表に出る |
| 15 | 時間進行の制御（ドメインの型は増やさない） | — |
| 16 | `RunMeta`、研究用の書き出し（JSON Lines） | 研究用フックの完成 |

### 7.1 序章〜第3章の整合性の確認事項

- 序章の `params: { hp: number }` と、第2章の `Params = Record<string, number>` は、JSONとしては同じ形である。第2章では型を一般化するだけで、データを書き換えない。
- 序章・第1章のイベントは `type: 'action'` と `action: 'move' | 'attack' | 'defend' | 'flee'` を使う。第2章以降の行為イベントと同じ形になる。
- 第1章の戦闘規則（`max(1, atk - def ± 揺らぎ)`）は手続き的なコードで書く。第5章で `Effect.damage` と `chance` を使った `ActionDef` に移すが、パラメータ名（`hp`, `atk`, `def`, `agi`）と、イベントの形は変えない。
- 第3章の移動は、`content/` の補助関数 `walkActions(places, paths)` で `ActionDef` を生成する。第9章ではこの `paths` を `Place.exits` に移し、移動の行為を汎用化する。

## 8. 研究用フック

### 8.1 方針

- イベントログを唯一の一次データとする。指標は、ログと作品データ（`Catalog`・初期 `WorldState`）から**あとで計算する**純粋関数として書く。ログには、あとから復元できない情報だけを足す。
- 足す情報は、決定時点の `DecisionRecord` だけに絞る。計算の重い項目（別解の数など）は任意とし、既定では記録しない。
- 再現できることを最優先にする。シード、作品データの版、コードの版を、実行ごとに記録する。

### 8.2 記録するもの

1. **行為イベント**：`type:'action'`。`changes` に `via`（効果・コスト・遷移）付きのすべての変化を入れる。「何をしたか」と「どう状況が変わったか」が、ここから復元できる（仕様書6.3）。
2. **計画イベント**：`type:'plan'`（認知的行為）。`decision` に、そのとき利用できたアフォーダンス、探索法、展開ノード数、計画、計画のコスト、利用した物を入れる。続く行為イベントは、第12章から `causes` で計画イベントを指す。
3. **実行のメタ情報**（第16章で `RunMeta` として正式化。それまでは第3章のCLIがログの先頭行に出力する）：

```ts
interface RunMeta {
  runId: string;
  seed: number | null;
  catalogVersion: string;
  schemaVersion: number;
  codeVersion: string;      // git のコミットID
  scenarioId: string;
  startedAt: string;        // ISO 8601
}
```

書き出しの形式はJSON Lines（1行目が `RunMeta`、2行目以降が `WorldEvent`）とする。統計ソフトや表計算ソフトに読み込みやすいためである。

### 8.3 指標

指標は少数にとどめ、それぞれに導入章を割り当てる。

| 指標 | 定義 | 導入章 | 根拠 |
|---|---|---|---|
| 利用可能アフォーダンス数 | 決定時点の `available.behavioral.length` と `available.cognitive.length` | ch03 | Baker & Robertsの「利用できる範囲」 |
| 経路の識別子（route signature） | 計画が利用した**物と能力**の集合。物は、場所と行為者以外のエンティティのうち、行為の対象と、条件・効果で参照されるもの。能力は、条件 `capability` で要求されたもので、`cap:` を付けて区別する。IDの辞書順に並べる。例：直接登る＝`{cap:climb, cliff}`、蔦＝`{cap:climb, vine}`、ロープ＝`{anchor, cap:climb, rope}`、浮遊の魔法＝`{cap:levitate}` | ch03 | 「どの能力でどの物を組み合わせて解いたか」を、行為の細かな違いと切り離して比べるため。能力×環境というBaker & Robertsのアフォーダンスの捉え方に合わせる |
| 解決経路の数 | コストの上限以内で目標に届く計画を列挙し、経路の識別子のうち**包含について極小なもの**の数を数えたもの。極小に限るのは、「ロープを持ったまま蔦を登る」（`{cap:climb, rope, vine}`）のような、余計な物を含むだけの計画を別解として数えないためである | ch03 | 仕様書6.3の「複数の解決経路」 |
| 間接性 | 採用した計画の手数 − 目標に届く最短手数（BFSの手数） | ch03 | 遠回りしてでも安く済ませたかどうか |
| 重要度の逸脱（significance surprise） | 計画が利用した物のうち、設計時の `significance.play <= 1` のもの。作者が「ただの岩」とした物が経路の要になった、という観察を拾う | ch03（記録）、ch09（意味を持ち始める） | Pinchbeckの「重要度は遊び方で変わる」（重力銃と樽） |
| 経路の希少度 | 複数回・複数人物の実行で、その経路の識別子が現れた割合 | ch10（集計） | 「奇策」は相対的なものなので、集団の中での珍しさで測る |
| レパートリー | 状況を問わず、能力の条件だけで実行できる行為定義の集合（行動的／認知的に分ける） | ch07 | Baker & Robertsの能力としての複雑さ |
| レパートリーの比較 | 2人の人物、または同じ人物の2時点について、集合の包含関係を `'greater' \| 'less' \| 'equal' \| 'incomparable'` で返す | ch07 | 包含関係がなければ「比較できない」とする（論文の不定性） |
| アフォーダンス型の分布 | 各 `Change` をPinchbeckの型（COwnP／COwnL／COP／CEP）に分類して数える | ch04 | 1回の実行が、どの種類の変化から成るかを要約する |

**Pinchbeckの型への分類規則**（分析関数 `classifyChange()`）：

| 変化 | 分類 |
|---|---|
| 行為者自身の `location` | COwnL |
| 行為者自身の `param` / `state` / `capability` / `knowledge` | COwnP |
| 他のエンティティの `location` / `param` / `state` | COP（物を拾うことも、物の位置を変えるのでCOPに入る） |
| `remove` / `spawn` による環境集合の増減 | CEP |
| 前提条件の `at`・`state` が行為を可能にした／妨げたこと | C/E（`checkAction` の結果から数える） |
| `learn`、および story object を対象とする行為 | STORY |
| corroborative な物（`story === 1`）の描写がログに出たこと | SD（叙述層で数える） |

### 8.4 「機転・奇策」の操作的定義（作業仮説）

教材MVPでは、次の条件をすべて満たす計画イベントを「機転の候補」としてタグづけするにとどめる。最終的な判断は、論文の分析で人が行う。

1. 目標に届く経路が2通り以上あった（解決経路の数 ≥ 2）。
2. 採用した計画が、直接的な最短手数の経路と異なる（間接性 > 0、または経路の識別子がBFSの解と異なる）。
3. 計画が2つ以上の物を組み合わせている（経路の識別子のうち、`cap:` の付かない要素の数 ≥ 2）。

第3章の例題（登攀Lv3のアリア）では、解決経路は `{anchor, cap:climb, rope}`（7手・体力7）、`{cap:climb, vine}`（4手・体力8）、`{cap:climb, cliff}`（3手・体力11）の3通りある。このうちロープの経路がこの条件を満たす。重要度の逸脱（`anchor` の `play` は1）も同時に観察できる。ただし第3章の時点では、この組合せを作者が行為定義として明示的に書いている。作者の想定外の組合せが起こりうるのは、汎用行為（タグ指定）を導入する第9章以降である。この限界を教材と論文の双方で明記する。

### 8.5 やらないこと（過剰設計の回避）

- すべての決定で別解を全列挙すること（既定では行わない。分析用の再実行で行う）。
- 指標をゲーム内の判断に使うこと（観察の道具にとどめ、ゲームの規則とは混ぜない）。
- 独自の分析用データベースを作ること（JSON Linesで書き出して外部のツールで分析する）。

## 9. 「ログを読んで物語を想像する」こととの関係

### 9.1 ログは読み手にとっての story object である

読むRPGの読み手は、人物を操作しない。読み手が使えるアフォーダンスは、Pinchbeckの物語系の2種類だけである。

- **SD（物語世界を支える）**：corroborative な物の描写（「崖の上で風が鳴っている」）。筋は進めないが、世界の手触りを保つ。
- **STORY（筋の理解を進める）**：状態の変化を伴う出来事（「蔦が切れた」「鉤縄が岩の突起に掛かった」）。読み手の「次に何が起きるか」の予測を変える。

Pinchbeckは「解釈もまたアフォーダンスに支えられる」と述べた。読むRPGでは、ログの1行1行が、解釈を引き出すための物として働く。そこで叙述層（`narration/`）を、イベントを物語系アフォーダンスに変換する層として設計する。

### 9.2 重要度から「読ませる量」を決める

第4章の詳細ログと簡潔ログは、イベントの重み（salience）で切り替える。

```text
salience(event) =
    max(関係する物の significance.play, significance.story)   // 0..3
  + （状態の変化を含むなら +1）
  + （行為の失敗、または人物の down を含むなら +1）
  + （機転の候補なら +1）                                   // 8.4節
```

- 詳細ログ：すべてのイベントを表示する。
- 簡潔ログ：salience が閾値（既定値2）以上のイベントだけを表示する。

簡潔ログで省かれた部分は、読み手が想像で埋める「余白」になる。数字（体力20→13）と短い文の組合せは、読み手が「その間に何があったか」を推し量る手がかりになる。第4章では、同じイベント列を2通りに表示し、読み手が受け取る物語の違いを観察する演習を設ける。

### 9.3 人物にとっての story object

story object（`significance.story >= 2`、`lore` を持つ物）は、読み手だけでなく人物にとっても意味を持つ。第6章で、人物が石碑を「読む」認知的行為を導入する。読むことで得た知識（`knows`）は、隠れた道を通る行為などの前提条件を満たす。Pinchbeckの「日誌の暗号が日誌を critical なゲームプレイ物体に変える」に対応する。こうして、読み手が読む物語と、人物が読む物語が、同じデータの上で重なる。

### 9.4 歴史が story object になる

第12章では、ある出来事を記念する物（墓、碑、噂）を `spawn` で世界に加え、`refEvent` で元の出来事を指す。後の時代の人物はその物に出会い（読み）、読み手はログからその由来をたどる。こうして、過去の出来事が、後の人物と読み手の両方にとっての story object になる。仕様書の第3部の完成条件（過去の人物・場所の再登場）は、この仕組みで満たす。

## 10. 本番開発への引き継ぎと未決事項

### 10.1 本番で引き継ぐもの

- `Catalog` と `WorldState` の分離、宣言的な条件・効果、計算値としてのアフォーダンス
- `Significance` の2軸と、設計時の値としての扱い
- イベントの `changes`・`decision`・`causes`
- 指標の定義（8.3節）と書き出し形式（JSON Lines）

### 10.2 未決事項（本番開発で決める）

| 事項 | 現状の扱い | 決める時期 |
|---|---|---|
| 汎用行為の対象選びの表現力（タグだけで足りるか） | 第9章でタグ1つの指定のみ | 本番の作品データを書き始める前 |
| 確率の媒介（能力Lvで成功確率を変えるか） | 第5章は固定の `p` のみ | 本番開発 |
| 知覚の範囲（見えない物の扱い） | 条件で明示する | 第10章の実装時に再検討 |
| 機転の判定基準 | 8.4節の作業仮説 | 論文の分析計画を立てるとき |
| 行動的／認知的の境界 | 「主な効果が内部に及ぶなら認知的」という操作的定義 | 論文で立場を明記する |

### 10.3 リスク

- **語彙の膨張**：条件・効果の種類が増えると、教材として理解しにくくなる。新しい種類は、章の課題で必要になったときに1つずつ足す。各章で足すのは多くて2〜3種類にとどめる。
- **探索の状態爆発**：状態の同一性判定にすべてのパラメータを含めるため、物が増えると探索が重くなる。第3章では、コストとして消費する資源（体力）を判定から外す（`architecture.md` の第3章を参照）。第9章以降は、計画Lvによる展開ノード数の上限で抑える。
- **文献の過剰な読み込み**：両論文は、ゲームのデータ構造を提案するために書かれたものではない。この文書の対応表は**設計上の解釈**であり、論文の主張そのものではない。論文の本文で引用するときは、この区別を保つ。
