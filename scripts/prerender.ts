import * as fs from 'fs';
import * as path from 'path';
import { articles } from '../src/data/articles.ts';
import type { Article } from '../src/data/articles.ts';
import { figureHtml, moonConfigSvg } from '../src/figures-data.ts';
import { referencesHtml } from '../src/references.ts';
import { sectionIconSvg } from '../src/section-icons.ts';
import { tokenizeInline } from '../src/lib/inline.ts';
import type { InlineToken } from '../src/lib/inline.ts';
import { tideToday, moonPhaseLabel, daysToNextOshio } from '../src/data/moon-now.ts';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const BASE_URL = 'https://study-apps.com/tide-guide';
const SITE_NAME = '潮の満ち引きガイド';
const UMI = '#147083';
const UMI_DEEP = '#0d4b58';
const TSUKI = '#b98f33';

const ico = (name: string, size: number, color = UMI) =>
  `<span style="color:${color};display:inline-flex;vertical-align:middle">${sectionIconSvg(name, size)}</span>`;

console.log('--- tide-guide SSG Pre-rendering ---');

if (!fs.existsSync(INDEX_HTML_PATH)) {
  console.error('Error: dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

const templateHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tokensToHtml(tokens: InlineToken[]): string {
  return tokens
    .map((tok) => {
      if (tok.type === 'text') return escapeHtml(tok.value);
      if (tok.type === 'bold') return `<strong>${tokensToHtml(tok.children)}</strong>`;
      const href = tok.href;
      const isExternal = /^https?:\/\//.test(href);
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(href)}"${attrs}>${tokensToHtml(tok.children)}</a>`;
    })
    .join('');
}
const inlineToHtml = (text: string) => tokensToHtml(tokenizeInline(text));

function slugifyAscii(_text: string, index: number): string {
  return `section-${index}`;
}

function markdownToHtml(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let i = 0;
  let h2Index = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') { i++; continue; }

    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3);
      out.push(`<h2 id="${slugifyAscii(text, h2Index++)}" class="content-h2">${inlineToHtml(text)}</h2>`);
      i++; continue;
    }
    if (trimmed.startsWith('### ')) {
      out.push(`<h3 class="content-h3">${inlineToHtml(trimmed.slice(4))}</h3>`);
      i++; continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const rows = tableLines.map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
        const isSep = (r: string[]) => r.every((c) => /^[-:]+$/.test(c));
        const header = rows[0];
        const data = rows.slice(1).filter((r) => !isSep(r));
        const headerHtml = header.map((c) => `<th>${inlineToHtml(c)}</th>`).join('');
        const bodyHtml = data.map((row) => `<tr>${row.map((c) => `<td>${inlineToHtml(c)}</td>`).join('')}</tr>`).join('');
        out.push(`<div class="content-table-wrap"><table class="content-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      }
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      out.push(`<ol class="content-ol">${items.map((it) => `<li>${inlineToHtml(it)}</li>`).join('')}</ol>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(`<ul class="content-ul">${items.map((it) => `<li>${inlineToHtml(it)}</li>`).join('')}</ul>`);
      continue;
    }

    if (trimmed.startsWith('💡 ')) { out.push(`<p class="callout callout-tip">${inlineToHtml(trimmed.slice(2).trim())}</p>`); i++; continue; }
    if (trimmed.startsWith('⚠️ ')) { out.push(`<p class="callout callout-warning">${inlineToHtml(trimmed.slice(2).trim())}</p>`); i++; continue; }
    if (trimmed.startsWith('📖 ')) { out.push(`<p class="callout callout-info">${inlineToHtml(trimmed.slice(2).trim())}</p>`); i++; continue; }

    const figMatch = trimmed.match(/^\{\{figure:([a-z0-9-]+)\}\}$/);
    if (figMatch) {
      const html = figureHtml(figMatch[1]);
      if (html) out.push(html);
      i++; continue;
    }

    out.push(`<p class="content-p">${inlineToHtml(trimmed)}</p>`);
    i++;
  }
  return out.join('\n');
}

