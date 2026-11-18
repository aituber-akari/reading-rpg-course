import type { ActionDef, Agent, Catalog, Entity, Goal, Place, WorldObject, WorldState } from '../domain/types';

// 第3章の作品データ：崖の谷。村から崖上を目指す。
// 崖まわりの行為は第2章と同じ。物置小屋で鉤縄を拾う行為（take:rope）を加える。

// ===== 場所と道 =====
interface PlaceSpec {
  id: string;
  name: string;
  x: number;
  y: number;
}

const placeSpecs: PlaceSpec[] = [
  { id: 'village', name: '村', x: 0, y: -2 },
  { id: 'fork', name: '分かれ道', x: 0, y: -1 },
  { id: 'cliff-bottom', name: '崖下', x: 0, y: 0 },
  { id: 'ledge', name: '岩棚', x: 0, y: 0 },
  { id: 'cliff-top', name: '崖上', x: 0, y: 0 },
  { id: 'shed', name: '物置小屋', x: 1, y: 0 },
  // 崖から遠ざかる「寄り道」。探索法による探索量の違いを見せるために置く。
  { id: 'wheat-field', name: '麦畑', x: -1, y: -2 },
  { id: 'windmill', name: '風車小屋', x: -2, y: -2 },
  { id: 'old-well', name: '古井戸', x: -3, y: -2 },
  { id: 'stone-bridge', name: '石橋', x: 0, y: -3 },
  { id: 'inn-ruins', name: '宿場跡', x: 0, y: -4 },
  { id: 'checkpoint', name: '関所跡', x: 0, y: -5 },
  { id: 'riverside', name: '川辺', x: 1, y: -2 },
  { id: 'ferry', name: '渡し場', x: 2, y: -2 },
  { id: 'reed-marsh', name: '葦原', x: 3, y: -2 },
];

/** 道（双方向、どれも体力1）。 */
const paths: [string, string][] = [
  ['village', 'fork'],
  ['fork', 'cliff-bottom'],
  ['cliff-bottom', 'shed'],
  ['village', 'wheat-field'],
  ['wheat-field', 'windmill'],
  ['windmill', 'old-well'],
  ['village', 'stone-bridge'],
  ['stone-bridge', 'inn-ruins'],
  ['inn-ruins', 'checkpoint'],
  ['village', 'riverside'],
  ['riverside', 'ferry'],
  ['ferry', 'reed-marsh'],
];

const places: Place[] = placeSpecs.map((p) => ({
  id: p.id,
  kind: 'place',
  name: p.name,
  state: 'default',
  params: { x: p.x, y: p.y },
  location: null,
}));

function nameOf(id: string): string {
  return placeSpecs.find((p) => p.id === id)?.name ?? id;
}

// #region walkActions
/** 道から「歩く」行為を生成する（双方向）。第9章で Place.exits に移す。 */
export function walkActions(placeList: Place[], pathList: [string, string][]): ActionDef[] {
  const label = (id: string): string => placeList.find((p) => p.id === id)?.name ?? id;
  const actions: ActionDef[] = [];
  for (const [a, b] of pathList) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      actions.push({
        id: `walk:${from}->${to}`,
        label: `${label(from)}から${label(to)}へ歩く`,
        kind: 'behavioral',
        pre: [{ type: 'at', of: '$actor', place: from }],
        effects: [{ type: 'moveTo', of: '$actor', to }],
        cost: { stamina: 1 },
      });
    }
  }
  return actions;
}
// #endregion

// ===== 崖まわりの行為 =====
const cliffActions: ActionDef[] = [
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
    // 物を対象にしない。崖を対象にすると、蔦の経路の識別子が直接登る経路の識別子を含んでしまうため。
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
    id: 'take:rope',
    label: '鉤縄を拾う',
    kind: 'behavioral',
    target: 'rope',
    pre: [
      { type: 'at', of: '$actor', place: 'shed' },
      { type: 'at', of: 'rope', place: 'shed' },
    ],
    effects: [{ type: 'moveTo', of: 'rope', to: '$actor' }],
    cost: { stamina: 1 },
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
      { type: 'moveTo', of: 'rope', to: 'cliff-bottom' },
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
  // TODO（演習1）：行為 'cast:levitate'（浮遊の魔法で崖上へ）を追加する。
  //   前提条件：崖下にいる、浮遊Lv1以上　効果：行為者→崖上　コスト：魔力4
];

export const cliffValleyCatalog: Catalog = {
  version: 'cliff-valley@0.1',
  capabilities: [
    { id: 'climb', label: '登攀', kind: 'behavioral' },
    // TODO（演習1）：「浮遊」の能力（id: 'levitate'）を追加する。
  ],
  actions: [...cliffActions, ...walkActions(places, paths)],
};

// ===== 物と人物 =====
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
    significance: { play: 1, story: 0 }, // 設計上は「ただの岩」。鉤縄と組み合わさると経路の要になる
  },
  {
    id: 'rope',
    kind: 'object',
    name: '鉤縄',
    state: 'coiled',
    states: ['coiled', 'hooked'],
    params: {},
    location: 'shed', // 物置小屋にある
    portable: true,
    objectClass: 'free',
    significance: { play: 2, story: 0 },
  },
];

/** アリアの設定。CLI の --climb、--stamina で変えられる。 */
export interface AriaSetup {
  climb?: number;
  stamina?: number;
  levitate?: number;
  mana?: number;
}

/** 崖の谷の初期世界を作る。アリアは村にいる。毎回新しいオブジェクトを返す。 */
export function cliffValleyWorld(setup: AriaSetup = {}): WorldState {
  const capabilities: Record<string, number> = { climb: setup.climb ?? 3 };
  if (setup.levitate !== undefined) capabilities.levitate = setup.levitate;
  const params: Record<string, number> = { stamina: setup.stamina ?? 20 };
  if (setup.mana !== undefined) params.mana = setup.mana;
  const aria: Agent = {
    id: 'aria',
    kind: 'agent',
    name: 'アリア',
    state: 'alive',
    params,
    location: 'village',
    capabilities,
  };
  const entities: Record<string, Entity> = {};
  for (const e of [...places, ...objects, aria]) entities[e.id] = structuredClone(e);
  return { t: 0, entities };
}

/** 目標：アリアが崖上に着く。 */
export const reachTop: Goal = {
  id: 'reach-top',
  label: '崖上に着く',
  conditions: [{ type: 'at', of: 'aria', place: 'cliff-top' }],
};

// ===== 叙述用のデータ =====
export const valleyStateLabels: Record<string, string> = {
  intact: '無傷',
  torn: '切れた',
  coiled: '巻かれている',
  hooked: '掛かっている',
  solid: 'しっかりしている',
  crumbled: '崩れた',
};

export const valleyPhrases: Record<string, string> = {
  'climb:direct': '岩肌に指を掛け、崖を直接よじ登った',
  'climb:vine': '蔦をつたって岩棚へ登った',
  'climb:ledge': '岩棚から崖上へ這い上がった',
  'take:rope': '物置小屋の壁から鉤縄を外し、肩に掛けた',
  'hook:rope': '鉤縄を投げ、岩の突起に掛けた',
  'climb:rope': '鉤縄を登り、崖上に着いた',
  'cast:levitate': '浮遊の魔法を唱え、ふわりと崖上へ昇った',
};
for (const [a, b] of paths) {
  valleyPhrases[`walk:${a}->${b}`] = `${nameOf(a)}から${nameOf(b)}へ歩いた`;
  valleyPhrases[`walk:${b}->${a}`] = `${nameOf(b)}から${nameOf(a)}へ歩いた`;
}
