import type { ActionId, Catalog, DecisionRecord, EntityId, WorldEvent, WorldState } from '../domain/types';
import { applyAction } from '../rules/apply';

// #region executePlan
/**
 * 計画を実行して、出来事の列を作る。
 * 最初に計画を立てたこと（type: 'plan'、decision 付き）を記録し、続けて行為ごとに出来事を出す。
 * 計画を立てることは認知的な行為なので、時刻は進めない。
 */
export function executePlan(
  world: WorldState,
  catalog: Catalog,
  actorId: EntityId,
  plan: ActionId[],
  decision: DecisionRecord,
): { world: WorldState; events: WorldEvent[] } {
  const events: WorldEvent[] = [{ t: world.t, type: 'plan', actor: actorId, decision }];
  let w = world;
  for (const actionId of plan) {
    const r = applyAction(w, catalog, actorId, actionId);
    w = r.world;
    events.push(r.event);
  }
  return { world: w, events };
}
// #endregion
