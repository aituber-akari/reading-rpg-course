import type { Catalog, Cost, EntityId, Goal, WorldState } from '../domain/types';
import { stableStringify } from '../lib/stableStringify';
import { availableAffordances, findAction } from '../rules/affordances';
import { applyAction } from '../rules/apply';
import { evaluate } from '../rules/conditions';
import type { SearchProblem } from './search/types';

export type CostWeights = Partial<Record<keyof Cost, number>>;

// #region stateKey
/**
 * 状態の同一性を表す文字列。全エンティティの state・params・location を、ID の順に並べる。
 * 時刻 t は含めない。ignore で、特定のエンティティのパラメータを外せる。
 */
export function stateKey(world: WorldState, ignore: { entity: EntityId; keys: string[] }[] = []): string {
  const ids = Object.keys(world.entities).sort();
  const parts: unknown[] = [];
  for (const id of ids) {
    const e = world.entities[id];
    if (e === undefined) continue;
    const params: Record<string, number> = { ...e.params };
    for (const ig of ignore) {
      if (ig.entity === id) for (const k of ig.keys) delete params[k];
    }
    parts.push([id, e.state, params, e.location]);
  }
  return stableStringify(parts);
}
// #endregion

/** 辺のコスト = Σ（重み × 行為のコスト）。 */
export function weightedCost(cost: Cost, weights: CostWeights): number {
  let sum = 0;
  for (const [key, w] of Object.entries(weights)) {
    sum += (w ?? 0) * (cost[key as keyof Cost] ?? 0);
  }
  return sum;
}

/** 目標を満たしているか。 */
export function goalReached(world: WorldState, actorId: EntityId, goal: Goal): boolean {
  return goal.conditions.every((c) => evaluate(c, { world, actorId }));
}

// #region makeWorldProblem
/**
 * 世界状態を探索問題にする。後続は availableAffordances の順（ActionId の辞書順）に並ぶ。
 * 単一の資源だけを最小化するときは、その資源（行為者のパラメータ）を stateKey から外す。
 * 重みを2つ以上の資源に付けるときは、資源を状態から外さない。
 */
export function makeWorldProblem(
  world: WorldState,
  catalog: Catalog,
  actorId: EntityId,
  goal: Goal,
  opts: { costWeights?: CostWeights; heuristic?: (w: WorldState) => number } = {},
): SearchProblem<WorldState> {
  const weights: CostWeights = opts.costWeights ?? { stamina: 1 };
  const resources = Object.entries(weights)
    .filter(([, w]) => (w ?? 0) > 0)
    .map(([k]) => k);
  const ignore = resources.length === 1 ? [{ entity: actorId, keys: resources }] : [];

  const problem: SearchProblem<WorldState> = {
    start: world,
    isGoal: (s) => goalReached(s, actorId, goal),
    successors: (s) =>
      availableAffordances(s, catalog, actorId).map((a) => ({
        action: a.actionId,
        state: applyAction(s, catalog, actorId, a.actionId).world,
        cost: weightedCost(findAction(catalog, a.actionId).cost, weights),
      })),
    key: (s) => stateKey(s, ignore),
  };
  const h = opts.heuristic;
  if (h !== undefined) problem.heuristic = h;
  return problem;
}
// #endregion
