import { describe, expect, it } from 'vitest';
import { cliffWorld } from '../src/content/cliff';
import type { WorldObject } from '../src/domain/types';
import { applyTransitions } from '../src/rules/transitions';

describe('applyTransitions', () => {
  it('蔦の強度が0のとき、状態が intact から torn に切り替わり、via は transition になる', () => {
    const world = cliffWorld();
    world.entities.vine!.params.strength = 0;
    const changes = applyTransitions(world, ['vine']);
    expect(world.entities.vine?.state).toBe('torn');
    expect(changes).toEqual([{ entity: 'vine', field: 'state', before: 'intact', after: 'torn', via: 'transition' }]);
  });

  it('蔦の強度が1のとき、状態は変わらない', () => {
    const world = cliffWorld();
    world.entities.vine!.params.strength = 1;
    expect(applyTransitions(world, ['vine'])).toEqual([]);
    expect(world.entities.vine?.state).toBe('intact');
  });

  it('遷移先に presets があるとき、パラメータが上書きされる', () => {
    const world = cliffWorld();
    const crate: WorldObject = {
      id: 'crate',
      kind: 'object',
      name: '木箱',
      state: 'whole',
      states: ['whole', 'broken'],
      params: { hp: 0, weight: 5 },
      location: 'cliff-bottom',
      transitions: [{ to: 'broken', when: [{ type: 'param', of: '$self', key: 'hp', op: '<=', value: 0 }] }],
      presets: { broken: { weight: 1 } },
      significance: { play: 1, story: 0 },
    };
    world.entities.crate = crate;
    const changes = applyTransitions(world, ['crate']);
    expect(world.entities.crate?.state).toBe('broken');
    expect(world.entities.crate?.params.weight).toBe(1);
    expect(changes.map((c) => c.field)).toEqual(['state', 'param']);
  });

  it('条件を満たす規則が2つあるとき、最初の1つだけを適用する（連鎖しない）', () => {
    const world = cliffWorld();
    const lamp: WorldObject = {
      id: 'lamp',
      kind: 'object',
      name: 'ランプ',
      state: 'on',
      states: ['on', 'dim', 'off'],
      params: { oil: 0 },
      location: 'cliff-bottom',
      transitions: [
        { from: 'on', to: 'dim', when: [{ type: 'param', of: '$self', key: 'oil', op: '<=', value: 0 }] },
        { from: 'dim', to: 'off', when: [{ type: 'param', of: '$self', key: 'oil', op: '<=', value: 0 }] },
      ],
      significance: { play: 0, story: 1 },
    };
    world.entities.lamp = lamp;
    applyTransitions(world, ['lamp']);
    expect(world.entities.lamp?.state).toBe('dim');
  });
});
