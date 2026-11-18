import type { Policy, WorldEvent, WorldState } from '../domain/types';
import type { Rng } from '../lib/rng';
import { resolveRound } from '../rules/combat';

export type BattleOutcome = 'victory' | 'defeat' | 'fled' | 'draw';

// #region runBattle
/**
 * 決着がつくまでラウンドを繰り返す。
 * 毎ラウンド、両者の方策が行動を宣言し、resolveRound で解決する。
 * maxRounds で決着しなければ引き分け（draw）とする。
 */
export function runBattle(
  world: WorldState,
  heroId: string,
  enemyId: string,
  policies: { hero: Policy; enemy: Policy },
  rng: Rng,
  maxRounds = 20,
): { world: WorldState; events: WorldEvent[]; outcome: BattleOutcome } {
  let w = world;
  const events: WorldEvent[] = [];
  for (let round = 1; round <= maxRounds; round++) {
    const heroAction = policies.hero(w, heroId, enemyId);
    const enemyAction = policies.enemy(w, enemyId, heroId);
    const r = resolveRound(w, heroId, heroAction, enemyId, enemyAction, rng);
    w = r.world;
    events.push(...r.events);
    if (r.ended) {
      const end = r.events.at(-1);
      const outcome = end?.outcome;
      if (outcome === 'victory' || outcome === 'defeat' || outcome === 'fled') {
        return { world: w, events, outcome };
      }
    }
  }
  events.push({ t: w.t, type: 'battleEnd', actor: heroId, target: enemyId, outcome: 'draw' });
  return { world: w, events, outcome: 'draw' };
}
// #endregion
