import { describe, expect, it } from 'vitest';
import { battleWorld } from '../../src/content/battle';
import { retreatAtHalf } from '../../src/sim/policies';

describe('演習：HPが半分以下なら逃げる方策（retreatAtHalf）', () => {
  it('アリア HP 9/20 のとき、flee を返す', () => {
    const w = battleWorld();
    w.entities.aria!.params.hp = 9;
    expect(retreatAtHalf(w, 'aria', 'wolf')).toBe('flee');
  });

  it('アリア HP 10/20 のとき、flee を返す（ちょうど半分も含む）', () => {
    const w = battleWorld();
    w.entities.aria!.params.hp = 10;
    expect(retreatAtHalf(w, 'aria', 'wolf')).toBe('flee');
  });

  it('アリア HP 15/20 のとき、attack を返す', () => {
    const w = battleWorld();
    w.entities.aria!.params.hp = 15;
    expect(retreatAtHalf(w, 'aria', 'wolf')).toBe('attack');
  });
});
