#!/usr/bin/env node
// 教材HTMLのコード片と出力例を、完成版コードと README から同期する（architecture.md 8章）。
// 目印の書き方は docs/design/snippets.md を参照。
//   node scripts/sync-snippets.mjs           # HTML を書き換える
//   node scripts/sync-snippets.mjs --check   # 差分があれば一覧を出して終了コード1（書き換えない）
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './list-examples.mjs';
import { normalizeNewlines, resolveOutput, resolveSnippet } from './snippet-lib.mjs';

const CHECK = process.argv.includes('--check');
const TARGETS = ['index.html', 'parts', 'chapters', 'references'];

function htmlFiles(p) {
  if (!existsSync(p)) return [];
  if (statSync(p).isFile()) return p.endsWith('.html') ? [p] : [];
  return readdirSync(p).flatMap((name) => htmlFiles(join(p, name)));
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// <!-- snippet:参照 --> 本文 <!-- /snippet -->、<!-- output:参照 --> 本文 <!-- /output -->
const BLOCK_RE = /(<!--\s*(snippet|output):([^\s>]+)\s*-->)([\s\S]*?)(<!--\s*\/\2\s*-->)/g;

/** 目印の間にある最初の <pre> の中身（<pre><code> なら <code> の中身）を置き換える。 */
function replaceInner(body, text) {
  const pre = /(<pre\b[^>]*>)([\s\S]*?)(<\/pre>)/.exec(body);
  if (!pre) return null;
  const inner = pre[2];
  const code = /^(\s*<code\b[^>]*>)([\s\S]*?)(<\/code>\s*)$/.exec(inner);
  const newInner = code ? code[1] + escapeHtml(text) + code[3] : escapeHtml(text);
  return body.slice(0, pre.index) + pre[1] + newInner + pre[3] + body.slice(pre.index + pre[0].length);
}

const errors = [];
const diffs = [];
let blocks = 0;
const changedFiles = [];

for (const file of TARGETS.flatMap((t) => htmlFiles(join(ROOT, t)))) {
  const rel = relative(ROOT, file);
  // 名前が「_」で始まるファイルは雛形なので対象外
  if (rel.split('/').some((seg) => seg.startsWith('_'))) continue;
  const original = readFileSync(file, 'utf8');
  const src = normalizeNewlines(original);
  const updated = src.replace(BLOCK_RE, (whole, open, kind, ref, body, close, offset) => {
    blocks++;
    const line = src.slice(0, offset).split('\n').length;
    const where = `${rel}:${line} ${kind}:${ref}`;
    const r = kind === 'snippet' ? resolveSnippet(ROOT, ref) : resolveOutput(ROOT, ref);
    if (r.error) {
      errors.push(`${where}: ${r.error}`);
      return whole;
    }
    const newBody = replaceInner(body, r.text);
    if (newBody === null) {
      errors.push(`${where}: 目印の間に <pre> がありません`);
      return whole;
    }
    if (newBody !== body) diffs.push({ where, body, newBody });
    return open + newBody + close;
  });
  if (updated !== src) {
    changedFiles.push(rel);
    if (!CHECK) writeFileSync(file, original.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated);
  }
}

function firstDiff(a, b) {
  const al = a.split('\n');
  const bl = b.split('\n');
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) return `    目印内 ${i + 1} 行目\n    - HTML  : ${al[i] ?? '(なし)'}\n    + 完成版: ${bl[i] ?? '(なし)'}`;
  }
  return '';
}

for (const e of errors) console.error(`エラー: ${e}`);
if (CHECK) {
  for (const d of diffs) console.error(`差分: ${d.where}\n${firstDiff(d.body, d.newBody)}`);
  console.log(`check:snippets: 目印 ${blocks} 件 / 差分 ${diffs.length} 件 / エラー ${errors.length} 件`);
  if (diffs.length > 0) console.log('npm run sync:snippets で同期できます。');
  process.exit(errors.length + diffs.length > 0 ? 1 : 0);
} else {
  console.log(`sync:snippets: 目印 ${blocks} 件 / 更新 ${diffs.length} 件（${changedFiles.join(', ') || 'なし'}）/ エラー ${errors.length} 件`);
  process.exit(errors.length > 0 ? 1 : 0);
}
