import { describe, expect, it } from 'vitest';
import { cliffCatalog, cliffWorld } from '../src/content/cliff';
import { applyAction } from '../src/rules/apply';

const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('JSON への変換', () => {
  it('カタログと初期世界を JSON にして戻すと、元と深く等しい', () => {
    expect(roundTrip(cliffCatalog)).toStrictEqual(cliffCatalog);
    for (const env of ['normal', 'storm', 'crumbled'] as const) {
      const w = cliffWorld(env);
      expect(roundTrip(w)).toStrictEqual(w);
    }
  });

  it('行為の出来事と、実行後の世界を JSON にして戻すと、元と深く等しい', () => {
    const r = applyAction(cliffWorld(), cliffCatalog, 'bord', 'hook:rope');
    expect(roundTrip(r.event)).toStrictEqual(r.event);
    expect(roundTrip(r.world)).toStrictEqual(r.world);
  });
});
