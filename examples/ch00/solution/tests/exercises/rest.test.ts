import { describe, expect, it } from 'vitest';
import { runAdventure } from '../../src/adventure';
import { hero } from '../../src/content/scenario';
import type { Step } from '../../src/domain/types';
import { formatLog } from '../../src/narration/format';

describe('演習：休む', () => {
  it('HP 5 で { kind: "rest", amount: 3 } を処理するとき、HP 5→8 の変化が記録され、ログに「休んだ」が含まれる', () => {
    const steps: Step[] = [{ kind: 'rest', amount: 3 }];
    const { events, hero: after } = runAdventure({ ...hero, params: { hp: 5 } }, steps);
    const rest = events.find((e) => e.action === 'rest');
    expect(rest?.changes).toContainEqual({ entity: hero.id, field: 'param', key: 'hp', before: 5, after: 8 });
    expect(after.params.hp).toBe(8);
    const lines = formatLog(events, { [hero.id]: hero.name, village: '村' });
    expect(lines.some((l) => l.includes('休んだ'))).toBe(true);
  });
});
