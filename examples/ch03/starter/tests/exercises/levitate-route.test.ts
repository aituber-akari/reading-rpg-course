import { describe, expect, it } from 'vitest';
import { listRoutes } from '../../src/analysis/routes';
import { cliffValleyCatalog, cliffValleyWorld, reachTop } from '../../src/content/cliffValley';
import { dijkstra } from '../../src/planner/search/dijkstra';
import { makeWorldProblem } from '../../src/planner/worldProblem';

// アリアに浮遊1と魔力6を与え、体力と魔力の両方に重み1を付ける。
const world = () => cliffValleyWorld({ climb: 3, stamina: 20, levitate: 1, mana: 6 });
const costWeights = { stamina: 1, mana: 1 };

describe('演習1：浮遊の魔法の経路を加える', () => {
  it('カタログに cast:levitate（崖下で浮遊Lv1以上、魔力4）がある', () => {
    const def = cliffValleyCatalog.actions.find((a) => a.id === 'cast:levitate');
    expect(def?.cost).toEqual({ mana: 4 });
  });

  it('解決経路が4通りになり、新しい経路 {cap:levitate} が現れる', () => {
    const routes = listRoutes(world(), cliffValleyCatalog, 'aria', reachTop, { maxCost: 20, costWeights });
    expect(routes.map((r) => r.signature)).toEqual([
      ['cap:levitate'],
      ['anchor', 'cap:climb', 'rope'],
      ['cap:climb', 'vine'],
      ['cap:climb', 'cliff'],
    ]);
  });

  it('ダイクストラ法の計画は、歩いて崖下へ行き魔法を使う経路（コスト6）に変わる', () => {
    const r = dijkstra(makeWorldProblem(world(), cliffValleyCatalog, 'aria', reachTop, { costWeights }));
    expect(r.actions).toEqual(['walk:village->fork', 'walk:fork->cliff-bottom', 'cast:levitate']);
    expect(r.cost).toBe(6);
  });
});
