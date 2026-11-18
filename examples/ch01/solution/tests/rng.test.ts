import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/rng';

describe('createRng（mulberry32）', () => {
  it('同じシードで作った2つの生成器は、同じ列を返す', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    const ys = Array.from({ length: 5 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('シード42の最初の3つの値は、固定の値になる（アルゴリズムを変えていないことの確認）', () => {
    const r = createRng(42);
    expect([r.next(), r.next(), r.next()]).toMatchSnapshot();
  });

  it('異なるシードでは、異なる列になる', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('next は [0, 1) の値を返し、int(-1, 1) は -1, 0, 1 のいずれかを返す', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect([-1, 0, 1]).toContain(r.int(-1, 1));
    }
  });

  it('snapshot は、シードと現在の内部状態を返す', () => {
    const r = createRng(42);
    r.next();
    const s = r.snapshot();
    expect(s.seed).toBe(42);
    expect(typeof s.s).toBe('number');
  });
});
