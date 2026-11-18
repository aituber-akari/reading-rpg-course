import type { Policy } from '../domain/types';

// 方策：その場の状況から行動を1つ選ぶ。乱数は使わない。

/** 好戦的：いつも攻撃する。 */
export const aggressive: Policy = () => 'attack';

// #region cautious
/** 慎重：HPが最大の30%以下なら防御し、それ以外は攻撃する。 */
export const cautious: Policy = (world, selfId) => {
  const self = world.entities[selfId];
  if (self === undefined) return 'attack';
  return self.params.hp <= self.params.maxHp * 0.3 ? 'defend' : 'attack';
};
// #endregion

/** 臆病：いつも逃げようとする。 */
export const coward: Policy = () => 'flee';

// #region retreatAtHalf
/** 演習：HPが最大の半分以下なら逃げ、それ以外は攻撃する。 */
export const retreatAtHalf: Policy = (world, selfId) => {
  const self = world.entities[selfId];
  if (self === undefined) return 'attack';
  return self.params.hp <= self.params.maxHp / 2 ? 'flee' : 'attack';
};
// #endregion

/** CLI から名前で選べる方策の一覧。 */
export const policies: Record<string, Policy> = { aggressive, cautious, coward, retreatAtHalf };
