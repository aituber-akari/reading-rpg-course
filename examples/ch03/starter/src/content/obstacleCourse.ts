import type { Obstacle } from '../domain/types';

// 第3章の DP 演習のデータ：山道に障害が3つ続き、それぞれ3つの越え方から1つを選ぶ。

const opt = (actionId: string, label: string, stamina: number, mana: number, time: number) => ({
  actionId,
  label,
  stamina,
  mana,
  time,
});

export const obstacleCourse: Obstacle[] = [
  {
    id: 'cliff',
    label: '崖',
    options: [opt('cliff:climb', '登る', 4, 0, 3), opt('cliff:levitate', '浮遊', 0, 3, 1), opt('cliff:detour', '遠回り', 1, 0, 6)],
  },
  {
    id: 'rapids',
    label: '急流',
    options: [opt('rapids:swim', '泳ぐ', 5, 0, 2), opt('rapids:freeze', '凍結の魔法', 0, 4, 1), opt('rapids:shallows', '浅瀬を探す', 2, 0, 5)],
  },
  {
    id: 'thorns',
    label: '茨の壁',
    options: [opt('thorns:cut', '切り開く', 3, 0, 2), opt('thorns:fire', '炎の魔法', 0, 2, 1), opt('thorns:detour', '迂回', 1, 0, 4)],
  },
];

/** 比較に使う予算（体力, 魔力）。 */
export const budgets: { stamina: number; mana: number }[] = [
  { stamina: 7, mana: 4 },
  { stamina: 8, mana: 5 },
  { stamina: 3, mana: 2 },
  { stamina: 0, mana: 9 },
  { stamina: 2, mana: 1 },
];
