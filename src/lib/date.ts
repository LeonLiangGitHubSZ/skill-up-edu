// 日期一律用本地时间的 YYYY-MM-DD 作为“某一天”的键

const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** b - a 的天数（按日历日） */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** 所在周的周一，用于每周发一张请假卡 */
export function weekKey(key: string): string {
  const d = parseDay(key);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return dayKey(d);
}

export const shortDate = (key: string) => {
  const d = parseDay(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
