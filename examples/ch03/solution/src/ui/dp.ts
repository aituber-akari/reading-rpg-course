import { budgets, obstacleCourse } from '../content/obstacleCourse';
import type { ActionId } from '../domain/types';
import { padDisplay } from '../narration/format';
import { type Allocation, allocate, greedyAllocate } from '../planner/allocate';

// 第3章の CLI の表示（--mode dp）。動的計画法と貪欲法で、資源の配分を比べる。

function labelOf(id: ActionId): string {
  for (const o of obstacleCourse) {
    const opt = o.options.find((x) => x.actionId === id);
    if (opt !== undefined) return opt.label;
  }
  return id;
}

function describe(a: Allocation | null): string {
  if (a === null) return '越えられない';
  return `${padDisplay(a.choices.map(labelOf).join('・'), 30)}時間${a.totalTime}`;
}

export function dpReport(): string[] {
  const lines = ['# seed: - / mode: dp', '', '== 山道の障害と越え方（体力, 魔力, 時間） =='];
  for (const o of obstacleCourse) {
    lines.push(`${padDisplay(o.label, 8)}: ${o.options.map((x) => `${x.label} (${x.stamina}, ${x.mana}, ${x.time})`).join(' / ')}`);
  }
  lines.push('', '== 予算ごとの配分（DP と貪欲法） ==');
  for (const b of budgets) {
    const dp = allocate(obstacleCourse, b);
    const greedy = greedyAllocate(obstacleCourse, b);
    const worse = dp !== null && greedy !== null && greedy.totalTime > dp.totalTime;
    lines.push(`予算（体力${b.stamina}, 魔力${b.mana}）`);
    lines.push(`  DP    : ${describe(dp)}${dp === null ? '' : `（部分問題${dp.states}個）`}`);
    lines.push(`  貪欲法: ${describe(greedy)}${worse ? '  ← 先に魔力を使い切り、後で遅い手しか残らない' : ''}`);
  }
  return lines;
}
