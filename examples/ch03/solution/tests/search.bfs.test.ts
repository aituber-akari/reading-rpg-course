import { describe, expect, it } from 'vitest';
import { bfs } from '../src/planner/search/bfs';
import { graphProblem } from './helpers/graph';

describe('bfs', () => {
  it('5ノードの抽象グラフのとき、辺の数が最小の経路（A→E）を返す', () => {
    const r = bfs(graphProblem('E'));
    expect(r.found).toBe(true);
    expect(r.states).toEqual(['A', 'E']);
    expect(r.actions).toEqual(['A->E']);
    expect(r.cost).toBe(10);
  });

  it('目標判定は取り出したときに行うので、開始ノードが目標なら何も展開しない', () => {
    const r = bfs(graphProblem('A'));
    expect(r).toMatchObject({ found: true, actions: [], states: ['A'], cost: 0, expanded: 0, generated: 1 });
  });

  it('到達できない目標のとき、found は false になる', () => {
    expect(bfs(graphProblem('Z')).found).toBe(false);
  });

  it('展開の上限に達したとき、見つからなかったものとする', () => {
    const r = bfs(graphProblem('E'), { maxExpanded: 0 });
    expect(r.found).toBe(false);
    expect(r.expanded).toBe(0);
  });
});
