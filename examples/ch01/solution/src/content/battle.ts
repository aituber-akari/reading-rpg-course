import type { Agent, WorldState } from '../domain/types';

// 第1章の戦闘の登場人物。

export const aria: Agent = {
  id: 'aria',
  kind: 'agent',
  name: 'アリア',
  state: 'alive',
  params: { hp: 20, maxHp: 20, atk: 6, def: 2, agi: 5 },
  location: 'meadow',
};

export const wolf: Agent = {
  id: 'wolf',
  kind: 'agent',
  name: '灰色オオカミ',
  state: 'alive',
  params: { hp: 14, maxHp: 14, atk: 5, def: 1, agi: 6 },
  location: 'meadow',
};

/** 戦闘の初期状態を作る。 */
export function battleWorld(): WorldState {
  return { t: 0, entities: { aria: structuredClone(aria), wolf: structuredClone(wolf) } };
}
