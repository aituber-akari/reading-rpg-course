#!/usr/bin/env node
// 公開用の _site/ を組み立てる（architecture.md 7.3節）。
// index.html・parts/・chapters/・assets/・references/ をコピーする。
// examples/ と docs/ は公開しない。名前が「_」で始まるファイル（雛形など）と .DS_Store は除く。
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ROOT } from './list-examples.mjs';

const OUT = join(ROOT, '_site');
const ENTRIES = ['index.html', 'parts', 'chapters', 'assets', 'references'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const filter = (src) => {
  const name = basename(src);
  return name !== '.DS_Store' && !name.startsWith('_');
};

const copied = [];
for (const entry of ENTRIES) {
  const src = join(ROOT, entry);
  if (!existsSync(src)) {
    console.warn(`警告: ${entry} がないため飛ばしました`);
    continue;
  }
  cpSync(src, join(OUT, entry), { recursive: true, filter });
  copied.push(entry);
}
// GitHub Pages で「_」始まりのファイルなどを Jekyll に処理させない
writeFileSync(join(OUT, '.nojekyll'), '');

if (!existsSync(join(OUT, 'index.html'))) {
  console.error('エラー: index.html がありません。公開サイトの入口が必要です。');
  process.exit(1);
}

function count(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? count(p) : 1;
  }
  return n;
}
console.log(`build:site: _site/ に ${copied.join(', ')} をコピーしました（${count(OUT)} ファイル）`);
