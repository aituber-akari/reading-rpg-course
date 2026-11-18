// 序章で使う型。affordance-model.md 4.2 の型の部分集合から始める。

/** 人物。序章ではパラメータは hp だけを持つ。 */
export interface Agent {
  id: string;
  name: string;
  params: { hp: number };
  location: string;
}

/** 冒険の道のりの1手。 */
export type Step =
  | { kind: 'move'; to: string }
  | { kind: 'encounter'; enemy: { id: string; name: string; power: number } }
  | { kind: 'rest'; amount: number };

/** パラメータの変化の記録。序章では hp の変化だけを扱う。 */
export interface Change {
  entity: string;
  field: 'param';
  key: 'hp';
  before: number;
  after: number;
}

/** 起きた出来事の記録。ログはこの配列から作る。 */
export interface WorldEvent {
  t: number;
  type: 'action' | 'encounter' | 'defeated';
  actor: string;
  action?: 'depart' | 'move' | 'rest';
  target?: string;
  place?: string;
  changes?: Change[];
}
