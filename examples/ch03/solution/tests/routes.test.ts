import { describe, expect, it } from 'vitest';
import { listRoutes, routeSignature } from '../src/analysis/routes';
import { cliffValleyCatalog, cliffValleyWorld, reachTop } from '../src/content/cliffValley';

function routes(climb: number) {
  return listRoutes(cliffValleyWorld({ climb }), cliffValleyCatalog, 'aria', reachTop, { maxCost: 20 }).map((r) => ({
    signature: r.signature,
    cost: r.cost,
    steps: r.plan.length,
  }));
}

describe('routeSignature', () => {
  it('鉤縄の経路の識別子は {anchor, cap:climb, rope}（場所と人物は含めない）', () => {
    const plan = ['walk:village->fork', 'walk:fork->cliff-bottom', 'walk:cliff-bottom->shed', 'take:rope', 'walk:shed->cliff-bottom', 'hook:rope', 'climb:rope'];
    expect(routeSignature(plan, cliffValleyCatalog, cliffValleyWorld())).toEqual(['anchor', 'cap:climb', 'rope']);
  });

  it('蔦の経路の識別子は {cap:climb, vine}（岩棚から登る行為は物を対象にしない）', () => {
    expect(routeSignature(['climb:vine', 'climb:ledge'], cliffValleyCatalog, cliffValleyWorld())).toEqual(['cap:climb', 'vine']);
  });
});

describe('listRoutes', () => {
  it('登攀3・上限20のとき、解決経路は3通り', () => {
    expect(routes(3)).toEqual([
      { signature: ['anchor', 'cap:climb', 'rope'], cost: 7, steps: 7 },
      { signature: ['cap:climb', 'vine'], cost: 8, steps: 4 },
      { signature: ['cap:climb', 'cliff'], cost: 11, steps: 3 },
    ]);
  });

  it('登攀2・上限20のとき、解決経路は2通り', () => {
    expect(routes(2).map((r) => r.signature)).toEqual([
      ['anchor', 'cap:climb', 'rope'],
      ['cap:climb', 'vine'],
    ]);
  });

  it('登攀1・上限20のとき、解決経路は鉤縄の経路だけ', () => {
    expect(routes(1).map((r) => r.signature)).toEqual([['anchor', 'cap:climb', 'rope']]);
  });

  it('上限を7にすると、体力7で届く鉤縄の経路だけが残る', () => {
    const r = listRoutes(cliffValleyWorld(), cliffValleyCatalog, 'aria', reachTop, { maxCost: 7 });
    expect(r.map((x) => x.signature)).toEqual([['anchor', 'cap:climb', 'rope']]);
  });
});
