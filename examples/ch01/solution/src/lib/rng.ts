// 乱数生成器。アルゴリズムは mulberry32 に固定する。
// アルゴリズムを変えると、シードによる結果（スナップショット）がすべて変わる。
// Math.random は使わず、乱数は必ずこのモジュールを通す。

/** 乱数生成器の内部状態（保存できる形）。 */
export interface RngState {
  seed: number;
  s: number;
}

export interface Rng {
  /** [0, 1) の数を返す。 */
  next(): number;
  /** min 以上 max 以下の整数を返す（min + floor(next() * (max - min + 1))）。 */
  int(min: number, max: number): number;
  /** 現在の内部状態を返す。 */
  snapshot(): RngState;
}

// #region createRng
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    snapshot: () => ({ seed, s }),
  };
}
// #endregion
