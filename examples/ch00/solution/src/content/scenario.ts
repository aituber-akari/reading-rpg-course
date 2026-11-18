import type { Agent, Step } from '../domain/types';

// 冒険の設定。名前・HP・道のりを書き換えると、ログが変わる。

// #region hero
/** 主人公。 */
export const hero: Agent = {
  id: 'lina',
  name: 'リナ',
  params: { hp: 12 },
  location: 'village',
};
// #endregion

// #region steps
/** 道のり。上から順に処理する。 */
export const steps: Step[] = [
  { kind: 'move', to: 'forest' },
  { kind: 'encounter', enemy: { id: 'slime', name: 'スライム', power: 3 } },
  { kind: 'move', to: 'cave-entrance' },
  { kind: 'encounter', enemy: { id: 'bat', name: '大コウモリ', power: 4 } },
];
// #endregion

/** 場所の名前の対応表。 */
export const placeNames: Record<string, string> = {
  village: '村',
  forest: '森',
  'cave-entrance': '洞窟の入口',
};

/** ID から表示名への対応表を作る（人物・場所・敵）。 */
export function namesOf(agent: Agent, route: Step[]): Record<string, string> {
  const names: Record<string, string> = { ...placeNames, [agent.id]: agent.name };
  for (const step of route) {
    if (step.kind === 'encounter') {
      names[step.enemy.id] = step.enemy.name;
    }
  }
  return names;
}
