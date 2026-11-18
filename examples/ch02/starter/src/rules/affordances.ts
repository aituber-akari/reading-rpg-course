import type {
  ActionCheck,
  ActionDef,
  ActionId,
  Affordance,
  Catalog,
  Condition,
  Effect,
  EntityId,
  Scene,
  WorldState,
} from '../domain/types';
import { getPlace } from '../domain/entities';
import { evaluate } from './conditions';

export function findAction(catalog: Catalog, actionId: ActionId): ActionDef {
  const def = catalog.actions.find((a) => a.id === actionId);
  if (def === undefined) throw new Error(`行為が見つからない: ${actionId}`);
  return def;
}

const costKeys = ['stamina', 'mana'] as const;

// #region costExpansion
/** コストを前提条件に展開する：{ param, $actor, key, '>=', v } */
export function costConditions(def: ActionDef): Condition[] {
  const conds: Condition[] = [];
  for (const key of costKeys) {
    const v = def.cost[key];
    if (v !== undefined && v > 0) conds.push({ type: 'param', of: '$actor', key, op: '>=', value: v });
  }
  return conds;
}

/** コストを効果に展開する：{ addParam, $actor, key, -v } */
export function costEffects(def: ActionDef): Effect[] {
  const effects: Effect[] = [];
  for (const key of costKeys) {
    const v = def.cost[key];
    if (v !== undefined && v > 0) effects.push({ type: 'addParam', of: '$actor', key, delta: -v });
  }
  return effects;
}
// #endregion

// #region checkAction
/** 行為を実行できるかを確かめ、満たされなかった条件（コスト由来を含む）を返す。 */
export function checkAction(world: WorldState, catalog: Catalog, actorId: EntityId, actionId: ActionId): ActionCheck {
  const def = findAction(catalog, actionId);
  const ctx = def.target === undefined ? { world, actorId } : { world, actorId, targetId: def.target };
  const failed = [...def.pre, ...costConditions(def)].filter((c) => !evaluate(c, ctx));
  return { ok: failed.length === 0, failed };
}
// #endregion

// #region availableAffordances
/** その人物がいま実行できる行為を、ActionId の辞書順で返す。 */
export function availableAffordances(world: WorldState, catalog: Catalog, actorId: EntityId): Affordance[] {
  const result: Affordance[] = [];
  const ids = catalog.actions.map((a) => a.id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const id of ids) {
    if (!checkAction(world, catalog, actorId, id).ok) continue;
    const def = findAction(catalog, id);
    const aff: Affordance = { actionId: id, actorId, kind: def.kind, cost: { ...def.cost } };
    if (def.target !== undefined) aff.targetId = def.target;
    result.push(aff);
  }
  return result;
}
// #endregion

/** 場面（その場所にいる人物・物）を求める。人物が持つ物は含めない。ID の順に並べる。 */
export function sceneOf(world: WorldState, placeId: EntityId): Scene {
  const place = getPlace(world, placeId);
  const present = Object.values(world.entities)
    .filter((e) => e.location === placeId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { place, present };
}