function buildTocHtml(toc: string[]): string {
  if (!toc.length) return '';
  const items = toc.map((it, idx) => `<li><a href="#${slugifyAscii(it, idx)}">${escapeHtml(it)}</a></li>`).join('');
  return `<nav class="toc"><div class="toc-title">目次</div><ol class="toc-list">${items}</ol></nav>`;
}

function formatDateJa(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
}

// ── ホーム＝今日の潮回りダッシュボード（ビルド時点の today でフォールバック生成） ──
const NAV_GROUPS: { label: string; ids: string[] }[] = [
  { label: '潮汐のしくみを知る', ids: ['mechanism', 'spring-neap', 'tide-cycle', 'regional'] },
  { label: '潮汐表を読む', ids: ['datum', 'hazard'] },
  { label: '暮らしと疑問', ids: ['life', 'faq'] },
];

const SHIO_TOP: Record<string, string> = {
  大潮: '#147083', 中潮: '#4a8f9e', 小潮: '#8fc6d4', 長潮: '#b98f33', 若潮: '#6fae7a',
};

function buildHomeDashboard(): string {
  const today = new Date();
  const t = tideToday(today);
  const phase = moonPhaseLabel(t.age);
  const toNext = daysToNextOshio(today);
  const diagram = moonConfigSvg(t.age);
  const m = today.getMonth() + 1, d = today.getDate();
  const topColor = SHIO_TOP[t.shio] || UMI;
  const nextHtml = toNext > 0
    ? `<div style="display:inline-block;background:#eaf1f1;border:1px solid #d8e3e2;border-radius:999px;padding:5px 14px;font-size:0.9rem">次の大潮まで、あと約 <strong style="color:${TSUKI}">${toNext}</strong> 日（目安）</div>`
    : '';
  const navHtml = NAV_GROUPS.map((g) => {
    const links = g.ids.map((id) => {
      const a = articles.find((x) => x.id === id);
      if (!a) return '';
      return `<li style="margin-bottom:8px"><a href="/tide-guide/${a.id}/" style="color:${UMI};font-weight:600;text-decoration:none">${ico(a.icon, 15)} ${escapeHtml(a.shortTitle)}</a><br><span style="color:#55666b;font-size:0.85rem">${escapeHtml(a.description)}</span></li>`;
    }).join('');
    return `<div style="margin:0 0 16px"><div style="font-size:0.95rem;font-weight:700;color:${UMI_DEEP};border-left:4px solid ${TSUKI};padding-left:10px;margin-bottom:8px">${escapeHtml(g.label)}</div><ul style="list-style:none;padding:0 0 0 14px;margin:0">${links}</ul></div>`;
  }).join('');

  return `<article id="static-fallback" style="font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',Meiryo,sans-serif;line-height:1.85;max-width:880px;margin:0 auto;padding:24px 16px;color:#263238">
  <section style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;background:#ffffff;border:1px solid #d8e3e2;border-top:5px solid ${topColor};border-radius:16px;padding:22px 24px;margin-bottom:22px">
    <div style="flex:0 0 180px;max-width:180px">${diagram}</div>
    <div style="flex:1;min-width:220px">
      <div style="font-size:0.82rem;color:#55666b">今日（${m}月${d}日ごろ）の潮回り</div>
      <h1 style="font-family:'Yu Mincho','Hiragino Mincho ProN',serif;font-size:2.4rem;margin:2px 0 4px;letter-spacing:0.08em;color:${UMI_DEEP}">${escapeHtml(t.shio)}</h1>
      <div style="font-size:0.92rem;color:#55666b;margin-bottom:10px">月齢 約${t.age.toFixed(1)}・旧暦 ${t.day}日ごろ・月相：${escapeHtml(phase)}</div>
      <p style="font-size:0.95rem;color:#263238;margin:0 0 12px">${escapeHtml(t.desc)}</p>
      ${nextHtml}
      <p style="font-size:0.76rem;color:#55666b;margin:10px 0 0">月の満ち欠けにもとづく全国共通の目安です。実際の潮位や満干の時刻は場所によって大きく異なります。正確な値は気象庁や海上保安庁の潮汐表でご確認ください。</p>
    </div>
  </section>
  <p style="color:#55666b;font-size:0.96rem;margin:0 0 24px">潮の満ち引き（潮汐）は、月と太陽が海水を引く力によって起こります。トップでは今日の潮回りの目安を示し、各ページで起潮力と潮汐バルジ、大潮と小潮、地域で違う干満差、潮汐表と基準面の読み方、高潮や津波との違いまでを、気象庁や海上保安庁、国立天文台などの一次資料で確かめながらまとめています。</p>
  ${navHtml}
  <nav style="margin-top:20px;border-top:1px solid #d8e3e2;padding-top:16px;display:flex;gap:16px;flex-wrap:wrap">
    <a href="/tide-guide/about/" style="color:${UMI}">サイトについて</a>
    <a href="/tide-guide/privacy/" style="color:${UMI}">プライバシーポリシー</a>
  </nav>
</article>`;
}

const homeWebSiteJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${BASE_URL}/`,
  description: '潮の満ち引き（潮汐）を、気象庁・海上保安庁・国立天文台などの一次資料で確かめながら解説。今日の潮回り、起潮力と潮汐バルジ、大潮と小潮、地域で違う干満差、潮汐表と基準面の読み方、高潮や津波との違いまでを扱う情報サイト。',
  inLanguage: 'ja',
  publisher: { '@type': 'Organization', name: 'study-apps.com', url: 'https://study-apps.com/' },
});

const homeItemListJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: `${SITE_NAME}：記事一覧`,
  itemListElement: articles.map((a, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: a.shortTitle,
    description: a.description,
    url: `${BASE_URL}/${a.id}/`,
  })),
});

let rootIndexHtml = templateHtml.replace('<div id="root"></div>', `<div id="root">${buildHomeDashboard()}</div>`);
rootIndexHtml = rootIndexHtml.replace(
  '</head>',
  `<script type="application/ld+json">${homeWebSiteJsonLd}</script>\n  <script type="application/ld+json">${homeItemListJsonLd}</script>\n  </head>`
);
fs.writeFileSync(INDEX_HTML_PATH, rootIndexHtml);

const subDirTemplateHtml = templateHtml
  .replace(/href="\.\/assets\//g, 'href="../assets/')
  .replace(/src="\.\/assets\//g, 'src="../assets/')
  .replace(/href="\.\/favicon.svg"/g, 'href="../favicon.svg"');

let generatedCount = 0;

function buildChapterNav(currentId: string): string {
  const idx = articles.findIndex((a) => a.id === currentId);
  if (idx === -1) return '';
  const prev = idx > 0 ? articles[idx - 1] : null;
  const next = idx < articles.length - 1 ? articles[idx + 1] : null;
  if (!prev && !next) return '';
  const prevHtml = prev
    ? `<a href="/tide-guide/${prev.id}/" style="display:block;flex:1;padding:14px 16px;background:#ffffff;border:1px solid #d8e3e2;border-radius:10px;text-decoration:none;color:#263238"><div style="font-size:0.76rem;color:${TSUKI};margin-bottom:4px">← 前の記事</div><div style="font-size:0.92rem;font-weight:700;color:${UMI}">${ico(prev.icon, 15)} ${escapeHtml(prev.shortTitle)}</div></a>`
    : `<span style="flex:1"></span>`;
  const nextHtml = next
    ? `<a href="/tide-guide/${next.id}/" style="display:block;flex:1;padding:14px 16px;background:#ffffff;border:1px solid #d8e3e2;border-radius:10px;text-decoration:none;color:#263238;text-align:right"><div style="font-size:0.76rem;color:${TSUKI};margin-bottom:4px">次の記事 →</div><div style="font-size:0.92rem;font-weight:700;color:${UMI}">${ico(next.icon, 15)} ${escapeHtml(next.shortTitle)}</div></a>`
    : `<span style="flex:1"></span>`;
  return `<nav style="display:flex;gap:10px;margin:32px 0">${prevHtml}${nextHtml}</nav>`;
}

function buildArticleFallback(a: Article): string {
  const tocHtml = buildTocHtml(a.toc);
  const contentHtml = markdownToHtml(a.content);
  const chapterNavHtml = buildChapterNav(a.id);
  const leadHtml = a.lead ? `<p class="lead" style="color:#55666b;font-size:1.04rem;margin:16px 0 24px">${inlineToHtml(a.lead)}</p>` : '';
  return `<article style="font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',Meiryo,sans-serif;line-height:1.85;max-width:880px;margin:0 auto;padding:24px 16px;color:#263238">
  <nav style="font-size:0.85rem;color:#55666b;margin:0 0 16px"><a href="/tide-guide/" style="color:${UMI};text-decoration:none">${SITE_NAME}</a> <span style="color:#9ca3af">›</span> <span style="color:#4b5563;font-weight:600">${escapeHtml(a.shortTitle)}</span></nav>
  <header style="margin-bottom:20px">
    <div style="line-height:1;margin-bottom:8px">${ico(a.icon, 30)}</div>
    <h1 style="font-size:1.5rem;color:${UMI_DEEP};border-bottom:2px solid ${UMI};padding-bottom:10px;margin:0 0 8px">${escapeHtml(a.title)}</h1>
    <div style="font-size:0.85rem;color:#55666b;margin-top:10px">最終更新: ${formatDateJa(a.updatedAt)}</div>
  </header>
  ${leadHtml}
  ${tocHtml}
  <div class="section-content">
