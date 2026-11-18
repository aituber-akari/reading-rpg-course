import { describe, expect, it } from 'vitest';
import { aria, battleWorld, wolf } from '../src/content/battle';
import type { BattleAction, WorldState } from '../src/domain/types';
import { damageOf, fleeChance, resolveRound } from '../src/rules/combat';
import { fixedRng } from './helpers/fixedRng';

function hp(world: WorldState, id: string): number | undefined {
  return world.entities[id]?.params.hp;
}

function round(heroAction: BattleAction, rngValues: number[]) {
  return resolveRound(battleWorld(), 'aria', heroAction, 'wolf', 'attack', fixedRng(rngValues));
}

describe('damageOf と fleeChance', () => {
  it('揺らぎが0のとき、ダメージは atk − def になる', () => {
    expect(damageOf(wolf, aria, false, fixedRng([0.5]))).toBe(3);
    expect(damageOf(aria, wolf, false, fixedRng([0.5]))).toBe(5);
  });

  it('防御側が身を守っているとき、ダメージは半分（切り捨て、最低1）になる', () => {
    expect(damageOf(wolf, aria, true, fixedRng([0.5]))).toBe(1);
  });

  it('ダメージは最低でも1になる', () => {
    const weak = { ...wolf, params: { ...wolf.params, atk: 0 } };
    expect(damageOf(weak, aria, false, fixedRng([0]))).toBe(1);
  });

  it('アリア（agi 5）がオオカミ（agi 6）から逃げる確率は0.4で、0.1〜0.9に収まる', () => {
    expect(fleeChance(aria, wolf)).toBeCloseTo(0.4);
    const fast = { ...aria, params: { ...aria.params, agi: 20 } };
    expect(fleeChance(fast, wolf)).toBe(0.9);
    expect(fleeChance(wolf, fast)).toBe(0.1);
  });
});

describe('resolveRound', () => {
  it('fixedRng([0.5]) で両者が攻撃するとき、先にオオカミが動き、アリア HP 20→17、オオカミ HP 14→9 になる', () => {
    const r = round('attack', [0.5]);
    expect(r.events[0]?.actor).toBe('wolf');
    expect(hp(r.world, 'aria')).toBe(17);
    expect(hp(r.world, 'wolf')).toBe(9);
    expect(r.ended).toBe(false);
  });

  it('アリアが防御するとき、アリア HP 20→19（3の半分を切り捨てて1）、オオカミ HP 14 のまま', () => {
    const r = round('defend', [0.5]);
    expect(hp(r.world, 'aria')).toBe(19);
    expect(hp(r.world, 'wolf')).toBe(14);
    expect(r.events[0]).toMatchObject({ actor: 'aria', action: 'defend' });
  });

  it('fixedRng([0.5, 0.3]) でアリアが逃げるとき、逃走に成功し、battleEnd の outcome が fled になる', () => {
    const r = round('flee', [0.5, 0.3]);
    expect(r.ended).toBe(true);
    const end = r.events.at(-1);
    expect(end?.type).toBe('battleEnd');
    expect(end?.outcome).toBe('fled');
  });

  it('fixedRng([0.5, 0.5]) でアリアが逃げるとき、逃走に失敗し、戦闘が続く', () => {
    const r = round('flee', [0.5, 0.5]);
    expect(r.ended).toBe(false);
    expect(r.events.find((e) => e.action === 'flee')?.outcome).toBe('failure');
  });

  it('同じ初期状態から行動だけを変えると、3通りの結果の世界状態はすべて異なる', () => {
    const a = JSON.stringify(round('attack', [0.5]).world);
    const d = JSON.stringify(round('defend', [0.5]).world);
    const f = JSON.stringify(round('flee', [0.5, 0.3]).world);
    expect(new Set([a, d, f]).size).toBe(3);
  });

  it('解決しても、引数に渡した世界状態は変わらない', () => {
    const w = battleWorld();
    const before = JSON.stringify(w);
    resolveRound(w, 'aria', 'attack', 'wolf', 'attack', fixedRng([0.5]));
    expect(JSON.stringify(w)).toBe(before);
  });

  it('HP が0になった側は state が down になり、そのラウンドではもう行動しない', () => {
    const w = battleWorld();
    w.entities.aria!.params.hp = 2;
    const r = resolveRound(w, 'aria', 'attack', 'wolf', 'attack', fixedRng([0.5]));
    expect(r.world.entities.aria?.state).toBe('down');
    expect(r.events.map((e) => e.type)).toEqual(['action', 'defeated', 'battleEnd']);
    expect(r.events.at(-1)?.outcome).toBe('defeat');
  });
});
