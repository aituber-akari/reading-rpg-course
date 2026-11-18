import { type SearchNode, type SearchOptions, type SearchProblem, type SearchResult, resultOf } from './types';

// #region bfs
/**
 * 幅優先探索。手数が最小の計画を返す（コストは考えない）。
 * - 先入れ先出しのキュー。目標判定はノードを取り出したときに行う。
 * - 一度生成した状態（key）は二度と生成しない。
 */
export function bfs<S>(p: SearchProblem<S>, opts: SearchOptions = {}): SearchResult<S> {
  const max = opts.maxExpanded ?? Infinity;
  const startKey = p.key(p.start);
  const queue: SearchNode<S>[] = [{ state: p.start, key: startKey, g: 0, parent: null, action: null }];
  const seen = new Set<string>([startKey]);
  let head = 0;
  let expanded = 0;
  let generated = 1;

  while (head < queue.length) {
    const node = queue[head++];
    if (node === undefined) break;
    if (p.isGoal(node.state)) return resultOf(node, expanded, generated);
    if (expanded >= max) break;
    expanded++;
    for (const s of p.successors(node.state)) {
      const key = p.key(s.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: s.state, key, g: node.g + s.cost, parent: node, action: s.action });
      generated++;
    }
  }
  return resultOf<S>(null, expanded, generated);
}
// #endregion
