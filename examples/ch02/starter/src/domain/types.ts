// 第2章までの型。affordance-model.md 4.2 の型のうち [ch00]〜[ch02] の部分。

// ===== 識別子 =====
export type EntityId = string; // 例: 'aria', 'rope', 'cliff-bottom'
export type ActionId = string; // 例: 'climb:vine'
export type CapabilityId = string; // 例: 'climb', 'levitate'

// ===== パラメータと重要度 =====
/** 数値パラメータ。存在しないキーは 0 として扱う（rules/params.ts の param）。 */
export type Params = Record<string, number>;

/** 0: なし / 1: 低 / 2: 高 / 3: critical（使わなければ先へ進めない） */
export type Level = 0 | 1 | 2 | 3;
export interface Significance {
  play: Level; // ゲームプレイ系の重要度
  story: Level; // 物語系の重要度 1=corroborative, 2以上=story object
}

// ===== エンティティ =====
export type EntityKind = 'agent' | 'object' | 'place';

export interface EntityBase {
  id: EntityId;
  kind: EntityKind;
  name: string; // 表示名（日本語）
  state: string; // 現在の状態名。人物は 'alive' | 'down'
  params: Params;
  location: EntityId | null; // いる場所の Place、または持ち主の Agent。場所自体は null
  significance?: Significance; // Agent/Place では省略可
}

export interface Agent extends EntityBase {
  kind: 'agent';
  capabilities: Record<CapabilityId, number>; // 能力水準。0 または未定義は「持たない」
}

/** Pinchbeck の分類の注釈。規則では使わず、分析と著者の整理に使う。 */
export type ObjectClass = 'static' | 'movable' | 'controlled' | 'free';

export interface StateTransition {
  from?: string; // 省略時はどの状態からでも
  to: string;
  when: Condition[]; // '$self' で自分を参照する。すべて満たすと遷移する
}

export interface WorldObject extends EntityBase {
  kind: 'object';
  states: string[]; // 取りうる状態。長さ1なら 1STATE
  transitions?: StateTransition[]; // 閾値による状態遷移
  presets?: Record<string, Params>; // 状態に入るときに上書きするパラメータ
  portable?: boolean; // true なら持ち運べる（= Item）
  objectClass?: ObjectClass; // 注釈
  significance: Significance; // 物には必須
}

/** 持ち運べる物。独立した型ではなく、WorldObject の部分型として扱う。 */
export type Item = WorldObject & { portable: true };

export interface Place extends EntityBase {
  kind: 'place';
}

export type Entity = Agent | WorldObject | Place;

/** 場面 = Pinchbeck の環境集合。保存せず、世界状態から求める。 */
export interface Scene {
  place: Place;
  present: Entity[]; // その場所にいる人物・物（人物が持つ物は含めない）
}

// ===== 能力 =====
export interface CapabilityDef {
  id: CapabilityId;
  label: string; // 例: '登攀'
  kind: 'behavioral' | 'cognitive';
}

// ===== 条件（前提条件・遷移条件で共通） =====
/** '$actor' = 行為者, '$target' = 対象, '$self' = 遷移規則の持ち主。それ以外はエンティティID。 */
export type Ref = '$actor' | '$target' | '$self' | EntityId;
export type CompareOp = '>=' | '<=' | '==' | '!=' | '>' | '<';

export type Condition =
  | { type: 'param'; of: Ref; key: string; op: CompareOp; value: number }
  | { type: 'state'; of: Ref; is: string }
  | { type: 'at'; of: Ref; place: EntityId } // of.location === place
  | { type: 'holds'; of: Ref; item: Ref } // item.location === of
  | { type: 'colocated'; a: Ref; b: Ref }
  | { type: 'capability'; of: Ref; id: CapabilityId; min: number }
  | { type: 'not'; cond: Condition };
// 配列で並べた条件はすべて満たす（AND）とする。

// ===== 効果 =====
export type Effect =
  | { type: 'addParam'; of: Ref; key: string; delta: number }
  | { type: 'setParam'; of: Ref; key: string; value: number }
  | { type: 'setState'; of: Ref; state: string }
  | { type: 'moveTo'; of: Ref; to: Ref }; // 場所への移動、または持ち主への受け渡し

// ===== 行為 =====
/** 行為のコスト。stamina・mana は行為者のパラメータから引かれる。 */
export type Cost = Partial<Record<'stamina' | 'mana', number>>;

export interface ActionDef {
  id: ActionId;
  label: string; // 例: '蔦をつたって岩棚へ'
  kind: 'behavioral' | 'cognitive';
  target?: EntityId;
  pre: Condition[];
  effects: Effect[];
  cost: Cost;
}

/** その時点で実行できる行為。計算値であり保存しない。 */
export interface Affordance {
  actionId: ActionId;
  actorId: EntityId;
  targetId?: EntityId;
  kind: 'behavioral' | 'cognitive';
  cost: Cost;
}

/** 行為を実行できない理由。 */
export interface ActionCheck {
  ok: boolean;
  failed: Condition[]; // 満たされなかった条件（コスト由来の条件を含む）
}

export interface Catalog {
  version: string; // 作品データの版
  capabilities: CapabilityDef[];
  actions: ActionDef[];
}

// ===== 世界状態 =====
export interface WorldState {
  t: number; // 時刻。第3章までは行為1回=1
  entities: Record<EntityId, Entity>;
}

// ===== イベント =====
export type EventType = 'action' | 'encounter' | 'defeated' | 'battleEnd';

export interface Change {
  entity: EntityId;
  field: 'param' | 'state' | 'location';
  key?: string; // param のキー
  before: number | string | null;
  after: number | string | null;
  via: 'effect' | 'cost' | 'transition'; // 何による変化か
}

export interface WorldEvent {
  t: number;
  type: EventType;
  actor?: EntityId;
  action?: ActionId; // 第0・1章は 'move' 'attack' などの固定ID
  target?: EntityId;
  place?: EntityId;
  outcome?: 'success' | 'failure' | 'victory' | 'defeat' | 'fled' | 'draw';
  changes?: Change[];
}

// ===== 第0・1章から引き継ぐ型 =====
/** 戦闘で選べる行動。 */
export type BattleAction = 'attack' | 'defend' | 'flee';

/** 方策：世界状態を見て、自分の行動を1つ選ぶ関数。 */
export type Policy = (world: WorldState, selfId: EntityId, enemyId: EntityId) => BattleAction;

/** 序章の冒険の道のりの1手。 */
export type Step =
  | { kind: 'move'; to: EntityId }
  | { kind: 'encounter'; enemy: { id: EntityId; name: string; power: number } }
  | { kind: 'rest'; amount: number };
