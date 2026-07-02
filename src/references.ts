// 記事末の「参考にした情報源」。React版（App.tsx）と prerender が共用するSSOT。
// 出典は事実確認に用い、本文は自分の言葉で記述する（逐語転載しない）方針。

export type Reference = { label: string; publisher: string; url: string };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function referencesHtml(refs?: Reference[]): string {
  if (!refs || refs.length === 0) return '';
  const items = refs.map(r =>
    `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a>` +
    `<span class="ref-pub">${esc(r.publisher)}</span></li>`
  ).join('');
  return (
    `<aside class="references" aria-label="参考にした情報源">` +
    `<h2 class="references-h">参考にした情報源</h2>` +
    `<ul class="references-list">${items}</ul>` +
    `<p class="references-note">出典は事実確認のために参照したもので、本文は運営者が自分の言葉でまとめています。実際の潮位や満干の時刻は場所によって大きく異なるため、正確な値は気象庁や海上保安庁の潮汐表でご確認ください。</p>` +
    `</aside>`
  );
}
