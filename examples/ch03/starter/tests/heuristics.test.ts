import { describe, expect, it } from 'vitest';
import type { WorldState } from '../src/domain/types';
import { manhattanToPlace } from '../src/planner/heuristics';
import { valleyProblem } from './helpers/valley';

describe('manhattanToPlace', () => {
  const h = manhattanToPlace('cliff-top', 'aria');

  it('到達できるすべての状態と辺で h(s) ≦ cost + h(s′)（無矛盾）であり、目標で h = 0 になる', () => {
    const p = valleyProblem();
    const seen = new Set<string>([p.key(p.start)]);
    const queue: WorldState[] = [p.start];
    let edges = 0;
    while (queue.length > 0) {
      const s = queue.shift()!;
      if (p.isGoal(s)) {
        expect(h(s)).toBe(0);
        continue;
      }
      for (const succ of p.successors(s)) {
        edges++;
        expect(h(s)).toBeLessThanOrEqual(succ.cost + h(succ.state));
        const key = p.key(succ.state);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push(succ.state);
        }
      }
    }
    expect(edges).toBeGreaterThan(20);
  });

  it('村（0, −2）にいるとき、h = 2 + 1 = 3 になる', () => {
    expect(h(valleyProblem().start)).toBe(3);
  });
});
