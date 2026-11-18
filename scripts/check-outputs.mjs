#!/usr/bin/env node
// README の「期待される出力」と、実際の npm start の出力が一致するかを確かめる（architecture.md 7.1節）。
// README の出力ブロックの書き方は docs/design/snippets.md を参照。
//   node scripts/check-outputs.mjs                          # 全プロジェクト（事前に各プロジェクトで npm ci が必要）
//   node scripts/check-outputs.mjs examples/ch02/solution   # 指定したプロジェクトだけ
// 出力ブロックのない README は飛ばす。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ROOT, listExamples } from './list-examples.mjs';
import { normalizeOutput, readReadmeOutputs } from './snippet-lib.mjs';

const argDirs = process.argv.slice(2);
const dirs = argDirs.length > 0 ? argDirs.map((d) => relative(ROOT, resolve(d))) : listExamples();

const errors = [];
let checked = 0;

for (const dir of dirs) {
  const blocks = readReadmeOutputs(join(ROOT, dir, 'README.md'));
  if (blocks.length === 0) continue;
  if (!existsSync(join(ROOT, dir, 'node_modules'))) {
    errors.push(`${dir}: node_modules がありません（先に npm ci を実行してください）`);
    continue;
  }
  for (const b of blocks) {
    const where = `${dir}/README.md:${b.line} output:${b.name}`;
    if (b.text === null) {
      errors.push(`${where}: \`\`\` で囲んだコードブロックがありません`);
      continue;
    }
    const r = spawnSync('npm', ['run', '--silent', 'start', '--', ...b.args], {
      cwd: join(ROOT, dir),
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    checked++;
    const cmd = `npm start${b.args.length ? ' -- ' + b.args.join(' ') : ''}`;
    if (r.status !== 0) {
      errors.push(`${where}: ${cmd} が終了コード ${r.status} で終わりました\n${(r.stderr ?? '').trim()}`);
      continue;
    }
    const expected = normalizeOutput(b.text);
    const actual = normalizeOutput(r.stdout ?? '');
    if (expected !== actual) {
      const el = expected.split('\n');
      const al = actual.split('\n');
      let i = 0;
      while (i < Math.max(el.length, al.length) && el[i] === al[i]) i++;
      errors.push(
        `${where}: ${cmd} の出力が README と異なります（${i + 1} 行目から）\n` +
          `    README: ${el[i] ?? '(なし)'}\n    実際  : ${al[i] ?? '(なし)'}\n` +
          `    （README ${el.length} 行 / 実際 ${al.length} 行）`,
      );
    } else {
      console.log(`✓ ${where}（${cmd}）`);
    }
  }
}

for (const e of errors) console.error(`✗ ${e}`);
console.log(`check:outputs: 実行 ${checked} 件 / 不一致・エラー ${errors.length} 件`);
process.exit(errors.length > 0 ? 1 : 0);
