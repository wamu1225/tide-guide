// 自作SVG模式図のHTML文字列を一元管理する単一の真実源（SSOT）。
// React版（App.tsx の {{figure:KEY}} 展開）と prerender の双方が使う。
// テーマ：潮の青緑(#147083) × 月の金(#b98f33) × 水色の生成り(#eef3f2)。

const BG = '#eef3f2';
const UMI = '#147083';
const UMI_DEEP = '#0d4b58';
const TSUKI = '#b98f33';
const SUN = '#d98a3f';
const WATER = '#8fc6d4';
const INK = '#263238';

// 1) 起潮力と潮汐バルジ（地球の両側が膨らむ）
function bulgeSvg(): string {
  const cx = 150, cy = 80;
  return (
    `<svg class="diagram-single" viewBox="0 0 300 160" width="100%" role="img" aria-label="起潮力が地球の両側を引き伸ばして潮汐バルジをつくる図">` +
    `<rect width="300" height="160" fill="${BG}"/>` +
    // 海（バルジ：横長楕円）
    `<ellipse cx="${cx}" cy="${cy}" rx="70" ry="46" fill="${WATER}"/>` +
    // 地球
    `<circle cx="${cx}" cy="${cy}" r="42" fill="${UMI}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="${UMI_DEEP}" stroke-width="1.5"/>` +
    // 月
    `<circle cx="270" cy="${cy}" r="12" fill="${TSUKI}"/>` +
    `<text x="270" y="${cy + 30}" font-size="10" fill="${INK}" text-anchor="middle">月</text>` +
    // 起潮力の矢印（両側外向き）
    `<path d="M232 ${cy} h20" stroke="${UMI_DEEP}" stroke-width="2.4"/><path d="M252 ${cy} l-6 -4 M252 ${cy} l-6 4" stroke="${UMI_DEEP}" stroke-width="2.4" fill="none"/>` +
    `<path d="M68 ${cy} h-20" stroke="${UMI_DEEP}" stroke-width="2.4"/><path d="M48 ${cy} l6 -4 M48 ${cy} l6 4" stroke="${UMI_DEEP}" stroke-width="2.4" fill="none"/>` +
    // 満潮ラベル
    `<text x="${cx}" y="150" font-size="10.5" fill="${UMI_DEEP}" text-anchor="middle" font-weight="700">月側と反対側の両方が膨らみ、同時に満潮になる</text>` +
    `<text x="212" y="${cy - 40}" font-size="9" fill="${INK}">満潮</text>` +
    `<text x="70" y="${cy - 40}" font-size="9" fill="${INK}" text-anchor="end">満潮</text>` +
    `</svg>`
  );
}

// 2) 大潮・小潮の月-地球-太陽配置
function springNeapSvg(): string {
  const panel = (ox: number, title: string, moonAngleDeg: number, sub: string) => {
    const cx = ox + 70, cy = 66, r = 40;
    const a = (moonAngleDeg * Math.PI) / 180;
    const mx = cx + r * Math.cos(a), my = cy - r * Math.sin(a);
    // 太陽は右方向（固定）
    return `<g>` +
      `<text x="${cx}" y="20" font-size="11" font-weight="700" fill="${UMI_DEEP}" text-anchor="middle">${title}</text>` +
      `<circle cx="${cx}" cy="${cy}" r="11" fill="${UMI}"/>` +
      `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="7" fill="${TSUKI}"/>` +
      `<circle cx="${ox + 132}" cy="${cy}" r="9" fill="${SUN}"/>` +
      `<text x="${ox + 132}" y="${cy + 22}" font-size="8" fill="${INK}" text-anchor="middle">太陽</text>` +
      `<text x="${mx.toFixed(1)}" y="${(my - 11).toFixed(1)}" font-size="8" fill="${INK}" text-anchor="middle">月</text>` +
      `<text x="${cx}" y="118" font-size="9" fill="${INK}" text-anchor="middle">${sub}</text>` +
      `</g>`;
  };
  return (
    `<svg class="diagram-single" viewBox="0 0 300 130" width="100%" role="img" aria-label="大潮は太陽と月が一直線、小潮は直角に位置することを示す図">` +
    `<rect width="300" height="130" fill="${BG}"/>` +
    panel(4, '大潮', 0, '太陽と月が一直線→強め合う') +
    panel(150, '小潮', 90, '太陽と月が直角→打ち消し合う') +
    `</svg>`
  );
}

// 3) 潮回りのサイクル（干満差のバーで表す）
function tideCycleSvg(): string {
  const steps: { n: string; h: number }[] = [
    { n: '大潮', h: 46 }, { n: '中潮', h: 34 }, { n: '小潮', h: 18 },
    { n: '長潮', h: 14 }, { n: '若潮', h: 20 }, { n: '中潮', h: 34 }, { n: '大潮', h: 46 },
  ];
  const bw = 34, gap = 6, x0 = 16, base = 96;
  let bars = '';
  steps.forEach((s, i) => {
    const x = x0 + i * (bw + gap);
    const big = s.n === '大潮';
    bars += `<rect x="${x}" y="${base - s.h}" width="${bw}" height="${s.h}" rx="3" fill="${big ? UMI : WATER}"/>` +
      `<text x="${x + bw / 2}" y="${base + 13}" font-size="9" fill="${INK}" text-anchor="middle">${s.n}</text>`;
  });
  return (
    `<svg class="diagram-single" viewBox="0 0 300 120" width="100%" role="img" aria-label="潮回りが大潮から小潮へ、長潮と若潮を経てまた大潮へめぐる図">` +
    `<rect width="300" height="120" fill="${BG}"/>` +
    `<line x1="10" y1="${base}" x2="290" y2="${base}" stroke="${UMI_DEEP}" stroke-width="1.5"/>` +
    bars +
    `<text x="150" y="112" font-size="9" fill="${UMI_DEEP}" text-anchor="middle">バーの高さは干満差の大きさの目安</text>` +
    `</svg>`
  );
}

