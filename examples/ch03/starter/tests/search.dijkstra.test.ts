import { describe, expect, it } from 'vitest';
import { dijkstra } from '../src/planner/search/dijkstra';
import { graphProblem } from './helpers/graph';

describe('dijkstra', () => {
  it('5ノードの抽象グラフのとき、重みの和が最小の経路（A→B→C→E、コスト3）を返す', () => {
    const r = dijkstra(graphProblem('E'));
    expect(r.found).toBe(true);
    expect(r.states).toEqual(['A', 'B', 'C', 'E']);
    expect(r.cost).toBe(3);
  });

  it('展開したノード数と、開集合に入れたノード数を数える', () => {
    // A を展開（B1, D5, E10 を追加）→ B を展開（C2 を追加）→ C を展開（E3 を追加。10 より小さいので追加する）
    // → E3 を取り出して目標。展開は A, B, C の3つ、開集合に入れたのは A を含めて6つ。
    const r = dijkstra(graphProblem('E'));
    expect(r.expanded).toBe(3);
    expect(r.generated).toBe(6);
  });

  it('到達できない目標のとき、found は false になる', () => {
    expect(dijkstra(graphProblem('Z')).found).toBe(false);
  });
});
