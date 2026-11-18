import { type SearchNode, type SearchOptions, type SearchProblem, type SearchResult, resultOf } from './types';

// #region dijkstra
/**
 * ダイクストラ法。コストの和が最小の計画を返す。
 * - 開集合は配列とし、取り出すたびに g が最小のものを選ぶ（同じなら追加した順）。
 * - 目標判定はノードを取り出したときに行う。処理済みの状態は捨てる。
 * - より小さい g が見つかったときだけ、開集合に追加する。
 */
export function dijkstra<S>(p: SearchProblem<S>, opts: SearchOptions = {}): SearchResult<S> {
  const max = opts.maxExpanded ?? Infinity;
  const start: SearchNode<S> = { state: p.start, key: p.key(p.start), g: 0, parent: null, action: null };
  const open: SearchNode<S>[] = [start];
  const bestG = new Map<string, number>([[start.key, 0]]);
  const closed = new Set<string>();
  let expanded = 0;
  let generated = 1;

  while (open.length > 0) {
    // 最小の g を持つノードを選ぶ。同じ g なら先に追加したもの（配列の前の方）を選ぶ。
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if ((open[i]?.g ?? Infinity) < (open[best]?.g ?? Infinity)) best = i;
    }
    const node = open.splice(best, 1)[0];
    if (node === undefined) break;
    if (closed.has(node.key)) continue; // 処理済みの状態は捨てる
    if (p.isGoal(node.state)) return resultOf(node, expanded, generated);
    if (expanded >= max) break;
    closed.add(node.key);
    expanded++;

    for (const s of p.successors(node.state)) {
      const key = p.key(s.state);
      if (closed.has(key)) continue;
      const g = node.g + s.cost;
      if (g >= (bestG.get(key) ?? Infinity)) continue;
      bestG.set(key, g);
      open.push({ state: s.state, key, g, parent: node, action: s.action });
      generated++;
    }
  }
  return resultOf<S>(null, expanded, generated);
}
// #endregion
