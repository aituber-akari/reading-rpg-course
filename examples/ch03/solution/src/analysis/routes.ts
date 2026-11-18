import type { ActionDef, ActionId, Catalog, Condition, Effect, EntityId, Goal, Ref, WorldState } from '../domain/types';
import { findAction } from '../rules/affordances';
import { type CostWeights, makeWorldProblem } from '../planner/worldProblem';

// 解決経路の分析（affordance-model.md 8.3節）。研究用の指標であり、ゲームの規則には使わない。

function refsOfCondition(c: Condition): Ref[] {
  switch (c.type) {
    case 'param':
    case 'state':
    case 'at':
    case 'capability':
      return [c.of];
    case 'holds':
      return [c.of, c.item];
    case 'colocated':
      return [c.a, c.b];
    case 'not':
      return refsOfCondition(c.cond);
  }
}

function refsOfEffect(e: Effect): Ref[] {
  return e.type === 'moveTo' ? [e.of, e.to] : [e.of];
}

function capabilitiesOf(c: Condition): string[] {
  if (c.type === 'capability') return [`cap:${c.id}`];
  if (c.type === 'not') return capabilitiesOf(c.cond);
  return [];
}

/** 1つの行為が利用する物と能力。物は、場所と人物以外のエンティティのうち、対象と、条件・効果で参照されるもの。 */
function exploitedBy(def: ActionDef, world: WorldState): Set<string> {
  const out = new Set<string>();
  const refs: Ref[] = [...def.pre.flatMap(refsOfCondition), ...def.effects.flatMap(refsOfEffect)];
  if (def.target !== undefined) refs.push(def.target);
  for (const ref of refs) {
    if (ref === '$actor' || ref === '$self') continue;
    const id = ref === '$target' ? def.target : ref;
    if (id === undefined) continue;
    const e = world.entities[id];
    if (e === undefined || e.kind !== 'object') continue; // 場所と人物は数えない
    out.add(id);
  }
  for (const c of def.pre) for (const cap of capabilitiesOf(c)) out.add(cap);
  return out;
}

function sortIds(xs: Iterable<string>): string[] {
  return [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// #region routeSignature
/** 経路の識別子：計画が利用した物と能力（cap: を付ける）の集合を、辞書順に並べたもの。 */
export function routeSignature(plan: ActionId[], catalog: Catalog, world: WorldState): EntityId[] {
  const all = new Set<string>();
  for (const id of plan) for (const x of exploitedBy(findAction(catalog, id), world)) all.add(x);
  return sortIds(all);
}
// #endregion

export interface Route {
  signature: EntityId[];
  plan: ActionId[];
  cost: number;
}

interface RouteNode {
  world: WorldState;
  key: string;
  g: number;
  used: string[];
  plan: ActionId[];
}

// #region listRoutes
/**
 * コストの上限以内で目標に届く経路の識別子を集め、包含について極小なものだけを返す。
 * 状態と「これまでに使った物の集合」の組を状態とする均一コスト探索を行い、目標に着いても探索を止めない。
 * 返す順序は、コスト → 識別子の順。
 */
export function listRoutes(
  world: WorldState,
  catalog: Catalog,
  actorId: EntityId,
  goal: Goal,
  opts: { maxCost: number; costWeights?: CostWeights },
): Route[] {
  const problem = makeWorldProblem(
    world,
    catalog,
    actorId,
    goal,
    opts.costWeights === undefined ? {} : { costWeights: opts.costWeights },
  );
  const keyOf = (w: WorldState, used: string[]): string => `${problem.key(w)}|${used.join(',')}`;
  const open: RouteNode[] = [{ world, key: keyOf(world, []), g: 0, used: [], plan: [] }];
  const closed = new Set<string>();
  const found = new Map<string, Route>();

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if ((open[i]?.g ?? Infinity) < (open[best]?.g ?? Infinity)) best = i;
    const node = open.splice(best, 1)[0];
    if (node === undefined) break;
    if (closed.has(node.key)) continue;
    closed.add(node.key);

    if (problem.isGoal(node.world)) {
      const sig = node.used.join(',');
      if (!found.has(sig)) found.set(sig, { signature: node.used, plan: node.plan, cost: node.g });
      continue; // 目標から先へは伸ばさない（物が増えるだけで、極小にはならない）
    }
    for (const s of problem.successors(node.world)) {
      const g = node.g + s.cost;
      if (g > opts.maxCost) continue;
      const used = sortIds(new Set([...node.used, ...exploitedBy(findAction(catalog, s.action), node.world)]));
      const key = keyOf(s.state, used);
      if (!closed.has(key)) open.push({ world: s.state, key, g, used, plan: [...node.plan, s.action] });
    }
  }

  const routes = [...found.values()];
  const isSubset = (a: string[], b: string[]): boolean => a.every((x) => b.includes(x));
  const minimal = routes.filter(
    (r) => !routes.some((o) => o !== r && o.signature.length < r.signature.length && isSubset(o.signature, r.signature)),
  );
  return minimal.sort((a, b) => a.cost - b.cost || (a.signature.join() < b.signature.join() ? -1 : 1));
}
// #endregion
