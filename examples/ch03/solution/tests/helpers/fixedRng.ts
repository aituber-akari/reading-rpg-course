import type { Rng } from '../../src/lib/rng';

/** 決めた値を順に返す乱数生成器（テスト用）。値が尽きたら最後の値を返し続ける。 */
export function fixedRng(values: number[]): Rng {
  let i = 0;
  const next = (): number => {
    const v = values[Math.min(i, values.length - 1)] ?? 0;
    i += 1;
    return v;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    snapshot: () => ({ seed: -1, s: i }),
  };
}
