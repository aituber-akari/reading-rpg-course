import { cliffValleyCatalog, cliffValleyWorld, reachTop, type AriaSetup } from '../../src/content/cliffValley';
import { manhattanToPlace } from '../../src/planner/heuristics';
import { makeWorldProblem } from '../../src/planner/worldProblem';

/** 崖の谷の探索問題（テスト用）。重みは既定の { stamina: 1 }。 */
export function valleyProblem(setup: AriaSetup = {}) {
  const world = cliffValleyWorld(setup);
  return makeWorldProblem(world, cliffValleyCatalog, 'aria', reachTop, {
    heuristic: manhattanToPlace('cliff-top', 'aria'),
  });
}

/** 計画から歩く行為を除いた、崖まわりの行為の列。 */
export function keyActions(actions: string[]): string[] {
  return actions.filter((a) => !a.startsWith('walk:'));
}
