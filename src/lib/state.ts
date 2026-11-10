// 学习记录（只存在本机 IndexedDB）。所有修改都通过 update(draft => ...) 在副本上进行。
import { STUDY_PLAN } from "../data/program";
import { addDays, dayKey, daysBetween, weekKey } from "./date";
import { nextCard, type CardRec, type Result } from "./srs";

export const HEART_MAX = 5;
const HEART_REGEN_MS = 2 * 60 * 60 * 1000;
const FREEZE_MAX = 2;

export interface DayRec {
  xp: number;
  lessons: number;
  reviews: number;
  /** 每门课当天第一次学完的课数（算进度和节奏） */
  fresh: Record<string, number>;
}

export interface LessonRec {
  times: number;
  best: number;
  last: string;
}

export type CourseStatus = "todo" | "studying" | "passed";

export interface AppState {
  v: 1;
  created: string;
  xp: number;
  hearts: number;
  heartsAt: string;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  freezes: number;
  freezeWeek: string | null;
  days: Record<string, DayRec>;
  lessons: Record<string, LessonRec>;
  cards: Record<string, CardRec>;
  /** 标记“题有问题”的题：题目 id -> 标记时间 */
  flags: Record<string, string>;
  courses: Record<string, { status: CourseStatus; score?: number }>;
  /** 考期 id -> 已确认报名 */
  registered: Record<string, boolean>;
  settings: { active: string; sound: boolean; hearts: boolean };
}

export function createState(now = new Date()): AppState {
  const today = dayKey(now);
  return {
    v: 1,
    created: now.toISOString(),
    xp: 0,
    hearts: HEART_MAX,
    heartsAt: now.toISOString(),
    streak: 0,
    bestStreak: 0,
    lastDay: null,
    freezes: 1,
    freezeWeek: weekKey(today),
    days: {},
    lessons: {},
    cards: {},
    flags: {},
    courses: Object.fromEntries(STUDY_PLAN.map((p) => [p.code, { status: "studying" as CourseStatus }])),
    registered: {},
    settings: { active: STUDY_PLAN[0].code, sound: true, hearts: true },
  };
}

/** 读入旧数据或备份时补齐缺失字段 */
export function migrate(raw: unknown): AppState {
  const base = createState();
  if (!raw || typeof raw !== "object" || (raw as AppState).v !== 1) return base;
  const s = raw as Partial<AppState>;
  return {
    ...base,
    ...s,
    settings: { ...base.settings, ...s.settings },
    courses: { ...base.courses, ...s.courses },
  } as AppState;
}

function day(s: AppState, key: string): DayRec {
  return (s.days[key] ??= { xp: 0, lessons: 0, reviews: 0, fresh: {} });
}

/** 打开应用、回到前台时调用：发请假卡、结算断签、恢复体力。返回是否有变化 */
export function refresh(s: AppState, now = new Date()): boolean {
  const today = dayKey(now);
  let changed = false;

  const week = weekKey(today);
  if (s.freezeWeek !== week) {
    s.freezes = Math.min(FREEZE_MAX, s.freezes + 1);
    s.freezeWeek = week;
    changed = true;
  }

  if (s.lastDay && s.streak > 0) {
    const missed = daysBetween(s.lastDay, today) - 1;
    if (missed > 0) {
      if (missed <= s.freezes) {
        // 用请假卡补上漏掉的日子，连胜不断
        s.freezes -= missed;
        s.lastDay = addDays(today, -1);
      } else {
        s.streak = 0;
      }
      changed = true;
    }
  }

  if (s.hearts < HEART_MAX) {
    const gained = Math.floor((now.getTime() - Date.parse(s.heartsAt)) / HEART_REGEN_MS);
    if (gained > 0) {
      s.hearts = Math.min(HEART_MAX, s.hearts + gained);
      s.heartsAt = new Date(Date.parse(s.heartsAt) + gained * HEART_REGEN_MS).toISOString();
      changed = true;
    }
  }
  return changed;
}

/** 下一点体力恢复的时间（满体力时为 null） */
export function nextHeartAt(s: AppState): Date | null {
  return s.hearts >= HEART_MAX ? null : new Date(Date.parse(s.heartsAt) + HEART_REGEN_MS);
}

function markActive(s: AppState, today: string) {
  if (s.lastDay === today) return;
  s.streak = s.lastDay === addDays(today, -1) ? s.streak + 1 : 1;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.lastDay = today;
}

export function spendHeart(s: AppState, now = new Date()) {
  if (!s.settings.hearts || s.hearts <= 0) return;
  if (s.hearts === HEART_MAX) s.heartsAt = now.toISOString();
  s.hearts -= 1;
}

export function gainHeart(s: AppState) {
  if (s.hearts < HEART_MAX) s.hearts += 1;
}

export function gradeQuestion(s: AppState, questionId: string, result: Result, now = new Date()) {
  s.cards[questionId] = nextCard(s.cards[questionId], result, now);
}

export function finishLesson(
  s: AppState,
  r: { lessonId: string; course: string; accuracy: number; xp: number },
  now = new Date(),
): { firstTime: boolean; streakUp: boolean } {
  const today = dayKey(now);
  const prev = s.lessons[r.lessonId];
  const before = s.lastDay;
  s.lessons[r.lessonId] = {
    times: (prev?.times ?? 0) + 1,
    best: Math.max(prev?.best ?? 0, r.accuracy),
    last: now.toISOString(),
  };
  const d = day(s, today);
  d.lessons += 1;
  d.xp += r.xp;
  if (!prev) d.fresh[r.course] = (d.fresh[r.course] ?? 0) + 1;
  s.xp += r.xp;
  markActive(s, today);
  return { firstTime: !prev, streakUp: before !== today };
}

export function finishReview(s: AppState, r: { answered: number; xp: number }, now = new Date()): { streakUp: boolean } {
  const today = dayKey(now);
  const before = s.lastDay;
  const d = day(s, today);
  d.reviews += r.answered;
  d.xp += r.xp;
  s.xp += r.xp;
  markActive(s, today);
  return { streakUp: before !== today };
}

/** 到期需要复习的题（可按课程筛选），最早到期的在前 */
export function dueQuestions(s: AppState, now = new Date(), course?: string): string[] {
  const t = now.getTime();
  return Object.entries(s.cards)
    .filter(([id, c]) => Date.parse(c.due) <= t && !s.flags[id] && (!course || id.startsWith(course + "-")))
    .sort(([, a], [, b]) => Date.parse(a.due) - Date.parse(b.due))
    .map(([id]) => id);
}

/** 错题本：答错过、还没完全掌握的题 */
export function wrongQuestions(s: AppState, course?: string): string[] {
  return Object.entries(s.cards)
    .filter(([id, c]) => c.wrongCount > 0 && (c.last !== "right" || c.state !== 2) && (!course || id.startsWith(course + "-")))
    .sort(([, a], [, b]) => b.wrongCount - a.wrongCount)
    .map(([id]) => id);
}
