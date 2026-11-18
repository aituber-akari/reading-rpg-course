import type { Agent, BattleAction, Change, EntityId, WorldEvent, WorldState } from '../domain/types';
import { getAgent } from '../domain/entities';
import type { Rng } from '../lib/rng';
import { param } from './params';

// 戦闘の規則。第1章では手続き的なコード（if・switch）で書く。
// 第5章で、宣言的な行為定義（ActionDef）に移す。
// 第2章で Params が Record<string, number> になったので、パラメータは param() で読む。

// #region damageOf
/** 攻撃のダメージ。揺らぎのために乱数を1回消費する。 */
export function damageOf(att: Agent, def: Agent, defending: boolean, rng: Rng): number {
  const base = Math.max(1, param(att, 'atk') - param(def, 'def') + rng.int(-1, 1));
  return defending ? Math.max(1, Math.floor(base / 2)) : base;
}
// #endregion

// #region fleeChance
/** 逃走の成功確率。0.1〜0.9 の範囲に収める。 */
export function fleeChance(self: Agent, enemy: Agent): number {
  const p = 0.5 + 0.1 * (param(self, 'agi') - param(enemy, 'agi'));
  return Math.min(0.9, Math.max(0.1, p));
}
// #endregion

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
  heroId: EntityId,
  heroAction: BattleAction,
  enemyId: EntityId,
  enemyAction: BattleAction,
  rng: Rng,
): { world: WorldState; events: WorldEvent[]; ended: boolean } {
  const w: WorldState = structuredClone(world);
  const events: WorldEvent[] = [];
  const declared: Record<EntityId, BattleAction> = { [heroId]: heroAction, [enemyId]: enemyAction };
  const opponent: Record<EntityId, EntityId> = { [heroId]: enemyId, [enemyId]: heroId };

  const hero = getAgent(w, heroId);
  const enemy = getAgent(w, enemyId);
  const order = param(hero, 'agi') >= param(enemy, 'agi') ? [heroId, enemyId] : [enemyId, heroId];

  // 防御を宣言した側は、ラウンドの最初から身を守る（乱数は消費しない）。
  for (const id of order) {
    if (declared[id] === 'defend') {
      w.t += 1;
      events.push({ t: w.t, type: 'action', actor: id, action: 'defend' });
    }
  }

  for (const id of order) {
    const action = declared[id];
    const self = getAgent(w, id);
    const other = getAgent(w, opponent[id] ?? '');
    if (self.state === 'down' || action === 'defend') continue;

    w.t += 1;
    if (action === 'attack') {
      const dmg = damageOf(self, other, declared[other.id] === 'defend', rng);
      const before = param(other, 'hp');
      const after = Math.max(0, before - dmg);
      const change: Change = { entity: other.id, field: 'param', key: 'hp', before, after, via: 'effect' };
      other.params.hp = after;
      events.push({ t: w.t, type: 'action', actor: id, action: 'attack', target: other.id, changes: [change] });
      if (after <= 0) {
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
