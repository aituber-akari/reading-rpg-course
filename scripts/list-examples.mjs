#!/usr/bin/env node
// examples/chXX/{starter,solution} のうち package.json を持つものを列挙する。
// 使い方：
//   node scripts/list-examples.mjs            # JSON 配列（CI の matrix 用）
//   node scripts/list-examples.mjs --lines    # 1行に1つ
// examples/ が無い・空のときは [] を出力する（エラーにしない）。
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const VARIANTS = ['starter', 'solution'];

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** 章ディレクトリ名（ch00, ch01, ...）を昇順で返す。 */
export function listChapters(root = ROOT) {
  const examples = join(root, 'examples');
  if (!isDir(examples)) return [];
  return readdirSync(examples)
    .filter((name) => /^ch\d{2}$/.test(name) && isDir(join(examples, name)))
    .sort();
}

/**
 * package.json を持つプロジェクトを、リポジトリルートからの相対パス（/ 区切り）で返す。
 * 例：['examples/ch00/solution', 'examples/ch00/starter', ...]
 */
export function listExamples(root = ROOT) {
  const result = [];
  for (const ch of listChapters(root)) {
    for (const v of VARIANTS) {
      const rel = `examples/${ch}/${v}`;
      if (existsSync(join(root, rel, 'package.json'))) result.push(rel);
    }
  }
  return result;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dirs = listExamples();
  if (process.argv.includes('--lines')) {
    for (const d of dirs) console.log(d);
  } else {
    console.log(JSON.stringify(dirs));
  }
}
