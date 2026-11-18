// 汎用の探索のインタフェース。探索法は世界のことを知らず、この型だけに依存する。

// #region SearchProblem
export interface Successor<S> {
  action: string;
  state: S;
  cost: number;
}

export interface SearchProblem<S> {
  start: S;
  isGoal(s: S): boolean;
  /** 後続の状態。順序は決定的であること。 */
  successors(s: S): Successor<S>[];
  /** 状態の同一性を表す文字列。 */
  key(s: S): string;
  /** A* 用のヒューリスティック（残りコストの見積もり）。 */
  heuristic?(s: S): number;
}
// #endregion

export interface SearchResult<S> {
  found: boolean;
  actions: string[];
  states: S[];
  cost: number;
  /** 取り出して後続を生成したノードの数（目標のノードと、処理済みで捨てたノードは数えない）。 */
  expanded: number;
  /** 開集合に入れたノードの数（開始ノードを含む）。 */
  generated: number;
}

export interface SearchOptions {
  /** 展開するノード数の上限。超えたら見つからなかったものとする。 */
  maxExpanded?: number;
}

/** 探索木のノード。親をたどると経路が得られる。 */
export interface SearchNode<S> {
  state: S;
  key: string;
  g: number; // 開始からのコスト
  parent: SearchNode<S> | null;
  action: string | null; // 親からこのノードへの行為
}

/** ノードから開始ノードまでさかのぼり、結果を作る。 */
export function resultOf<S>(goal: SearchNode<S> | null, expanded: number, generated: number): SearchResult<S> {
  if (goal === null) return { found: false, actions: [], states: [], cost: 0, expanded, generated };
  const actions: string[] = [];
  const states: S[] = [];
  for (let n: SearchNode<S> | null = goal; n !== null; n = n.parent) {
    states.unshift(n.state);
    if (n.action !== null) actions.unshift(n.action);
  }
  return { found: true, actions, states, cost: goal.g, expanded, generated };
}
