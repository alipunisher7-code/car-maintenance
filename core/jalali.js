// Minimal Jalali ↔ Gregorian conversion
export function toJalali(date = new Date()) {
  const g = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  const gy = g[0] - 1600, gm = g[1] - 1, gd = g[2] - 1;
  let gDayNo = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
  const gDays = [31,28+((gy%4==0&&gy%100!=0)||gy%400==0?1:0),31,30,31,30,31,31,30,31,30,31];
  for (let i = 0; i < gm; i++) gDayNo += gDays[i];
  gDayNo += gd;
  let jDayNo = gDayNo - 79;
  const jNp = Math.floor(jDayNo / 12053); jDayNo %= 12053;
  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;
  if (jDayNo >= 366) { jy += Math.floor((jDayNo - 1) / 365); jDayNo = (jDayNo - 1) % 365; }
  const jDays = [31,31,31,31,31,31,30,30,30,30,30,29];
  let jm = 0;
  for (; jm < 11 && jDayNo >= jDays[jm]; jm++) jDayNo -= jDays[jm];
  return { y: jy, m: jm + 1, d: jDayNo + 1 };
}

export function jalaliToString(date = new Date()) {
  const { y, m, d } = toJalali(date);
  return `${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}`;
}

export function toGregorian(jy, jm, jd) {
  jy -= 979; jm -= 1; jd -= 1;
  let jDayNo = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
  const jDays = [31,31,31,31,31,31,30,30,30,30,30,29];
  for (let i = 0; i < jm; i++) jDayNo += jDays[i];
  jDayNo += jd;
  let gDayNo = jDayNo + 79;
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097); gDayNo %= 146097;
  let leap = true;
  if (gDayNo >= 36525) { gDayNo--; gy += 100 * Math.floor(gDayNo / 36524); gDayNo %= 36524; if (gDayNo >= 365) gDayNo++; else leap = false; }
  gy += 4 * Math.floor(gDayNo / 1461); gDayNo %= 1461;
  if (gDayNo >= 366) { leap = false; gDayNo--; gy += Math.floor(gDayNo / 365); gDayNo %= 365; }
  const gDays = [31,28+(leap?1:0),31,30,31,30,31,31,30,31,30,31];
  let gm = 0;
  for (; gm < 11 && gDayNo >= gDays[gm]; gm++) gDayNo -= gDays[gm];
  return new Date(gy, gm, gDayNo + 1);
}