// 4) 基準面の階層
function datumSvg(): string {
  const rows: { y: number; label: string; note: string }[] = [
    { y: 26, label: '略最高高潮面 N.H.H.W.L.', note: '天文的な海面上昇の上限の目安' },
    { y: 54, label: '東京湾平均海面 T.P.', note: '土地の標高0mの基準' },
    { y: 74, label: '平均水面 MSL', note: '海面の平均の高さ' },
    { y: 104, label: '最低水面 DL', note: '海図の水深・潮位の起点' },
  ];
  let lines = '';
  for (const r of rows) {
    lines += `<line x1="20" y1="${r.y}" x2="150" y2="${r.y}" stroke="${UMI_DEEP}" stroke-width="1.6"/>` +
      `<text x="156" y="${r.y - 2}" font-size="9.5" font-weight="700" fill="${UMI_DEEP}">${r.label}</text>` +
      `<text x="156" y="${r.y + 9}" font-size="8" fill="${INK}">${r.note}</text>`;
  }
  return (
    `<svg class="diagram-single" viewBox="0 0 300 130" width="100%" role="img" aria-label="潮位の基準面の高さの階層を示す図">` +
    `<rect width="300" height="130" fill="${BG}"/>` +
    `<rect x="20" y="74" width="130" height="30" fill="${WATER}" opacity="0.5"/>` +
    lines +
    `<text x="20" y="122" font-size="9" fill="${INK}">実際の水深 ＝ 海図の水深（DL基準）＋ その時の潮位</text>` +
    `</svg>`
  );
}

// トップの今日ダッシュボード用：今日の月-地球-太陽の配置（月齢から。App/prerender 共用）
export function moonConfigSvg(age: number): string {
  const SYN = 29.53;
  const cx = 90, cy = 80, r = 46;
  // 新月(age0)=月は太陽側(右)、満月=反対(左)、上弦=上。太陽方向を右に固定。
  const theta = (age / SYN) * 2 * Math.PI; // 太陽方向からの角度
  const mx = cx + r * Math.cos(theta), my = cy - r * Math.sin(theta);
  return (
    `<svg viewBox="0 0 180 160" width="100%" role="img" aria-label="今日の月と地球と太陽のおおよその配置図">` +
    `<rect width="180" height="160" fill="none"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${WATER}" stroke-width="1" stroke-dasharray="3 3"/>` +
    `<circle cx="${cx}" cy="${cy}" r="13" fill="${UMI}"/>` +
    `<text x="${cx}" y="${cy + 30}" font-size="9" fill="${INK}" text-anchor="middle">地球</text>` +
    `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="8" fill="${TSUKI}"/>` +
    `<text x="${mx.toFixed(1)}" y="${(my - 12).toFixed(1)}" font-size="9" fill="${INK}" text-anchor="middle">月</text>` +
    `<circle cx="162" cy="${cy}" r="12" fill="${SUN}"/>` +
    `<text x="160" y="${cy + 28}" font-size="9" fill="${INK}" text-anchor="middle">太陽</text>` +
    `<line x1="103" y1="${cy}" x2="150" y2="${cy}" stroke="${SUN}" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>` +
    `</svg>`
  );
}

const FIGURE_DATA: Record<string, { caption: string; inner: string }> = {
  'bulge': {
    caption: '起潮力と潮汐バルジ（模式図）。起潮力は地球を月の方向とその反対方向の両側へ引き伸ばす。月に面した側と反対側の両方で海面が盛り上がり、同時に満潮になる。',
    inner: `<div class="diagram-wrap">${bulgeSvg()}</div>`,
  },
  'spring-neap': {
    caption: '大潮と小潮（模式図）。新月と満月では太陽と月が一直線に並んで起潮力が強め合い大潮になる。上弦と下弦では直角に位置して打ち消し合い小潮になる。',
    inner: `<div class="diagram-wrap">${springNeapSvg()}</div>`,
  },
  'tide-cycle': {
    caption: '潮回りのめぐり（模式図）。大潮から中潮を経て小潮へ、小潮の末に長潮、その翌日が若潮、そこから中潮を経てまた大潮へ戻る。バーの高さは干満差の大きさの目安。',
    inner: `<div class="diagram-wrap">${tideCycleSvg()}</div>`,
  },
  'datum': {
    caption: '潮位の基準面（模式図）。海図の水深や潮位は最低水面（DL）を起点に測る。実際の水深は、海図の水深にそのときの潮位を足したものになる。',
    inner: `<div class="diagram-wrap">${datumSvg()}</div>`,
  },
};

export const FIGURE_KEYS = Object.keys(FIGURE_DATA);

export function figureHtml(id: string): string | null {
  const f = FIGURE_DATA[id];
  if (!f) return null;
  return `<div class="content-figure">${f.inner}<p class="figure-caption">${f.caption}</p></div>`;
}
