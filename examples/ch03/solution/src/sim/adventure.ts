import type { Agent, Change, Step, WorldEvent } from '../domain/types';
import { param } from '../rules/params';

// 序章の冒険を進める。第1章で src/adventure.ts から sim/ に移した。
// 序章の機能は CLI の --mode adventure で引き続き動く。

// #region runAdventure
/**
 * 道のりを順に処理し、出来事の列を返す。
 * 引数の hero は書き換えず、新しいオブジェクトを返す。
 */
export function runAdventure(hero: Agent, steps: Step[]): { hero: Agent; events: WorldEvent[] } {
  let current: Agent = structuredClone(hero);
  const events: WorldEvent[] = [];
  let t = 1;
  const placeOf = (a: Agent): { place?: string } => (a.location === null ? {} : { place: a.location });

  // 最初に出発の出来事を出す。出発時の HP を記録しておく（変化はしない）。
  const hp0 = param(current, 'hp');
  events.push({
    t: t++,
    type: 'action',
    actor: current.id,
    action: 'depart',
    ...placeOf(current),
    changes: [hpChange(current.id, hp0, hp0)],
  });

  for (const step of steps) {
    if (step.kind === 'move') {
      current = { ...current, location: step.to };
      events.push({ t: t++, type: 'action', actor: current.id, action: 'move', place: step.to });
    } else if (step.kind === 'encounter') {
      const before = param(current, 'hp');
      const after = Math.max(0, before - step.enemy.power);
      current = { ...current, params: { ...current.params, hp: after } };
      events.push({
        t: t++,
        type: 'encounter',
        actor: current.id,
        target: step.enemy.id,
        ...placeOf(current),
        changes: [hpChange(current.id, before, after)],
      });
    } else {
      const before = param(current, 'hp');
      const after = before + step.amount;
      current = { ...current, params: { ...current.params, hp: after } };
      events.push({
        t: t++,
        type: 'action',
        actor: current.id,
        action: 'rest',
        ...placeOf(current),
        changes: [hpChange(current.id, before, after)],
      });
    }

    if (param(current, 'hp') <= 0) {
      current = { ...current, state: 'down' };
      events.push({ t: t++, type: 'defeated', actor: current.id, ...placeOf(current) });
      break; // 倒れたら、残りの手順は処理しない
    }
  }

  return { hero: current, events };
}
// #endregion

function hpChange(entity: string, before: number, after: number): Change {
  return { entity, field: 'param', key: 'hp', before, after, via: 'effect' };
}
