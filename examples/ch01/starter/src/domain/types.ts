// 第1章までの型。affordance-model.md 4.2 の型の部分集合。

/** 戦闘に使うパラメータ。 */
export interface CombatParams {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  agi: number;
}

/** 人物。第1章から kind と state を持つ。 */
export interface Agent {
  id: string;
  kind: 'agent';
  name: string;
  state: 'alive' | 'down';
  params: CombatParams;
  location: string;
}

/** 世界状態。第1章では人物だけを持つ。 */
export interface WorldState {
  t: number;
  entities: Record<string, Agent>;
}

/** 戦闘で選べる行動。 */
export type BattleAction = 'attack' | 'defend' | 'flee';

/** 方策：世界状態を見て、自分の行動を1つ選ぶ関数。 */
export type Policy = (world: WorldState, selfId: string, enemyId: string) => BattleAction;

/** 戦闘の結末。success / failure は逃走の判定に使う。 */
export type Outcome = 'success' | 'failure' | 'victory' | 'defeat' | 'fled' | 'draw';

/** 序章の冒険の道のりの1手。 */
export type Step =
  | { kind: 'move'; to: string }
  | { kind: 'encounter'; enemy: { id: string; name: string; power: number } }
  | { kind: 'rest'; amount: number };

/** パラメータの変化の記録。第1章でも hp の変化だけを扱う。 */
export interface Change {
  entity: string;
  field: 'param';
  key: 'hp';
  before: number;
  after: number;
}

/** 起きた出来事の記録。 */
export interface WorldEvent {
  t: number;
  type: 'action' | 'encounter' | 'defeated' | 'battleEnd';
  actor: string;
  action?: 'depart' | 'move' | 'rest' | BattleAction;
  target?: string;
  place?: string;
  outcome?: Outcome;
  changes?: Change[];
}
