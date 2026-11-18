import type { Agent, Catalog, Entity, Place, WorldObject, WorldState } from '../domain/types';

// 第2章の作品データ：崖の前で、人物の技能・持ち物と環境によって、使える行為が変わる。

// ===== カタログ（作品データ：実行中は変わらない） =====
export const cliffCatalog = {
  version: 'cliff@0.1',
  capabilities: [
    { id: 'climb', label: '登攀', kind: 'behavioral' },
    { id: 'levitate', label: '浮遊', kind: 'behavioral' },
    // #region jump-capability
    { id: 'jump', label: '跳躍', kind: 'behavioral' },
    // #endregion
  ],
  actions: [
    {
      id: 'climb:direct',
      label: '崖を直接よじ登る',
      kind: 'behavioral',
      target: 'cliff',
      pre: [
        { type: 'at', of: '$actor', place: 'cliff-bottom' },
        { type: 'capability', of: '$actor', id: 'climb', min: 3 },
      ],
      effects: [{ type: 'moveTo', of: '$actor', to: 'cliff-top' }],
      cost: { stamina: 9 },
    },
    {
      id: 'climb:vine',
      label: '蔦をつたって岩棚へ',
      kind: 'behavioral',
      target: 'vine',
      pre: [
        { type: 'at', of: '$actor', place: 'cliff-bottom' },
        { type: 'state', of: 'vine', is: 'intact' },
        { type: 'capability', of: '$actor', id: 'climb', min: 1 },
      ],
      effects: [
        { type: 'moveTo', of: '$actor', to: 'ledge' },
        { type: 'addParam', of: 'vine', key: 'strength', delta: -1 },
      ],
      cost: { stamina: 3 },
    },
    {
      id: 'climb:ledge',
      label: '岩棚から崖上へ',
      kind: 'behavioral',
      pre: [
        { type: 'at', of: '$actor', place: 'ledge' },
        { type: 'capability', of: '$actor', id: 'climb', min: 2 },
      ],
      effects: [{ type: 'moveTo', of: '$actor', to: 'cliff-top' }],
      cost: { stamina: 3 },
    },
    {
      id: 'hook:rope',
      label: '鉤縄を岩の突起に掛ける',
      kind: 'behavioral',
      target: 'anchor',
      pre: [
        { type: 'at', of: '$actor', place: 'cliff-bottom' },
        { type: 'holds', of: '$actor', item: 'rope' },
        { type: 'state', of: 'rope', is: 'coiled' },
        { type: 'state', of: 'anchor', is: 'solid' },
      ],
      effects: [
        { type: 'moveTo', of: 'rope', to: 'cliff-bottom' }, // 崖下に垂れ下がる
        { type: 'setState', of: 'rope', state: 'hooked' },
      ],
      cost: { stamina: 1 },
    },
    {
      id: 'climb:rope',
      label: '鉤縄を登る',
      kind: 'behavioral',
      target: 'rope',
      pre: [
        { type: 'at', of: '$actor', place: 'cliff-bottom' },
        { type: 'at', of: 'rope', place: 'cliff-bottom' },
        { type: 'state', of: 'rope', is: 'hooked' },
        { type: 'capability', of: '$actor', id: 'climb', min: 1 },
      ],
      effects: [{ type: 'moveTo', of: '$actor', to: 'cliff-top' }],
      cost: { stamina: 1 },
    },
    {
      id: 'cast:levitate',
      label: '浮遊の魔法で崖上へ',
      kind: 'behavioral',
      pre: [
        { type: 'at', of: '$actor', place: 'cliff-bottom' },
        { type: 'capability', of: '$actor', id: 'levitate', min: 1 },
      ],
      effects: [{ type: 'moveTo', of: '$actor', to: 'cliff-top' }],
      cost: { mana: 4 },
    },
    // #region jump-action
    {
      id: 'jump:ledge',
      label: '岩棚へ跳び上がる',
      kind: 'behavioral',
      pre: [
        { type: 'at', of: '$actor', place: 'cliff-bottom' },
        { type: 'capability', of: '$actor', id: 'jump', min: 2 },
      ],
      effects: [{ type: 'moveTo', of: '$actor', to: 'ledge' }],
      cost: { stamina: 2 },
    },
    // #endregion
  ],
} satisfies Catalog;

