// インライン記法の純粋トークナイザ（単一の真実源）。
// App.tsx（React描画）と scripts/validate-data.js（生タグ露出スモーク）が共用し、
// 描画と検証で同じ規則を使うことで「タグ丸出し」の再発を防ぐ。
//
// 対応するインライン記法：
//   **強調**
//   [表示テキスト](/tide-guide/PATH/)   内部・外部リンク
// ブロック記法（{{figure:KEY}}・表・コールアウト・見出し）は App/prerender 側で処理する。
//
// 【重要】正規表現は必ず関数内でローカルに生成する。
//   グローバルフラグ付き正規表現をモジュール定数で共有すると、
//   再帰呼び出しのあいだで lastIndex が壊れ、無限ループ／取りこぼしを起こす。

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineToken[] }
  | { type: 'link'; href: string; children: InlineToken[] };

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /\*\*([\s\S]+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      tokens.push({ type: 'bold', children: tokenizeInline(m[1]) });
    } else {
      tokens.push({ type: 'link', href: m[3], children: tokenizeInline(m[2]) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

export function scanContentForRawTags(content: string): string[] {
  const problems: string[] = [];
  const stripped = content.replace(/\{\{figure:[a-z0-9-]+\}\}/g, '');
  const leftover = stripped.match(/\{\{[^}]*\}\}?/g);
  if (leftover) problems.push(...leftover.map((s) => `未対応タグ: ${s}`));
  const stars = (stripped.match(/\*\*/g) || []).length;
  if (stars % 2 !== 0) problems.push('強調マーカー ** の数が奇数（閉じ忘れの可能性）');
  const danglingLink = stripped.match(/\[[^\]]+\](?!\()/g);
  if (danglingLink) problems.push(...danglingLink.map((s) => `閉じていないリンク表記: ${s}`));
  return problems;
}
