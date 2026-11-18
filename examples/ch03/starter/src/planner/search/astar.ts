import type { SearchNode, SearchOptions, SearchProblem, SearchResult } from './types';

/** A* のノード。g に加えて h と f を持つ。 */
export interface AStarNode<S> extends SearchNode<S> {
  h: number;
  f: number;
}

/**
 * A*。f = g + weight × h が最小のノードから展開する。
 * - weight = 1 で、h が許容的なら、最適な計画を返す。weight > 1 では最適とは限らない。
 * - 比較は f、同じなら h の小さい方、それも同じなら追加した順。
 * - 目標判定・処理済みの扱い・追加の条件は、ダイクストラ法と同じ。
 *
 * TODO（演習2）：dijkstra.ts を参考に実装する。
 *   1. ヒューリスティック h(s) = p.heuristic?.(s) ?? 0 とし、ノードに h と f = g + weight × h を持たせる
 *   2. 開集合から取り出すノードを、f → h → 追加した順で選ぶ
 *   3. それ以外（目標判定、処理済みの扱い、展開数・生成数の数え方）はダイクストラ法と同じにする
 */
export function astar<S>(_p: SearchProblem<S>, _opts: SearchOptions & { weight?: number } = {}): SearchResult<S> {
  throw new Error('未実装：A*（src/planner/search/astar.ts の TODO）');
}