// ===== 世界の初期状態（セーブデータの本体：実行中に変わる） =====
const places: Place[] = [
  { id: 'cliff-bottom', kind: 'place', name: '崖下', state: 'default', params: {}, location: null },
  { id: 'ledge', kind: 'place', name: '岩棚', state: 'default', params: {}, location: null },
  { id: 'cliff-top', kind: 'place', name: '崖上', state: 'default', params: {}, location: null },
];

const objects: WorldObject[] = [
  {
    id: 'cliff',
    kind: 'object',
    name: '崖',
    state: 'standing',
    states: ['standing'],
    params: {},
    location: 'cliff-bottom',
    objectClass: 'static',
    significance: { play: 3, story: 1 },
  },
  {
    id: 'vine',
    kind: 'object',
    name: '蔦',
    state: 'intact',
    states: ['intact', 'torn'],
    params: { strength: 2 },
    location: 'cliff-bottom',
    transitions: [
      { from: 'intact', to: 'torn', when: [{ type: 'param', of: '$self', key: 'strength', op: '<=', value: 0 }] },
    ],
    objectClass: 'controlled',
    significance: { play: 2, story: 0 },
  },
  {
    id: 'anchor',
    kind: 'object',
    name: '岩の突起',
    state: 'solid',
    states: ['solid', 'crumbled'],
    params: {},
    location: 'cliff-top',
    objectClass: 'static',
    significance: { play: 1, story: 0 },
  },
  {
    id: 'rope',
    kind: 'object',
    name: '鉤縄',
    state: 'coiled',
    states: ['coiled', 'hooked'],
    params: {},
    location: 'bord', // ボルドが持っている
    portable: true,
    objectClass: 'free',
    significance: { play: 2, story: 0 },
  },
];

const agents: Agent[] = [
  {
    id: 'aria',
    kind: 'agent',
    name: 'アリア',
    state: 'alive',
    params: { stamina: 20 },
    location: 'cliff-bottom',
    capabilities: { climb: 3 },
  },
  {
    id: 'bord',
    kind: 'agent',
    name: 'ボルド',
    state: 'alive',
    params: { stamina: 20 },
    location: 'cliff-bottom',
    capabilities: { climb: 1 },
  },
  {
    id: 'sena',
    kind: 'agent',
    name: 'セナ',
    state: 'alive',
    params: { stamina: 20, mana: 6 },
    location: 'cliff-bottom',
    capabilities: { levitate: 1 },
  },
];

/** 環境のパターン。 */
export type CliffEnv = 'normal' | 'storm' | 'crumbled';

export const envLabels: Record<CliffEnv, string> = {
  normal: '通常',
  storm: '嵐で蔦が切れた',
  crumbled: '岩の突起が崩れた',
};

/** 環境のパターンに応じた初期世界を作る。毎回新しいオブジェクトを返す。 */
export function cliffWorld(env: CliffEnv = 'normal'): WorldState {
  const entities: Record<string, Entity> = {};
  for (const e of [...places, ...objects, ...agents]) entities[e.id] = structuredClone(e);
  const world: WorldState = { t: 0, entities };
  if (env === 'storm') {
    const vine = world.entities.vine;
    if (vine) {
      vine.state = 'torn';
      vine.params.strength = 0;
    }
  }
  if (env === 'crumbled') {
    const anchor = world.entities.anchor;
    if (anchor) anchor.state = 'crumbled';
  }
  return world;
}

// ===== 叙述用のデータ =====
/** 状態名の表示名。 */
export const stateLabels: Record<string, string> = {
  intact: '無傷',
  torn: '切れた',
  coiled: '巻かれている',
  hooked: '掛かっている',
  solid: 'しっかりしている',
  crumbled: '崩れた',
};

/** 行為の述部（「〇〇は」に続く文）。 */
export const actionPhrases: Record<string, string> = {
  'climb:direct': '岩肌に指を掛け、崖を直接よじ登った',
  'climb:vine': '蔦をつたって岩棚へ登った',
  'climb:ledge': '岩棚から崖上へ這い上がった',
  'hook:rope': '鉤縄を投げ、岩の突起に掛けた',
  'climb:rope': '鉤縄を登り、崖上に着いた',
  'cast:levitate': '浮遊の魔法を唱え、ふわりと崖上へ昇った',
  'jump:ledge': '助走をつけて、岩棚へ跳び上がった',
};
