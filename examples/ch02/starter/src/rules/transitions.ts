import type { Change, EntityId, WorldState } from '../domain/types';
import { evaluate } from './conditions';

// #region applyTransitions
/**
 * 変化したエンティティについて、閾値による状態遷移を評価する。
 * 各エンティティで最初に条件を満たした規則を1つだけ適用する（連鎖はしない）。
 * 遷移先に presets があれば、その値でパラメータを上書きする。
 * world を直接書き換えるので、呼び出し側で複製した世界状態を渡すこと。
 */
export function applyTransitions(world: WorldState, entityIds: EntityId[]): Change[] {
  const changes: Change[] = [];
  for (const id of entityIds) {
    const e = world.entities[id];
    if (e === undefined || e.kind !== 'object') continue;
    for (const tr of e.transitions ?? []) {
      if (tr.from !== undefined && tr.from !== e.state) continue;
      if (tr.to === e.state) continue;
      const ok = tr.when.every((c) => evaluate(c, { world, selfId: id }));
      if (!ok) continue;

      changes.push({ entity: id, field: 'state', before: e.state, after: tr.to, via: 'transition' });
      e.state = tr.to;
      const preset = e.presets?.[tr.to];
      for (const [key, value] of Object.entries(preset ?? {})) {
        changes.push({ entity: id, field: 'param', key, before: e.params[key] ?? 0, after: value, via: 'transition' });
        e.params[key] = value;
      }
      break; // 1回の行為につき、1つのエンティティで1つの規則だけ
    }
  }
  return changes;
}
// #endregion
