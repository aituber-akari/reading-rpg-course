import { describe, expect, it } from 'vitest';
import { cliffWorld } from '../src/content/cliff';
import { applyEffects } from '../src/rules/effects';

describe('applyEffects', () => {
  it('addParam・setParam・setState・moveTo を順に適用するとき、それぞれの変化が Change として記録される', () => {
    const world = cliffWorld();
    const changes = applyEffects(
      [
        { type: 'addParam', of: 'vine', key: 'strength', delta: -1 },
        { type: 'setParam', of: '$actor', key: 'stamina', value: 5 },
        { type: 'setState', of: 'rope', state: 'hooked' },
        { type: 'moveTo', of: 'rope', to: 'cliff-bottom' },
      ],
      { world, actorId: 'bord' },
    );
    expect(changes).toEqual([
      { entity: 'vine', field: 'param', key: 'strength', before: 2, after: 1, via: 'effect' },
      { entity: 'bord', field: 'param', key: 'stamina', before: 20, after: 5, via: 'effect' },
      { entity: 'rope', field: 'state', before: 'coiled', after: 'hooked', via: 'effect' },
      { entity: 'rope', field: 'location', before: 'bord', after: 'cliff-bottom', via: 'effect' },
    ]);
    expect(world.entities.rope?.location).toBe('cliff-bottom');
  });

  it('存在しないパラメータに addParam するとき、0 から足し始める', () => {
    const world = cliffWorld();
    applyEffects([{ type: 'addParam', of: 'aria', key: 'mana', delta: 2 }], { world });
    expect(world.entities.aria?.params.mana).toBe(2);
  });

  it('解決できない参照を含む効果は、作品データの誤りとして例外を投げる', () => {
    expect(() => applyEffects([{ type: 'setState', of: 'ghost', state: 'x' }], { world: cliffWorld() })).toThrow();
  });
});
