import { describe, expect, it } from 'vitest';
import { astar } from '../src/planner/search/astar';
import { dijkstra } from '../src/planner/search/dijkstra';
import { graphProblem } from './helpers/graph';

// A* の基本の性質（演習2の解答を確かめる。starter では演習用テスト tests/exercises/astar.test.ts を使う）
describe('astar', () => {
  it('到達できない目標のとき、found は false になる', () => {
    expect(astar(graphProblem('Z')).found).toBe(false);
  });

  it('許容的なヒューリスティックを与えると、ダイクストラ法と同じコストで、展開は少なくなる', () => {
    const h: Record<string, number> = { A: 3, B: 2, C: 1, D: 1, E: 0 };
    const r = astar(graphProblem('E', (s) => h[s] ?? 0));
    expect(r.cost).toBe(3);
    expect(r.expanded).toBeLessThanOrEqual(dijkstra(graphProblem('E')).expanded);
  });

  it('f が同じときは h の小さい方を先に展開する', () => {
    // A から B（g1, h2, f3）と D（g5, h0 → 重み0で f5）... 重み1で B: f=3、D: f=6 なので B が先
    const h: Record<string, number> = { A: 3, B: 2, C: 1, D: 1, E: 0 };
    const r = astar(graphProblem('E', (s) => h[s] ?? 0));
    expect(r.states).toEqual(['A', 'B', 'C', 'E']);
  });
});
