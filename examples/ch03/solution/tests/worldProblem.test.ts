import { describe, expect, it } from 'vitest';
import { cliffValleyWorld } from '../src/content/cliffValley';
import { bfs } from '../src/planner/search/bfs';
import { dijkstra } from '../src/planner/search/dijkstra';
import { stateKey, weightedCost } from '../src/planner/worldProblem';
import { keyActions, valleyProblem } from './helpers/valley';

const ropeRoute = ['take:rope', 'hook:rope', 'climb:rope'];
const vineRoute = ['climb:vine', 'climb:ledge'];

describe('崖の谷を探索問題にする', () => {
  it('登攀3・体力20のとき、BFS は3手・体力11（崖を直接登る）の計画を返す', () => {
    const r = bfs(valleyProblem());
    expect(r.actions).toEqual(['walk:village->fork', 'walk:fork->cliff-bottom', 'climb:direct']);
    expect(r.cost).toBe(11);
  });

  it('登攀3・体力20のとき、ダイクストラ法は7手・体力7（鉤縄の経路）の計画を返す', () => {
    const r = dijkstra(valleyProblem());
    expect(r.actions).toEqual([
      'walk:village->fork',
      'walk:fork->cliff-bottom',
      'walk:cliff-bottom->shed',
      'take:rope',
      'walk:shed->cliff-bottom',
      'hook:rope',
      'climb:rope',
    ]);
    expect(r.cost).toBe(7);
  });

  it('登攀2 / 登攀1 のとき、BFS はそれぞれ蔦の経路 / 鉤縄の経路を返す', () => {
    const r2 = bfs(valleyProblem({ climb: 2 }));
    expect(keyActions(r2.actions)).toEqual(vineRoute);
    expect([r2.actions.length, r2.cost]).toEqual([4, 8]);
    const r1 = bfs(valleyProblem({ climb: 1 }));
    expect(keyActions(r1.actions)).toEqual(ropeRoute);
    expect([r1.actions.length, r1.cost]).toEqual([7, 7]);
  });

  it('登攀2 / 登攀1 のとき、ダイクストラ法は鉤縄の経路を返す', () => {
    expect(keyActions(dijkstra(valleyProblem({ climb: 2 })).actions)).toEqual(ropeRoute);
    expect(keyActions(dijkstra(valleyProblem({ climb: 1 })).actions)).toEqual(ropeRoute);
  });

  it('体力10のとき、BFS は蔦の経路を返す（直接登ると体力が足りない）', () => {
    const r = bfs(valleyProblem({ stamina: 10 }));
    expect(keyActions(r.actions)).toEqual(vineRoute);
    expect(r.cost).toBe(8);
  });

  it('体力6のとき、BFS もダイクストラ法も計画を見つけられない', () => {
    expect(bfs(valleyProblem({ stamina: 6 })).found).toBe(false);
    expect(dijkstra(valleyProblem({ stamina: 6 })).found).toBe(false);
  });

  it('BFS とダイクストラ法の展開ノード数は、記録した値（スナップショット）と一致する', () => {
    const rows = [
      { climb: 3, stamina: 20 },
      { climb: 2, stamina: 20 },
      { climb: 1, stamina: 20 },
      { climb: 3, stamina: 10 },
      { climb: 3, stamina: 6 },
    ].map((setup) => ({
      ...setup,
      bfs: bfs(valleyProblem(setup)).expanded,
      dijkstra: dijkstra(valleyProblem(setup)).expanded,
    }));
    expect(rows).toMatchSnapshot();
  });
});

describe('stateKey と weightedCost', () => {
  it('時刻と、外すと指定したパラメータは、状態の同一性に含めない', () => {
    const a = cliffValleyWorld();
    const b = cliffValleyWorld({ stamina: 5 });
    b.t = 9;
    expect(stateKey(a)).not.toBe(stateKey(b));
    expect(stateKey(a, [{ entity: 'aria', keys: ['stamina'] }])).toBe(stateKey(b, [{ entity: 'aria', keys: ['stamina'] }]));
  });

  it('辺のコストは、重み × 行為のコストの和になる', () => {
    expect(weightedCost({ stamina: 3 }, { stamina: 1 })).toBe(3);
    expect(weightedCost({ mana: 4 }, { stamina: 1 })).toBe(0);
    expect(weightedCost({ stamina: 1, mana: 4 }, { stamina: 1, mana: 2 })).toBe(9);
  });

  it('同じ入力から2回探索すると、結果が完全に一致する（決定性）', () => {
    const a = dijkstra(valleyProblem());
    const b = dijkstra(valleyProblem());
    expect(b.actions).toEqual(a.actions);
    expect([b.cost, b.expanded, b.generated]).toEqual([a.cost, a.expanded, a.generated]);
  });
});
