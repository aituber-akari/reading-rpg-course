import type { Agent, Entity, EntityId, Place, WorldObject, WorldState } from './types';

// エンティティを取り出す補助関数。見つからないとき・種類が違うときは例外を投げる。

export function getEntity(world: WorldState, id: EntityId): Entity {
  const e = world.entities[id];
  if (e === undefined) throw new Error(`エンティティが見つからない: ${id}`);
  return e;
}

export function getAgent(world: WorldState, id: EntityId): Agent {
  const e = getEntity(world, id);
  if (e.kind !== 'agent') throw new Error(`人物ではない: ${id}`);
  return e;
}

export function getObject(world: WorldState, id: EntityId): WorldObject {
  const e = getEntity(world, id);
  if (e.kind !== 'object') throw new Error(`物ではない: ${id}`);
  return e;
}

export function getPlace(world: WorldState, id: EntityId): Place {
  const e = getEntity(world, id);
  if (e.kind !== 'place') throw new Error(`場所ではない: ${id}`);
  return e;
}

/** よく使うパラメータの表示名。ここにないキーは、キーのまま表示する。 */
export const paramLabels: Record<string, string> = {
  hp: 'HP',
  stamina: '体力',
  mana: '魔力',
  strength: '強度',
};

export function paramLabel(key: string): string {
  return paramLabels[key] ?? key;
}
