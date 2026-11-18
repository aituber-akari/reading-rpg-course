import type { Agent, Change, Step, WorldEvent } from './domain/types';

// 冒険を進める。序章では、規則（rules）と進行（sim）の役割をこの1ファイルで持つ。
// 第1章で sim/ に移す。

// #region runAdventure
/**
 * 道のりを順に処理し、出来事の列を返す。
 * 引数の hero は書き換えず、新しいオブジェクトを返す。
 */
export function runAdventure(hero: Agent, steps: Step[]): { hero: Agent; events: WorldEvent[] } {
  let current: Agent = { ...hero, params: { ...hero.params } };
  const events: WorldEvent[] = [];
  let t = 1;

  // 最初に出発の出来事を出す。出発時の HP を記録しておく（変化はしない）。
  const hp0 = current.params.hp;
  events.push({
    t: t++,
    type: 'action',
    actor: current.id,
    action: 'depart',
    place: current.location,
    changes: [{ entity: current.id, field: 'param', key: 'hp', before: hp0, after: hp0 }],
  });

  for (const step of steps) {
    if (step.kind === 'move') {
      current = { ...current, location: step.to };
      events.push({ t: t++, type: 'action', actor: current.id, action: 'move', place: step.to });
    } else if (step.kind === 'encounter') {
      const before = current.params.hp;
      const after = Math.max(0, before - step.enemy.power);
      current = { ...current, params: { ...current.params, hp: after } };
      events.push({
        t: t++,
        type: 'encounter',
        actor: current.id,
        target: step.enemy.id,
        place: current.location,
        changes: [hpChange(current.id, before, after)],
      });
    } else {
      // #region rest
      const before = current.params.hp;
      const after = before + step.amount;
      current = { ...current, params: { ...current.params, hp: after } };
      events.push({
        t: t++,
        type: 'action',
        actor: current.id,
        action: 'rest',
        place: current.location,
        changes: [hpChange(current.id, before, after)],
      });
      // #endregion
    }

    if (current.params.hp <= 0) {
      events.push({ t: t++, type: 'defeated', actor: current.id, place: current.location });
      break; // 倒れたら、残りの手順は処理しない
    }
  }

  return { hero: current, events };
}
// #endregion

function hpChange(entity: string, before: number, after: number): Change {
  return { entity, field: 'param', key: 'hp', before, after };
}
