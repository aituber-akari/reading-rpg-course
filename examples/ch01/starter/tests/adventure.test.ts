import { describe, expect, it } from 'vitest';
import { runAdventure } from '../src/sim/adventure';
import { hero, namesOf, steps } from '../src/content/scenario';
import type { Agent, Step } from '../src/domain/types';
import { formatLog } from '../src/narration/format';

function withHp(hp: number, name = hero.name): Agent {
  return { ...hero, name, params: { ...hero.params, hp, maxHp: hp } };
}

describe('runAdventure（序章の冒険。第1章で sim/ に移した）', () => {
  it('主人公の名前が「リナ」のとき、ログの1行目に「リナ」と「出発」が含まれる', () => {
    const { events } = runAdventure(hero, steps);
    const lines = formatLog(events, namesOf(hero, steps));
    expect(lines[0]).toContain('リナ');
    expect(lines[0]).toContain('出発');
  });

  it('既定の道のりのとき、イベントの type は action, action, encounter, action, encounter の順に並ぶ', () => {
    const { events } = runAdventure(hero, steps);
    expect(events.map((e) => e.type)).toEqual(['action', 'action', 'encounter', 'action', 'encounter']);
  });

  it('既定の設定のとき、ログは設計どおりの5行になる', () => {
    const { events } = runAdventure(hero, steps);
    expect(formatLog(events, namesOf(hero, steps))).toEqual([
      '[1] リナは村を出発した。（HP 12）',
      '[2] リナは森へ移動した。',
      '[3] リナはスライムに遭遇した！ HP 12→9',
      '[4] リナは洞窟の入口へ移動した。',
      '[5] リナは大コウモリに遭遇した！ HP 9→5',
    ]);
  });

  it('HP 6 で既定の道のりを進むとき、2回目の遭遇で HP 3→0 となり、defeated の後にイベントはない', () => {
    const { events, hero: after } = runAdventure(withHp(6), steps);
    const last2 = events.slice(-2);
    expect(last2[0]?.type).toBe('encounter');
    expect(last2[0]?.changes).toEqual([{ entity: 'lina', field: 'param', key: 'hp', before: 3, after: 0 }]);
    expect(last2[1]?.type).toBe('defeated');
    expect(after.params.hp).toBe(0);
    expect(after.state).toBe('down');
  });

  it('倒れた後に手順が残っているとき、残りの手順は処理しない', () => {
    const route: Step[] = [...steps, { kind: 'move', to: 'forest' }];
    const { events } = runAdventure(withHp(6), route);
    expect(events.at(-1)?.type).toBe('defeated');
    expect(events).toHaveLength(6);
  });

  it('遭遇のダメージが HP を上回るとき、HP は0未満にならない', () => {
    const { events } = runAdventure(withHp(2), steps);
    const enc = events.find((e) => e.type === 'encounter');
    expect(enc?.changes?.[0]?.after).toBe(0);
  });

  it('名前とHPが異なる2つの設定で実行すると、ログが異なる', () => {
    const a = runAdventure(withHp(12, 'リナ'), steps);
    const b = runAdventure(withHp(20, 'カイ'), steps);
    const la = formatLog(a.events, namesOf(withHp(12, 'リナ'), steps));
    const lb = formatLog(b.events, namesOf(withHp(20, 'カイ'), steps));
    expect(la).not.toEqual(lb);
    expect(lb[0]).toBe('[1] カイは村を出発した。（HP 20）');
  });

  it('実行しても、引数に渡した hero の hp は変わらない', () => {
    const input = withHp(12);
    runAdventure(input, steps);
    expect(input.params.hp).toBe(12);
    expect(input.location).toBe('village');
  });

  it('HP 5 で休む手順（amount 3）を処理するとき、HP 5→8 の変化が記録され、ログに「休んだ」が含まれる', () => {
    const { events } = runAdventure(withHp(5), [{ kind: 'rest', amount: 3 }]);
    const rest = events.find((e) => e.action === 'rest');
    expect(rest?.changes).toContainEqual({ entity: 'lina', field: 'param', key: 'hp', before: 5, after: 8 });
    expect(formatLog(events, namesOf(hero, steps)).some((l) => l.includes('休んだ'))).toBe(true);
  });
});