${contentHtml}
  </div>
  ${referencesHtml(a.references)}
  ${chapterNavHtml}
  <p style="margin-top:32px"><a href="/tide-guide/" style="color:${UMI}">← トップへ戻る</a></p>
</article>`;
}

function applyMeta(html: string, title: string, description: string, urlPath: string, ogType: string): string {
  return html
    .replace(/<title>.*?<\/title>/, `<title>${title} | ${SITE_NAME}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${escapeHtml(description)}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${escapeHtml(title)}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${escapeHtml(description)}"`)
    .replace(/<meta property="og:type" content="[^"]*"/, `<meta property="og:type" content="${ogType}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${BASE_URL}${urlPath}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${BASE_URL}${urlPath}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${escapeHtml(title)}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${escapeHtml(description)}"`);
}

function writeArticlePage(a: Article) {
  const dir = path.join(DIST_DIR, a.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let html = applyMeta(subDirTemplateHtml, a.title, a.description, `/${a.id}/`, 'article')
    .replace('<div id="root"></div>', `<div id="root">${buildArticleFallback(a)}</div>`);

  const articleJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    url: `${BASE_URL}/${a.id}/`,
    inLanguage: 'ja',
    datePublished: a.updatedAt,
    dateModified: a.updatedAt,
    author: { '@type': 'Organization', name: 'study-apps.com' },
    publisher: { '@type': 'Organization', name: 'study-apps.com', url: 'https://study-apps.com/' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/${a.id}/` },
  });

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: a.shortTitle, item: `${BASE_URL}/${a.id}/` },
    ],
  });

  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${articleJsonLd}</script>\n  <script type="application/ld+json">${breadcrumbJsonLd}</script>\n  </head>`
  );

  fs.writeFileSync(path.join(dir, 'index.html'), html);
  generatedCount++;
}

for (const a of articles) writeArticlePage(a);

function writeStaticPage(id: string, title: string, description: string, bodyHtml: string) {
  const dir = path.join(DIST_DIR, id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fallback = `<article style="font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',Meiryo,sans-serif;line-height:1.85;max-width:880px;margin:0 auto;padding:24px 16px;color:#263238">
  <nav style="font-size:0.85rem;color:#55666b;margin:0 0 16px"><a href="/tide-guide/" style="color:${UMI};text-decoration:none">${SITE_NAME}</a> <span style="color:#9ca3af">›</span> <span style="color:#4b5563;font-weight:600">${escapeHtml(title)}</span></nav>
  <h1 style="font-size:1.5rem;color:${UMI_DEEP};border-bottom:2px solid ${UMI};padding-bottom:10px">${escapeHtml(title)}</h1>
  ${bodyHtml}
  <p style="margin-top:32px"><a href="/tide-guide/" style="color:${UMI}">← トップへ戻る</a></p>
</article>`;

  const pageJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `${BASE_URL}/${id}/`,
    inLanguage: 'ja',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${BASE_URL}/` },
  });
  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: title, item: `${BASE_URL}/${id}/` },
    ],
  });

  let html = applyMeta(subDirTemplateHtml, title, description, `/${id}/`, 'website')
    .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${pageJsonLd}</script>\n  <script type="application/ld+json">${breadcrumbJsonLd}</script>\n  </head>`
  );
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  generatedCount++;
}

const sectionH2 = (t: string) => `<h2 style="font-size:1.3rem;color:${UMI_DEEP};border-left:4px solid ${TSUKI};padding-left:12px;margin:32px 0 12px">${t}</h2>`;

writeStaticPage(
  'about',
  'サイトについて',
  `${SITE_NAME}について。本サイトの目的と情報源、編集方針、数値の扱いを説明します。`,
  `<p>本サイト「${SITE_NAME}」は、潮の満ち引き（潮汐）のしくみを、今日の潮回りとあわせて一目で確かめられるようにまとめたものです。トップでは今日の潮回りの目安を示し、各ページで起潮力と潮汐バルジ、大潮と小潮、地域で違う干満差、潮汐表と基準面、高潮や津波との違い、暮らしとの関わりまでを扱います。</p>
  ${sectionH2('編集と制作の方針')}
  <p>本サイトの内容は、気象庁や海上保安庁 海洋情報部、国立天文台 暦計算室などの公開情報を参照し、事実を確認したうえで、運営者が自分の言葉で書いています。出典の文章をそのまま転載することはありません。起潮力の説明は、気象庁が用いる「慣性力」という表記に従っています。</p>
  ${sectionH2('数値と目安の扱い')}
  <p>潮汐の周期や干満差、潮回りの日数は、いずれも目安です。トップに表示する今日の潮回りも、月の満ち欠けにもとづく全国共通の簡易な判定であり、実際の潮位や満干の時刻は場所によって大きく異なります。正確な値は、気象庁や海上保安庁 海洋情報部の潮汐表でご確認ください。</p>
  ${sectionH2('お問い合わせ')}
  <p>ご質問や誤りのご指摘は<a href="https://forms.gle/ccMv7oKwz6ysDHBe6" target="_blank" rel="noopener noreferrer" style="color:${UMI}">こちらのGoogleフォーム</a>からお願いします。</p>`
);

writeStaticPage(
  'privacy',
  'プライバシーポリシー',
  `${SITE_NAME}のプライバシーポリシー。Cookie・アクセス解析・広告の使用について。`,
  `${sectionH2('アクセス解析')}
  <p>本サイトでは、サイトの利用状況を把握するために Google Analytics を使用しています。Google Analytics はクッキーを利用して匿名のトラフィックデータを収集します。収集される情報は匿名で、個人を特定するものではありません。</p>
  ${sectionH2('広告について')}
  <p>本サイトでは Google AdSense などの第三者配信の広告サービスを利用することがあります。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにクッキーを使用することがあります。Cookie を無効にする設定や、Google の広告設定により、パーソナライズ広告を無効にできます。</p>
  ${sectionH2('免責事項')}
  <p>本サイトの情報は可能な限り正確を期していますが、その完全性や正確性を保証するものではありません。潮汐の周期や干満差、潮回りは目安であり、実際の潮位や満干の時刻は場所によって大きく異なります。海辺での活動は、気象庁や自治体の最新の情報にしたがってください。本サイトの情報を利用したことにより生じた損害について、運営者は一切の責任を負いません。</p>`
);

const today = new Date().toISOString().split('T')[0];
type SitemapEntry = { path: string; lastmod: string; changefreq: string; priority: string };
const sitemapEntries: SitemapEntry[] = [
  { path: '/', lastmod: today, changefreq: 'daily', priority: '1.0' },
  ...articles.map((a) => ({ path: `/${a.id}/`, lastmod: a.updatedAt, changefreq: 'monthly', priority: '0.9' })),
  { path: '/about/', lastmod: today, changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy/', lastmod: today, changefreq: 'yearly', priority: '0.3' },
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map((e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`)
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);
console.log(`✓ Generated sitemap.xml (${sitemapEntries.length} URLs)`);
console.log(`✓ Generated ${generatedCount} static pages`);
console.log('--- Done ---');
