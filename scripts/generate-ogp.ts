// scripts/generate-ogp.ts — OGP画像（1200×630）を public/ogp.png に生成する。
// 実行: npx tsx scripts/generate-ogp.ts
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const FONT = "'Yu Gothic','Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,'Noto Sans JP',sans-serif";
const SERIF = "'Yu Mincho','Hiragino Mincho ProN','Noto Serif JP',serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef3f2"/>
      <stop offset="1" stop-color="#dcebec"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#sea)"/>
  <rect x="0" y="0" width="16" height="630" fill="#147083"/>
  <rect x="16" y="0" width="6" height="630" fill="#b98f33"/>
  <text x="96" y="196" font-family="${SERIF}" font-size="76" font-weight="700" fill="#0d4b58">潮の満ち引き</text>
  <text x="96" y="278" font-family="${SERIF}" font-size="48" font-weight="600" fill="#147083">ガイド</text>
  <text x="96" y="366" font-family="${FONT}" font-size="26" fill="#55666b">今日の潮回り、起潮力と潮汐バルジ、大潮と小潮、地域で違う</text>
  <text x="96" y="404" font-family="${FONT}" font-size="26" fill="#55666b">干満差、潮見表と基準面、高潮や津波との違いを一次資料で</text>
  <line x1="96" y1="470" x2="720" y2="470" stroke="#c5dadb" stroke-width="2"/>
  <text x="96" y="522" font-family="${FONT}" font-size="24" fill="#147083" font-weight="600">study-apps.com/tide-guide/</text>
  <!-- 月と潮汐バルジ（地球の両側が膨らむ） -->
  <g transform="translate(1000 315)">
    <ellipse cx="0" cy="0" rx="150" ry="104" fill="#8fc6d4"/>
    <circle r="94" fill="#147083"/>
    <circle r="94" fill="none" stroke="#0d4b58" stroke-width="3"/>
    <circle cx="176" cy="0" r="26" fill="#e6cf87"/>
    <path d="M120 0 h34" stroke="#0d4b58" stroke-width="5"/>
    <path d="M154 0 l-12 -8 M154 0 l-12 8" stroke="#0d4b58" stroke-width="5" fill="none"/>
    <path d="M-120 0 h-34" stroke="#0d4b58" stroke-width="5"/>
    <path d="M-154 0 l12 -8 M-154 0 l12 8" stroke="#0d4b58" stroke-width="5" fill="none"/>
  </g>
</svg>`;

async function main() {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const outPath = path.join(PUBLIC_DIR, 'ogp.png');
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`✓ ogp.png (1200x630) を生成: ${outPath}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
