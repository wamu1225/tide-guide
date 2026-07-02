// 「今日の潮回り」を日付から算出するためのロジック（単一の真実源）。
// 月齢は朔望月（約29.53日）にもとづく簡易計算で、潮回りは旧暦日への対応表からの目安。
// 実際の潮位・満干の時刻は場所によって大きく異なるため、正確な値は気象庁・海上保安庁の潮汐表による。
// App.tsx（トップの今日ダッシュボード）と prerender（ビルド時点でのフォールバック）が共用する。

export type Shio = '大潮' | '中潮' | '小潮' | '長潮' | '若潮';

// 朔望月の長さ（日）。基準の新月は 2000-01-06 18:14 UTC。
const SYNODIC = 29.530588853;
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // 日単位

// 月齢（新月からの経過日数・0〜約29.5）。
export function moonAge(date: Date): number {
  const days = date.getTime() / 86400000;
  let a = (days - REF_NEW_MOON) % SYNODIC;
  if (a < 0) a += SYNODIC;
  return a;
}

// 旧暦日の目安（新月＝1日）。1〜30。
export function kyurekiDay(date: Date): number {
  const day = Math.floor(moonAge(date)) + 1;
  return day > 30 ? 30 : day;
}

// 旧暦日（1〜30）→ 潮回り。日本で広く使われる対応（目安）。
const TIDE_BY_DAY: Shio[] = [
  '大潮', '大潮', '中潮', '中潮', '中潮', '中潮', '小潮', '小潮', '小潮', '長潮', // 1-10
  '若潮', '中潮', '中潮', '大潮', '大潮', '大潮', '大潮', '中潮', '中潮', '中潮', // 11-20
  '中潮', '小潮', '小潮', '小潮', '長潮', '若潮', '中潮', '中潮', '大潮', '大潮', // 21-30
];

export const SHIO_DESC: Record<Shio, string> = {
  大潮: '干満差が最も大きい。新月と満月の前後で、月と太陽の起潮力が重なる頃。',
  中潮: '大潮と小潮の間。干満差は中くらい。',
  小潮: '干満差が小さい。上弦と下弦の前後で、月と太陽の起潮力が打ち消し合う頃。',
  長潮: '小潮の末期。潮の満ち引きの変化が少なく、だらだらと長く感じられる頃。',
  若潮: '長潮の翌日。小さかった潮が再び大きくなり始め、潮が若返るとされる頃。',
};

export type TideToday = { shio: Shio; day: number; age: number; desc: string };

export function tideToday(date: Date): TideToday {
  const day = kyurekiDay(date);
  const shio = TIDE_BY_DAY[day - 1];
  return { shio, day, age: moonAge(date), desc: SHIO_DESC[shio] };
}

// 次に大潮に入るまでのおおよその日数（目安）。今日が大潮のときは、いったん大潮が
// 明けてから次に大潮へ入るまでを返す。月齢にもとづく簡易判定で、地域差は反映しない。
export function daysToNextOshio(date: Date): number {
  const dayMs = 86400000;
  const isOshio = (d: Date) => tideToday(d).shio === '大潮';
  const startOshio = isOshio(date);
  let leftOshio = !startOshio;
  for (let i = 1; i <= 40; i++) {
    const d = new Date(date.getTime() + i * dayMs);
    const oshio = isOshio(d);
    if (!oshio) leftOshio = true;
    if (oshio && leftOshio) return i;
  }
  return 0;
}

// 月相の名称（配置図のラベル用・目安）。
export function moonPhaseLabel(age: number): string {
  if (age < 1.5 || age >= 28) return '新月';
  if (age < 6) return '三日月〜上弦前';
  if (age < 9) return '上弦';
  if (age < 13) return '十日夜〜';
  if (age < 16.5) return '満月';
  if (age < 20) return '居待月〜';
  if (age < 24) return '下弦';
  return '有明月〜';
}
