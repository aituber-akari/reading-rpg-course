import type { EntityId, WorldState } from '../domain/types';
import { param } from '../rules/params';

// #region manhattanToPlace
/**
 * 目標の場所までのマンハッタン距離 + （目標の場所にいなければ 1）。
 * 座標は場所の params.x・params.y。歩く行為はどれもコスト1で距離を1だけ縮め、
 * 崖を越える行為はどれもコスト1以上なので、許容的かつ無矛盾である。
 */
export function manhattanToPlace(goalPlaceId: EntityId, actorId: EntityId): (w: WorldState) => number {
  return (w) => {
    const goal = w.entities[goalPlaceId];
    const loc = w.entities[actorId]?.location;
    const here = loc === null || loc === undefined ? undefined : w.entities[loc];
    if (goal === undefined || here === undefined) return 0;
    const d = Math.abs(param(here, 'x') - param(goal, 'x')) + Math.abs(param(here, 'y') - param(goal, 'y'));
    return d + (here.id === goalPlaceId ? 0 : 1);
  };
}
// #endregion
