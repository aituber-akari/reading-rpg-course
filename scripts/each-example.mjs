#!/usr/bin/env node
// 全プロジェクト（examples/chXX/{starter,solution}）で、同じコマンドを順に実行する。
// 使い方：
//   node scripts/each-example.mjs "npm ci" "npm run check"
//   node scripts/each-example.mjs --filter ch02 "npm test"
// 1つのプロジェクトでコマンドが失敗したら、そのプロジェクトの残りのコマンドは飛ばし、
// 次のプロジェクトへ進む。最後に一覧を表示し、1つでも失敗があれば終了コード1で終わる。
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, listExamples } from './list-examples.mjs';

const args = process.argv.slice(2);
let filter = null;
const commands = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--filter') filter = args[++i] ?? null;
  else commands.push(args[i]);
}

if (commands.length === 0) {
  console.error('使い方: node scripts/each-example.mjs [--filter 文字列] "コマンド1" ["コマンド2" ...]');
  process.exit(2);
}

const dirs = listExamples().filter((d) => !filter || d.includes(filter));
if (dirs.length === 0) {
  console.log('対象のプロジェクトがありません（examples/chXX/{starter,solution}/package.json が見つかりません）。');
  process.exit(0);
}

const results = [];
for (const dir of dirs) {
  let ok = true;
  for (const cmd of commands) {
    console.log(`\n━━ ${dir} $ ${cmd}`);
    const r = spawnSync(cmd, { cwd: join(ROOT, dir), stdio: 'inherit', shell: true });
    if (r.status !== 0) {
      ok = false;
      results.push({ dir, cmd, ok });
      break;
    }
  }
  if (ok) results.push({ dir, cmd: commands.join(' → '), ok });
}

console.log('\n━━ 結果');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.dir}${r.ok ? '' : `（失敗: ${r.cmd}）`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} 成功`);
process.exit(failed > 0 ? 1 : 0);
