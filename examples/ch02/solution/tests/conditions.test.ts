import { describe, expect, it } from 'vitest';
import { cliffCatalog, cliffWorld } from '../src/content/cliff';
import type { Condition } from '../src/domain/types';
import { describeCondition, evaluate } from '../src/rules/conditions';
import { param } from '../src/rules/params';

describe('param', () => {
  it('存在しないパラメータを読むとき、0 を返す', () => {
    const w = cliffWorld();
    expect(param(w.entities.aria!, 'mana')).toBe(0);
    expect(param(w.entities.sena!, 'mana')).toBe(6);
  });
});

describe('evaluate', () => {
  const world = cliffWorld();
  const ctx = { world, actorId: 'bord', targetId: 'anchor' };
  const cases: [string, Condition, boolean][] = [
    ['ボルドの体力が20以上', { type: 'param', of: '$actor', key: 'stamina', op: '>=', value: 20 }, true],
    ['ボルドの体力が20より大きい', { type: 'param', of: '$actor', key: 'stamina', op: '>', value: 20 }, false],
    ['蔦が intact', { type: 'state', of: 'vine', is: 'intact' }, true],
    ['対象（突起）が solid', { type: 'state', of: '$target', is: 'solid' }, true],
    ['ボルドが崖下にいる', { type: 'at', of: '$actor', place: 'cliff-bottom' }, true],
    ['ボルドが鉤縄を持っている', { type: 'holds', of: '$actor', item: 'rope' }, true],
    ['アリアが鉤縄を持っている', { type: 'holds', of: 'aria', item: 'rope' }, false],
    ['ボルドとアリアが同じ場所にいる', { type: 'colocated', a: '$actor', b: 'aria' }, true],
    ['ボルドと突起が同じ場所にいる', { type: 'colocated', a: '$actor', b: 'anchor' }, false],
    ['ボルドが登攀Lv1以上', { type: 'capability', of: '$actor', id: 'climb', min: 1 }, true],
    ['ボルドが登攀Lv2以上', { type: 'capability', of: '$actor', id: 'climb', min: 2 }, false],
    ['蔦が登攀Lv0以上（物は能力を持たない）', { type: 'capability', of: 'vine', id: 'climb', min: 0 }, false],
    ['蔦が torn ではない', { type: 'not', cond: { type: 'state', of: 'vine', is: 'torn' } }, true],
  ];
  for (const [name, cond, expected] of cases) {
    it(`通常の崖で「${name}」を評価すると ${expected} になる`, () => {
      expect(evaluate(cond, ctx)).toBe(expected);
    });
  }

  it('解決できない参照（文脈にない $self、存在しないID）を含む条件は偽になる', () => {
    expect(evaluate({ type: 'state', of: '$self', is: 'intact' }, ctx)).toBe(false);
    expect(evaluate({ type: 'at', of: 'ghost', place: 'cliff-bottom' }, ctx)).toBe(false);
  });
});

describe('describeCondition', () => {
  it('能力の条件を説明すると「登攀Lv1以上が必要」になる', () => {
    const c: Condition = { type: 'capability', of: '$actor', id: 'climb', min: 1 };
    expect(describeCondition(c, cliffWorld(), cliffCatalog)).toBe('登攀Lv1以上が必要');
  });

  it('コストの条件を説明すると「体力が3以上であることが必要」になる', () => {
    const c: Condition = { type: 'param', of: '$actor', key: 'stamina', op: '>=', value: 3 };
    expect(describeCondition(c, cliffWorld(), cliffCatalog)).toBe('体力が3以上であることが必要');
  });

  it('持ち物の条件を説明すると「鉤縄を持っていることが必要」になる', () => {
    const c: Condition = { type: 'holds', of: '$actor', item: 'rope' };
    expect(describeCondition(c, cliffWorld(), cliffCatalog)).toBe('鉤縄を持っていることが必要');
  });
});
