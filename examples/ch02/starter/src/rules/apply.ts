import type { ActionId, Catalog, Change, EntityId, WorldEvent, WorldState } from '../domain/types';
import { getEntity } from '../domain/entities';
import { checkAction, costEffects, findAction } from './affordances';
import { applyEffects } from './effects';
import { applyTransitions } from './transitions';

// #region applyAction
/**
 * 行為を実行し、新しい世界状態と出来事を返す。引数の world は変更しない。
 * 1. 前提条件とコスト条件を確かめる  2. 世界状態を複製する  3. コストを引く
 * 4. 効果を順に適用する  5. 変化した物の状態遷移を評価する  6. 変化を記録した出来事を作る
 */
export function applyAction(
  world: WorldState,
  catalog: Catalog,
  actorId: EntityId,
  actionId: ActionId,
): { world: WorldState; event: WorldEvent } {
  const check = checkAction(world, catalog, actorId, actionId);
  if (!check.ok) throw new Error(`行為の前提条件を満たしていない: ${actorId} / ${actionId}`);

  const def = findAction(catalog, actionId);
  const next: WorldState = structuredClone(world);
  const ctx = def.target === undefined ? { world: next, actorId } : { world: next, actorId, targetId: def.target };
  const place = getEntity(next, actorId).location;

  const changes: Change[] = [];
  changes.push(...applyEffects(costEffects(def), ctx, 'cost'));
  changes.push(...applyEffects(def.effects, ctx, 'effect'));
  const touched = [...new Set(changes.map((c) => c.entity))];
  changes.push(...applyTransitions(next, touched));

  next.t += 1;
  const event: WorldEvent = { t: next.t, type: 'action', actor: actorId, action: actionId };
  if (def.target !== undefined) event.target = def.target;
  if (place !== null) event.place = place;
  event.changes = changes;
  return { world: next, event };
}
// #endregion
