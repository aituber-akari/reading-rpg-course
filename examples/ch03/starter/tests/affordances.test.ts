import { describe, expect, it } from 'vitest';
import { cliffCatalog, cliffWorld } from '../src/content/cliff';
import type { WorldState } from '../src/domain/types';
import { availableAffordances, checkAction, sceneOf } from '../src/rules/affordances';
import { applyAction } from '../src/rules/apply';

function ids(world: WorldState, actorId: string): string[] {
  return availableAffordances(world, cliffCatalog, actorId).map((a) => a.actionId);
}

describe('availableAffordances', () => {
  it('通常の環境のとき、同じ崖でも技能・持ち物によって使える行為が変わる', () => {
    const w = cliffWorld('normal');
    expect(ids(w, 'aria')).toEqual(['climb:direct', 'climb:vine']);
    expect(ids(w, 'bord')).toEqual(['climb:vine', 'hook:rope']);
    expect(ids(w, 'sena')).toEqual(['cast:levitate']);
  });

  it('嵐で蔦が切れた環境のとき、蔦を使う行為が誰にとっても消える', () => {
    const w = cliffWorld('storm');
    expect(ids(w, 'aria')).toEqual(['climb:direct']);
    expect(ids(w, 'bord')).toEqual(['hook:rope']);
    expect(ids(w, 'sena')).toEqual(['cast:levitate']);
  });

  it('岩の突起が崩れた環境のとき、ボルドは蔦を登ることしかできない', () => {
    expect(ids(cliffWorld('crumbled'), 'bord')).toEqual(['climb:vine']);
  });

  it('体力 2 のアリアのとき、蔦を登る行為（体力3）は含まれない（コストは前提条件に展開される）', () => {
    const w = cliffWorld();
    w.entities.aria!.params.stamina = 2;
    expect(ids(w, 'aria')).not.toContain('climb:vine');
  });

  it('使える行為には、行為の種類・対象・コストが付く', () => {
    const [aff] = availableAffordances(cliffWorld(), cliffCatalog, 'sena');
    expect(aff).toEqual({ actionId: 'cast:levitate', actorId: 'sena', kind: 'behavioral', cost: { mana: 4 } });
  });
});

describe('checkAction', () => {
  it('セナが蔦を登ろうとするとき、ok は false で、満たされない条件は登攀の条件1つだけ', () => {
    const check = checkAction(cliffWorld(), cliffCatalog, 'sena', 'climb:vine');
    expect(check.ok).toBe(false);
    expect(check.failed).toEqual([{ type: 'capability', of: '$actor', id: 'climb', min: 1 }]);
  });

  it('体力が足りないとき、満たされない条件にコスト由来の条件が含まれる', () => {
    const w = cliffWorld();
    w.entities.aria!.params.stamina = 2;
    const check = checkAction(w, cliffCatalog, 'aria', 'climb:vine');
    expect(check.failed).toEqual([{ type: 'param', of: '$actor', key: 'stamina', op: '>=', value: 3 }]);
  });
});

describe('他者の行為とアフォーダンス', () => {
  it('ボルドが鉤縄を掛けた後のとき、アリアの使える行為に「鉤縄を登る」が現れる', () => {
    const before = cliffWorld();
    expect(ids(before, 'aria')).not.toContain('climb:rope');
    const { world } = applyAction(before, cliffCatalog, 'bord', 'hook:rope');
    expect(ids(world, 'aria')).toContain('climb:rope');
  });
});

describe('sceneOf', () => {
  it('崖下の場面には、そこにいる人物と物が入り、人物が持つ物（鉤縄）は入らない', () => {
    const scene = sceneOf(cliffWorld(), 'cliff-bottom');
    expect(scene.place.id).toBe('cliff-bottom');
    expect(scene.present.map((e) => e.id)).toEqual(['aria', 'bord', 'cliff', 'sena', 'vine']);
  });
});
