import { type SearchNode, type SearchOptions, type SearchProblem, type SearchResult, resultOf } from './types';

interface AStarNode<S> extends SearchNode<S> {
  h: number;
  f: number;
}

// #region astar
/**
 * A*。f = g + weight × h が最小のノードから展開する。
 * - weight = 1 で、h が許容的なら、最適な計画を返す。weight > 1 では最適とは限らない。
 * - 比較は f、同じなら h の小さい方、それも同じなら追加した順。
 * - 目標判定・処理済みの扱い・追加の条件は、ダイクストラ法と同じ。
 */
export function astar<S>(p: SearchProblem<S>, opts: SearchOptions & { weight?: number } = {}): SearchResult<S> {
  const max = opts.maxExpanded ?? Infinity;
  const weight = opts.weight ?? 1;
  const h = (s: S): number => p.heuristic?.(s) ?? 0;
  const node0 = (state: S, key: string, g: number, parent: SearchNode<S> | null, action: string | null): AStarNode<S> => {
    const hv = h(state);
    return { state, key, g, parent, action, h: hv, f: g + weight * hv };
  };

  const start = node0(p.start, p.key(p.start), 0, null, null);
  const open: AStarNode<S>[] = [start];
  const bestG = new Map<string, number>([[start.key, 0]]);
  const closed = new Set<string>();
  let expanded = 0;
  let generated = 1;

  const better = (a: AStarNode<S>, b: AStarNode<S>): boolean => a.f < b.f || (a.f === b.f && a.h < b.h);

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i];
      const b = open[best];
      if (a !== undefined && b !== undefined && better(a, b)) best = i;
    }
    const node = open.splice(best, 1)[0];
    if (node === undefined) break;
    if (closed.has(node.key)) continue;
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
      open.push(node0(s.state, key, g, node, s.action));
      generated++;
    }
  }
  return resultOf<S>(null, expanded, generated);
}
// #endregion
