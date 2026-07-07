// src/data/articles.ts を検証する。
// 1) 必須記事ID・重複・空フィールド・TOC↔h2件数一致
// 2) レンダースモーク：bold/link を擬似展開し、未展開の {{ … }} や **bold** の生タグ露出を検出
// 3) {{figure:KEY}} が行単独で、かつ figures-data.ts に定義済みキーであること
// 4) 内部リンク [/tide-guide/PATH/] の PATH が実在する記事ID（または about/privacy）であること
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesPath = path.join(__dirname, '..', 'src', 'data', 'articles.ts');
const figuresPath = path.join(__dirname, '..', 'src', 'figures-data.ts');

if (!fs.existsSync(articlesPath)) {
  console.error('Error: src/data/articles.ts not found');
  process.exit(1);
}

const src = fs.readFileSync(articlesPath, 'utf-8').replace(/\r/g, '');

const blocks = [];
const blockRe = /\{\s*id:\s*'([^']+)'[\s\S]*?\n  \},\n/g;
let m;
while ((m = blockRe.exec(src)) !== null) {
  blocks.push({ id: m[1], block: m[0] });
}

const expected = ['mechanism', 'spring-neap', 'tide-cycle', 'regional', 'datum', 'hazard', 'life', 'faq'];
const ids = blocks.map((b) => b.id);

const missing = expected.filter((e) => !ids.includes(e));
if (missing.length) {
  console.error(`Error: missing required article ids: ${missing.join(', ')}`);
  process.exit(1);
}
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error(`Error: duplicate article ids: ${dupes.join(', ')}`);
  process.exit(1);
}

const figSrc = fs.existsSync(figuresPath) ? fs.readFileSync(figuresPath, 'utf-8') : '';
const definedFigures = new Set([...figSrc.matchAll(/'([a-z0-9-]+)':\s*\{\s*\n\s*caption:/g)].map((x) => x[1]));

const errors = [];

function renderSmoke(text) {
  let remaining = text;
  let out = '';
  const patterns = [
    /\[([^\]]+)\]\(([^)]+)\)/,
    /\*\*([\s\S]+?)\*\*/,
  ];
  while (remaining.length > 0) {
    let earliest = null;
    for (let i = 0; i < patterns.length; i++) {
      const mm = patterns[i].exec(remaining);
      if (mm && (earliest === null || mm.index < earliest.idx)) {
        earliest = { idx: mm.index, len: mm[0].length, inner: mm[1] };
      }
    }
    if (!earliest) { out += remaining; break; }
    out += remaining.slice(0, earliest.idx);
    out += renderSmoke(earliest.inner);
    remaining = remaining.slice(earliest.idx + earliest.len);
  }
  return out;
}

for (const { id, block } of blocks) {
  const leadMatch = block.match(/lead:\s*'([\s\S]*?)',\s*\n/);
  const contentMatch = block.match(/content:\s*`([\s\S]*?)`,\s*\n\s*updatedAt/);
  const tocMatch = block.match(/toc:\s*\[([\s\S]*?)\],\s*\n\s*content:/);

  if (!contentMatch) { errors.push(`[${id}] content フィールドを抽出できない`); continue; }
  const content = contentMatch[1];

  if (/toc:\s*\[\s*\]/.test(block)) errors.push(`[${id}] toc が空`);
  if (content.length < 1000) errors.push(`[${id}] content が短すぎる（${content.length}字・最低1000）`);

  if (tocMatch) {
    const tocItems = [...tocMatch[1].matchAll(/'([^']+)'/g)].length;
    const h2Items = (content.match(/^## /gm) || []).length;
    if (tocItems !== h2Items) errors.push(`[${id}] TOC ${tocItems}件 と h2 ${h2Items}件 が不一致`);
  }

  for (const t of [leadMatch && { f: 'lead', text: leadMatch[1] }, { f: 'content', text: content }].filter(Boolean)) {
    const rendered = renderSmoke(t.text);
    if (/\{\{(?!figure:)/.test(rendered)) errors.push(`[${id}] ${t.f} に未対応タグ {{…}} が残存`);
    if (/\*\*[^*\n]+\*\*/.test(rendered)) errors.push(`[${id}] ${t.f} に未展開の **bold** が残存`);
    for (const f of [...t.text.matchAll(/\{\{figure:([a-z0-9-]+)\}\}/g)]) {
      const lineOk = t.text.split('\n').some((ln) => ln.trim() === f[0]);
      if (!lineOk) errors.push(`[${id}] ${t.f} の {{figure:${f[1]}}} が行単独でない（生タグ露出の恐れ）`);
      if (!definedFigures.has(f[1])) errors.push(`[${id}] ${t.f} の figure キー "${f[1]}" が figures-data.ts に未定義`);
    }
  }

  for (const lk of [...content.matchAll(/\]\(\/tide-guide\/([a-z0-9-]+)\//g)]) {
    const target = lk[1];
    if (!ids.includes(target) && target !== 'about' && target !== 'privacy') {
      errors.push(`[${id}] 内部リンクの宛先 /${target}/ が存在しない`);
    }
  }
}

if (errors.length) {
  console.error('Validation errors:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log(`✓ validate-data: ${ids.length} articles (${ids.join(', ')}) + figure/link/render-smoke OK`);
