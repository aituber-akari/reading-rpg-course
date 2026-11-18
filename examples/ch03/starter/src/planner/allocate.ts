import type { ActionId, AllocOption, Obstacle } from '../domain/types';

export type { AllocOption, Obstacle } from '../domain/types';

export interface Allocation {
  choices: ActionId[];
  totalTime: number;
  /** メモに記録した部分問題の数（貪欲法では0）。 */
  states: number;
}

export interface Budget {
  stamina: number;
  mana: number;
}

const fits = (o: AllocOption, s: number, m: number): boolean => o.stamina <= s && o.mana <= m;

// #region allocate
/**
 * 動的計画法による資源配分。予算の中で、かかる時間の合計を最小にする越え方を選ぶ。
 * 部分問題 f(i, s, m) =「i番目以降の障害を、残り体力 s・残り魔力 m で越えるときの最小時間」。
 * (i, s, m) をキーにメモ化する。越えられないときは null を返す。
 */
export function allocate(obstacles: Obstacle[], budget: Budget): Allocation | null {
  const memo = new Map<string, { time: number; choice: number }>();

  const f = (i: number, s: number, m: number): number => {
    const obstacle = obstacles[i];
    if (obstacle === undefined) return 0; // すべて越えた
    const key = `${i},${s},${m}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit.time;

    let best = { time: Infinity, choice: -1 };
    obstacle.options.forEach((o, k) => {
      if (!fits(o, s, m)) return;
      const t = o.time + f(i + 1, s - o.stamina, m - o.mana);
      if (t < best.time) best = { time: t, choice: k }; // 同じ時間なら先に書かれた越え方
    });
    memo.set(key, best);
    return best.time;
  };

  const total = f(0, budget.stamina, budget.mana);
  if (total === Infinity) return null;

  // メモをたどって、選んだ越え方を復元する。
  const choices: ActionId[] = [];
  let s = budget.stamina;
  let m = budget.mana;
  obstacles.forEach((obstacle, i) => {
    const entry = memo.get(`${i},${s},${m}`);
    const o = entry === undefined ? undefined : obstacle.options[entry.choice];
    if (o === undefined) return;
    choices.push(o.actionId);
    s -= o.stamina;
    m -= o.mana;
  });
  return { choices, totalTime: total, states: memo.size };
}
// #endregion

// #region greedyAllocate
/** 比較用の貪欲法：各障害で、予算の中で最も速い越え方を選ぶ。先を見ないので、最善になるとは限らない。 */
export function greedyAllocate(obstacles: Obstacle[], budget: Budget): Allocation | null {
  const choices: ActionId[] = [];
  let s = budget.stamina;
  let m = budget.mana;
  let total = 0;
  for (const obstacle of obstacles) {
    let pick: AllocOption | undefined;
    for (const o of obstacle.options) {
      if (fits(o, s, m) && (pick === undefined || o.time < pick.time)) pick = o;
    }
    if (pick === undefined) return null;
    choices.push(pick.actionId);
    s -= pick.stamina;
    m -= pick.mana;
    total += pick.time;
  }
  return { choices, totalTime: total, states: 0 };
}
// #endregion
