import { describe, expect, it } from 'vitest';
import { cliffCatalog, cliffWorld } from '../src/content/cliff';
import { availableAffordances } from '../src/rules/affordances';
import { applyAction } from '../src/rules/apply';

describe('applyAction', () => {
  it('ボルドが鉤縄を掛けるとき、コスト・効果の順に変化が記録され、時刻が1進む', () => {
    const { world, event } = applyAction(cliffWorld(), cliffCatalog, 'bord', 'hook:rope');
    expect(event).toEqual({
      t: 1,
      type: 'action',
      actor: 'bord',
      action: 'hook:rope',
      target: 'anchor',
      place: 'cliff-bottom',
      changes: [
        { entity: 'bord', field: 'param', key: 'stamina', before: 20, after: 19, via: 'cost' },
        { entity: 'rope', field: 'location', before: 'bord', after: 'cliff-bottom', via: 'effect' },
        { entity: 'rope', field: 'state', before: 'coiled', after: 'hooked', via: 'effect' },
      ],
    });
    expect(world.t).toBe(1);
  });

  it('蔦の強度が1のときにアリアが蔦を登ると、蔦は torn になり、以後ボルドは蔦を登れない', () => {
    const w = cliffWorld();
    w.entities.vine!.params.strength = 1;
    const { world, event } = applyAction(w, cliffCatalog, 'aria', 'climb:vine');
    expect(world.entities.vine?.state).toBe('torn');
    expect(event.changes).toContainEqual({
      entity: 'vine',
      field: 'state',
      before: 'intact',
      after: 'torn',
      via: 'transition',
    });
    const bord = availableAffordances(world, cliffCatalog, 'bord').map((a) => a.actionId);
    expect(bord).not.toContain('climb:vine');
  });

  it('どの行為を実行しても、引数の世界状態は変わらない（不変更新）', () => {
    for (const [actor, action] of [
      ['aria', 'climb:direct'],
      ['aria', 'climb:vine'],
      ['bord', 'hook:rope'],
      ['sena', 'cast:levitate'],
    ] as const) {
      const w = cliffWorld();
      const before = JSON.stringify(w);
      applyAction(w, cliffCatalog, actor, action);
      expect(JSON.stringify(w)).toBe(before);
    }
  });

  it('前提条件を満たさない行為を実行しようとすると、例外を投げる', () => {
    expect(() => applyAction(cliffWorld(), cliffCatalog, 'sena', 'climb:vine')).toThrow();
  });
});
