import { describe, expect, it } from 'vitest';
import { battleWorld } from '../src/content/battle';
import { createRng } from '../src/lib/rng';
import { runBattle } from '../src/sim/battle';
import { aggressive, cautious, coward } from '../src/sim/policies';
import { fixedRng } from './helpers/fixedRng';

describe('runBattle', () => {
  it('fixedRng([0.5]) で両者が aggressive のとき、3ラウンドで victory、アリアの残りHPは11、オオカミは down', () => {
    const r = runBattle(battleWorld(), 'aria', 'wolf', { hero: aggressive, enemy: aggressive }, fixedRng([0.5]));
    expect(r.outcome).toBe('victory');
    expect(r.world.entities.aria?.params.hp).toBe(11);
    expect(r.world.entities.wolf?.state).toBe('down');
    expect(r.events.filter((e) => e.action === 'attack' && e.actor === 'aria')).toHaveLength(3);
  });

  it('両者が防御し続けるとき、20ラウンドで draw になる', () => {
    const defend = () => 'defend' as const;
    const r = runBattle(battleWorld(), 'aria', 'wolf', { hero: defend, enemy: defend }, fixedRng([0.5]));
    expect(r.outcome).toBe('draw');
    expect(r.events.at(-1)).toMatchObject({ type: 'battleEnd', outcome: 'draw' });
  });

  it('アリアが coward で乱数が小さいとき、最初のラウンドで逃げ切る', () => {
    const r = runBattle(battleWorld(), 'aria', 'wolf', { hero: coward, enemy: aggressive }, fixedRng([0.5, 0.0]));
    expect(r.outcome).toBe('fled');
  });

  it('シード42で2回実行すると、イベント列が完全に一致し、スナップショットとも一致する', () => {
    const run = () =>
      runBattle(battleWorld(), 'aria', 'wolf', { hero: cautious, enemy: aggressive }, createRng(42)).events;
    const first = run();
    expect(run()).toEqual(first);
    expect(first).toMatchSnapshot();
  });
});
