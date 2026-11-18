import { describe, expect, it } from 'vitest';
import { astar } from '../../src/planner/search/astar';
import { dijkstra } from '../../src/planner/search/dijkstra';
import { graphProblem } from '../helpers/graph';
import { keyActions, valleyProblem } from '../helpers/valley';

describe('演習2：A* を実装する', () => {
  it('抽象グラフで heuristic = 0 のとき、ダイクストラ法と同じ経路・コストを返す', () => {
    const a = astar(graphProblem('E', () => 0));
    const d = dijkstra(graphProblem('E'));
    expect(a.states).toEqual(d.states);
    expect(a.cost).toBe(d.cost);
  });

  it('崖の谷（登攀3・体力20）で重み1のとき、計画とコストはダイクストラ法と同じで、展開はダイクストラ法より少ない', () => {
    const a = astar(valleyProblem());
    const d = dijkstra(valleyProblem());
    expect(a.actions).toEqual(d.actions);
    expect(a.cost).toBe(7);
    expect(a.expanded).toBeLessThan(d.expanded);
  });

  it('崖の谷で重み3のとき、体力8（蔦の経路）の計画を返し、展開は重み1より少ない', () => {
    const w3 = astar(valleyProblem(), { weight: 3 });
    expect(keyActions(w3.actions)).toEqual(['climb:vine', 'climb:ledge']);
    expect(w3.cost).toBe(8);
    expect(w3.expanded).toBeLessThan(astar(valleyProblem()).expanded);
  });

  it('登攀2 / 登攀1 のとき、重み1の A* はダイクストラ法と同じ鉤縄の経路（7手・体力7）を返し、展開はダイクストラ法より少ない', () => {
    for (const climb of [2, 1]) {
      const a = astar(valleyProblem({ climb }));
      const d = dijkstra(valleyProblem({ climb }));
      expect(keyActions(a.actions)).toEqual(['take:rope', 'hook:rope', 'climb:rope']);
      expect(a.actions).toEqual(d.actions);
      expect([a.actions.length, a.cost]).toEqual([7, 7]);
      expect(a.expanded).toBeLessThan(d.expanded);
    }
  });

  it('体力6のとき、計画を見つけられない', () => {
    expect(astar(valleyProblem({ stamina: 6 })).found).toBe(false);
  });

  it('A* の展開ノード数は、記録した値（スナップショット）と一致する', () => {
    const rows = [
      { climb: 3, stamina: 20 },
      { climb: 2, stamina: 20 },
      { climb: 1, stamina: 20 },
    ].map((setup) => ({
      ...setup,
      astar: astar(valleyProblem(setup)).expanded,
      astarW3: astar(valleyProblem(setup), { weight: 3 }).expanded,
    }));
    expect(rows).toMatchSnapshot();
  });
});
