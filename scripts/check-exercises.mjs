#!/usr/bin/env node
// 演習用テスト（tests/exercises/ 以下）が、各章の starter と solution で同一であることを確かめる。
// architecture.md 3.2節：starter/tests/exercises は solution と同一の内容にする。
// - 片方にしかないファイル、内容が異なるファイルはエラー
// - starter / solution の片方が無い章、演習用テストが無い章は警告だけ出す
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, listChapters } from './list-examples.mjs';

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// 改行コードの違い（CRLF/LF）は同一とみなす
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const errors = [];
const warnings = [];
let checked = 0;

for (const ch of listChapters()) {
  const starter = join(ROOT, 'examples', ch, 'starter');
  const solution = join(ROOT, 'examples', ch, 'solution');
  if (!existsSync(join(starter, 'package.json')) || !existsSync(join(solution, 'package.json'))) {
    warnings.push(`${ch}: starter と solution の両方がそろっていないため飛ばしました`);
    continue;
  }
  const sDir = join(starter, 'tests', 'exercises');
  const oDir = join(solution, 'tests', 'exercises');
  const sFiles = walk(sDir).map((p) => relative(sDir, p)).sort();
  const oFiles = walk(oDir).map((p) => relative(oDir, p)).sort();
  if (sFiles.length === 0 && oFiles.length === 0) {
    warnings.push(`${ch}: tests/exercises/ に演習用テストがありません`);
    continue;
  }
  for (const f of new Set([...sFiles, ...oFiles])) {
    const inS = sFiles.includes(f);
    const inO = oFiles.includes(f);
    if (!inS) errors.push(`${ch}: solution/tests/exercises/${f} が starter にありません`);
    else if (!inO) errors.push(`${ch}: starter/tests/exercises/${f} が solution にありません`);
    else if (read(join(sDir, f)) !== read(join(oDir, f))) errors.push(`${ch}: tests/exercises/${f} の内容が starter と solution で異なります`);
    else checked++;
  }
}

for (const w of warnings) console.warn(`警告: ${w}`);
for (const e of errors) console.error(`エラー: ${e}`);
console.log(`check:exercises: 一致 ${checked} ファイル / エラー ${errors.length} 件 / 警告 ${warnings.length} 件`);
process.exit(errors.length > 0 ? 1 : 0);
