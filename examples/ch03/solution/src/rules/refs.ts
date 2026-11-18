import type { EntityId, Ref, WorldState } from '../domain/types';

/** 条件・効果を評価するときの文脈。 */
export interface RuleContext {
  world: WorldState;
  actorId?: EntityId;
  targetId?: EntityId;
  selfId?: EntityId;
}

/**
 * 参照を解決する。'$actor'・'$target'・'$self' は文脈から、それ以外はエンティティIDとして解決する。
 * 解決できない（文脈にない、または世界に存在しない）ときは undefined を返す。
 */
export function resolveRef(ref: Ref, ctx: RuleContext): EntityId | undefined {
  let id: EntityId | undefined;
  if (ref === '$actor') id = ctx.actorId;
  else if (ref === '$target') id = ctx.targetId;
  else if (ref === '$self') id = ctx.selfId;
  else id = ref;
  if (id === undefined || ctx.world.entities[id] === undefined) return undefined;
  return id;
}
