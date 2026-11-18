import { describe, expect, it } from 'vitest';
import { obstacleCourse } from '../src/content/obstacleCourse';
import type { Obstacle } from '../src/domain/types';
import { allocate, greedyAllocate } from '../src/planner/allocate';

/** 全組合せ（3^3 = 27通り）を調べる素朴な実装。 */
function bruteForce(obstacles: Obstacle[], budget: { stamina: number; mana: number }): number | null {
  let best: number | null = null;
  const rec = (i: number, s: number, m: number, t: number): void => {
    const o = obstacles[i];
    if (o === undefined) {
      if (best === null || t < best) best = t;
      return;
    }
    for (const x of o.options) if (x.stamina <= s && x.mana <= m) rec(i + 1, s - x.stamina, m - x.mana, t + x.time);
  };
  rec(0, budget.stamina, budget.mana, 0);
  return best;
}

describe('allocate（DP）と greedyAllocate（貪欲法）', () => {
  it('予算(7, 4)のとき、DP は登る・凍結・切り開くで時間6（部分問題10個）、貪欲法は浮遊・泳ぐ・迂回で時間7', () => {
    expect(allocate(obstacleCourse, { stamina: 7, mana: 4 })).toEqual({
      choices: ['cliff:climb', 'rapids:freeze', 'thorns:cut'],
      totalTime: 6,
      states: 10,
    });
    expect(greedyAllocate(obstacleCourse, { stamina: 7, mana: 4 })).toMatchObject({
      choices: ['cliff:levitate', 'rapids:swim', 'thorns:detour'],
      totalTime: 7,
    });
  });

  it('予算(8, 5)のとき、DP も貪欲法も浮遊・泳ぐ・炎で時間4', () => {
    const expected = { choices: ['cliff:levitate', 'rapids:swim', 'thorns:fire'], totalTime: 4 };
    expect(allocate(obstacleCourse, { stamina: 8, mana: 5 })).toMatchObject(expected);
    expect(greedyAllocate(obstacleCourse, { stamina: 8, mana: 5 })).toMatchObject(expected);
  });

  it('予算(3, 2)のとき、DP も貪欲法も遠回り・浅瀬を探す・炎で時間12', () => {
    const expected = { choices: ['cliff:detour', 'rapids:shallows', 'thorns:fire'], totalTime: 12 };
    expect(allocate(obstacleCourse, { stamina: 3, mana: 2 })).toMatchObject(expected);
    expect(greedyAllocate(obstacleCourse, { stamina: 3, mana: 2 })).toMatchObject(expected);
  });

  it('予算(0, 9)のとき、DP も貪欲法も浮遊・凍結・炎で時間3', () => {
    const expected = { choices: ['cliff:levitate', 'rapids:freeze', 'thorns:fire'], totalTime: 3 };
    expect(allocate(obstacleCourse, { stamina: 0, mana: 9 })).toMatchObject(expected);
    expect(greedyAllocate(obstacleCourse, { stamina: 0, mana: 9 })).toMatchObject(expected);
  });

  it('予算(2, 1)のとき、DP も貪欲法も null（越えられない）', () => {
    expect(allocate(obstacleCourse, { stamina: 2, mana: 1 })).toBeNull();
    expect(greedyAllocate(obstacleCourse, { stamina: 2, mana: 1 })).toBeNull();
  });

  it('予算を体力0〜12・魔力0〜10で変えても、DP の時間は全組合せを調べた結果と一致する', () => {
    for (let s = 0; s <= 12; s++) {
      for (let m = 0; m <= 10; m++) {
        expect(allocate(obstacleCourse, { stamina: s, mana: m })?.totalTime ?? null).toBe(
          bruteForce(obstacleCourse, { stamina: s, mana: m }),
        );
      }
    }
  });
});
