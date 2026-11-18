import { describe, expect, it } from 'vitest';
import { cliffValleyCatalog, cliffValleyWorld } from '../src/content/cliffValley';
import type { DecisionRecord } from '../src/domain/types';
import { dijkstra } from '../src/planner/search/dijkstra';
import { executePlan } from '../src/sim/executePlan';
import { valleyProblem } from './helpers/valley';

function run() {
  const plan = dijkstra(valleyProblem()).actions;
  const decision: DecisionRecord = {
    goalId: 'reach-top',
    available: { behavioral: ['walk:village->fork'], cognitive: [] },
    algorithm: 'dijkstra',
    plan,
    planCost: 7,
  };
  return executePlan(cliffValleyWorld(), cliffValleyCatalog, 'aria', plan, decision);
}

describe('executePlan', () => {
  it('ダイクストラ法の計画を実行すると、最初が plan の出来事で、最後の世界でアリアは崖上、鉤縄は hooked', () => {
    const { world, events } = run();
    expect(events[0]).toMatchObject({ t: 0, type: 'plan', actor: 'aria', decision: { algorithm: 'dijkstra' } });
    expect(events.slice(1).every((e) => e.type === 'action')).toBe(true);
    expect(events).toHaveLength(8);
    expect(world.entities.aria?.location).toBe('cliff-top');
    expect(world.entities.aria?.params.stamina).toBe(13);
    expect(world.entities.rope?.state).toBe('hooked');
  });

  it('同じ入力で2回実行すると、結果が完全に一致する（決定性）', () => {
    expect(run()).toEqual(run());
  });

  it('出来事の列を JSON にして戻すと、元と深く等しい', () => {
    const { events } = run();
    expect(JSON.parse(JSON.stringify(events))).toStrictEqual(events);
  });
});
