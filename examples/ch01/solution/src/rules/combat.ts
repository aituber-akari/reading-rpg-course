import type { Agent, BattleAction, Change, WorldEvent, WorldState } from '../domain/types';
import type { Rng } from '../lib/rng';

// 戦闘の規則。第1章では手続き的なコード（if・switch）で書く。
// 第5章で、宣言的な行為定義（ActionDef）に移す。

// #region damageOf
/** 攻撃のダメージ。揺らぎのために乱数を1回消費する。 */
export function damageOf(att: Agent, def: Agent, defending: boolean, rng: Rng): number {
  const base = Math.max(1, att.params.atk - def.params.def + rng.int(-1, 1));
  return defending ? Math.max(1, Math.floor(base / 2)) : base;
}
// #endregion

// #region fleeChance
/** 逃走の成功確率。0.1〜0.9 の範囲に収める。 */
export function fleeChance(self: Agent, enemy: Agent): number {
  const p = 0.5 + 0.1 * (self.params.agi - enemy.params.agi);
  return Math.min(0.9, Math.max(0.1, p));
}
// #endregion

function agentOf(world: WorldState, id: string): Agent {
  const a = world.entities[id];
  if (a === undefined) throw new Error(`人物が見つからない: ${id}`);
  return a;
}

// #region resolveRound
/**
 * 1ラウンドを解決する。
 * 1. 両者の行動はすでに宣言されている（引数で受け取る）。
 * 2. 防御はラウンドの最初から有効になる。防御のイベントを最初に出す。
 * 3. 攻撃と逃走を agi の高い順に解決する（同じなら主人公が先）。
 * 引数の world は書き換えず、新しい世界状態を返す。
 */
export function resolveRound(
  world: WorldState,
  heroId: string,
  heroAction: BattleAction,
  enemyId: string,
  enemyAction: BattleAction,
  rng: Rng,
): { world: WorldState; events: WorldEvent[]; ended: boolean } {
  const w: WorldState = structuredClone(world);
  const events: WorldEvent[] = [];
  const declared: Record<string, BattleAction> = { [heroId]: heroAction, [enemyId]: enemyAction };
  const opponent: Record<string, string> = { [heroId]: enemyId, [enemyId]: heroId };

  const hero = agentOf(w, heroId);
  const enemy = agentOf(w, enemyId);
  const order = hero.params.agi >= enemy.params.agi ? [heroId, enemyId] : [enemyId, heroId];

  // 防御を宣言した側は、ラウンドの最初から身を守る（乱数は消費しない）。
  for (const id of order) {
    if (declared[id] === 'defend') {
      w.t += 1;
      events.push({ t: w.t, type: 'action', actor: id, action: 'defend' });
    }
  }

  for (const id of order) {
    const action = declared[id];
    const self = agentOf(w, id);
    const other = agentOf(w, opponent[id] ?? '');
    if (self.state === 'down' || action === 'defend') continue;

    w.t += 1;
    if (action === 'attack') {
      const dmg = damageOf(self, other, declared[other.id] === 'defend', rng);
      const change: Change = {
        entity: other.id,
        field: 'param',
        key: 'hp',
        before: other.params.hp,
        after: Math.max(0, other.params.hp - dmg),
      };
      other.params.hp = change.after;
      events.push({ t: w.t, type: 'action', actor: id, action: 'attack', target: other.id, changes: [change] });
      if (other.params.hp <= 0) {
        other.state = 'down';
        events.push({ t: w.t, type: 'defeated', actor: other.id });
        const outcome = other.id === enemyId ? 'victory' : 'defeat';
        events.push({ t: w.t, type: 'battleEnd', actor: heroId, target: enemyId, outcome });
        return { world: w, events, ended: true };
      }
    } else {
      const success = rng.next() < fleeChance(self, other);
      events.push({
        t: w.t,
        type: 'action',
        actor: id,
        action: 'flee',
        target: other.id,
        outcome: success ? 'success' : 'failure',
      });
      if (success) {
        events.push({ t: w.t, type: 'battleEnd', actor: heroId, target: enemyId, outcome: 'fled' });
        return { world: w, events, ended: true };
      }
    }
  }
  return { world: w, events, ended: false };
}
// #endregion
