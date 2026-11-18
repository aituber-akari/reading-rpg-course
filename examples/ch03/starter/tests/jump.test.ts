import { describe, expect, it } from 'vitest';
import { cliffCatalog, cliffWorld } from '../src/content/cliff';
import type { Agent, WorldState } from '../src/domain/types';
import { availableAffordances } from '../src/rules/affordances';
import { applyAction } from '../src/rules/apply';

function jumper(level: number, stamina = 20): Agent {
  return {
    id: 'kai',
    kind: 'agent',
    name: 'カイ',
    state: 'alive',
    params: { stamina },
    location: 'cliff-bottom',
    capabilities: { jump: level },
  };
}

function worldWith(agent: Agent): WorldState {
  const w = cliffWorld();
  w.entities[agent.id] = agent;
  return w;
}

function ids(world: WorldState): string[] {
  return availableAffordances(world, cliffCatalog, 'kai').map((a) => a.actionId);
}

describe('演習：跳躍の能力と行為 jump:ledge を追加する', () => {
  it('カタログに「跳躍」の能力（jump）がある', () => {
    expect(cliffCatalog.capabilities.find((c) => c.id === 'jump')?.label).toBe('跳躍');
  });

  it('跳躍2の人物が崖下にいるとき、使える行為に jump:ledge が加わる', () => {
    expect(ids(worldWith(jumper(2)))).toEqual(['jump:ledge']);
  });

  it('跳躍1の人物のとき、jump:ledge は使えない', () => {
    expect(ids(worldWith(jumper(1)))).toEqual([]);
  });

  it('体力1の跳躍2の人物のとき、jump:ledge（体力2）は使えない', () => {
    expect(ids(worldWith(jumper(2, 1)))).toEqual([]);
  });

  it('跳躍2の人物が jump:ledge を実行すると、岩棚に移り、体力が2減る', () => {
    const { world } = applyAction(worldWith(jumper(2)), cliffCatalog, 'kai', 'jump:ledge');
    expect(world.entities.kai?.location).toBe('ledge');
    expect(world.entities.kai?.params.stamina).toBe(18);
  });
});
