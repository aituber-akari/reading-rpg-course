import type { SearchProblem } from '../../src/planner/search/types';

/**
 * 小さな抽象グラフ（テスト用）。辺は [行き先, 重み]。
 *   A ─10─ E           （辺の数は最小）
 *   A ─1─ B ─1─ C ─1─ E （重みの和は最小：3）
 *   A ─5─ D ─1─ E
 */
export const edges: Record<string, [string, number][]> = {
  A: [
    ['B', 1],
    ['D', 5],
    ['E', 10],
  ],
  B: [['C', 1]],
  C: [['E', 1]],
  D: [['E', 1]],
  E: [],
};

export function graphProblem(goal: string, heuristic?: (s: string) => number): SearchProblem<string> {
  const p: SearchProblem<string> = {
    start: 'A',
    isGoal: (s) => s === goal,
    successors: (s) => (edges[s] ?? []).map(([to, cost]) => ({ action: `${s}->${to}`, state: to, cost })),
    key: (s) => s,
  };
  if (heuristic !== undefined) p.heuristic = heuristic;
  return p;
}
