// 考期紧迫感：倒计时、需要的速度 vs 实际速度、按现速度哪天学完
import { getBank } from "../data/banks";
import { examStart, STUDY_PLAN } from "../data/program";
import { addDays, dayKey, daysBetween } from "./date";
import type { AppState } from "./state";

export const SPRINT_DAYS = 7;
const PACE_WINDOW = 14;

export type UrgencyLevel = "calm" | "mid" | "hot";

export interface Pace {
  code: string;
  examAt: Date | null;
  examDay: string | null;
  daysLeft: number | null;
  total: number;
  done: number;
  remaining: number;
  /** 冲刺周之前每天需要学完的课数 */
  required: number;
  /** 最近 14 天（不足 14 天按实际天数）平均每天学完的新课数 */
  actual: number;
  /** 按现速度学完的日期 */
  finishDay: string | null;
  /** 学完日期距考试还有几天（负数 = 来不及） */
  marginDays: number | null;
  level: UrgencyLevel;
  sprint: boolean;
  todayTarget: number;
  todayDone: number;
}

export function coursePace(s: AppState, code: string, now = new Date()): Pace {
  const today = dayKey(now);
  const plan = STUDY_PLAN.find((p) => p.code === code);
  const examAt = plan ? examStart(code, plan.session) : null;
  const examDay = examAt ? dayKey(examAt) : null;
  const daysLeft = examDay ? daysBetween(today, examDay) : null;

  const lessons = getBank(code)?.lessons ?? [];
  const total = lessons.length;
  const done = lessons.filter((l) => s.lessons[l.id]?.times).length;
  const remaining = total - done;
  const todayDone = s.days[today]?.fresh[code] ?? 0;

  const sprintStart = examDay ? addDays(examDay, -SPRINT_DAYS) : null;
  const studyDays = sprintStart ? Math.max(1, daysBetween(today, sprintStart)) : 30;
  const required = remaining / studyDays;
  const todayTarget = remaining + todayDone > 0 ? Math.max(1, Math.ceil((remaining + todayDone) / studyDays)) : 0;

  const window = Math.max(1, Math.min(PACE_WINDOW, daysBetween(dayKey(new Date(s.created)), today) + 1));
  let fresh = 0;
  for (let i = 0; i < window; i++) fresh += s.days[addDays(today, -i)]?.fresh[code] ?? 0;
  const actual = fresh / window;

  let finishDay: string | null = null;
  if (remaining === 0) finishDay = today;
  else if (actual > 0) finishDay = addDays(today, Math.ceil(remaining / actual));
  const marginDays = finishDay && examDay ? daysBetween(finishDay, examDay) : null;

  const behind = remaining > 0 && sprintStart !== null && finishDay !== null && finishDay > sprintStart;
  const level: UrgencyLevel =
    daysLeft !== null && (daysLeft < 30 || behind) ? "hot" : daysLeft !== null && daysLeft <= 90 ? "mid" : "calm";

  return {
    code, examAt, examDay, daysLeft, total, done, remaining, required, actual, finishDay, marginDays, level,
    sprint: daysLeft !== null && daysLeft <= SPRINT_DAYS && daysLeft >= 0,
    todayTarget, todayDone,
  };
}

/** 学完一课让学完日期提前多少天（结算页展示） */
export function daysSavedByLesson(p: Pace): number {
  const rate = p.actual > 0 ? p.actual : p.required;
  if (rate <= 0) return 0;
  return Math.min(9.9, Math.round((1 / rate) * 10) / 10);
}
