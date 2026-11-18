import { describe, expect, it } from 'vitest';
import { battleWorld } from '../src/content/battle';
import { aggressive, cautious, coward } from '../src/sim/policies';

function worldWithAriaHp(hp: number) {
  const w = battleWorld();
  w.entities.aria!.params.hp = hp;
  return w;
}

describe('方策', () => {
  it('アリア HP 6/20 のとき、cautious は defend を選ぶ（HPが最大の30%以下）', () => {
    expect(cautious(worldWithAriaHp(6), 'aria', 'wolf')).toBe('defend');
  });

  it('アリア HP 7/20 のとき、cautious は attack を選ぶ', () => {
    expect(cautious(worldWithAriaHp(7), 'aria', 'wolf')).toBe('attack');
  });

  it('どの状況でも、aggressive は attack、coward は flee を選ぶ', () => {
    const w = worldWithAriaHp(1);
    expect(aggressive(w, 'aria', 'wolf')).toBe('attack');
    expect(coward(w, 'aria', 'wolf')).toBe('flee');
  });
});
