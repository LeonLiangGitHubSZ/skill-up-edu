// 模拟考试：按试卷结构从题库抽题组卷、交卷后计分
import { getBank } from "../data/banks";
import type { Question, QuestionType, ShortQuestion } from "../data/types";
import { checkFill, shuffledOrder } from "./answer";
import type { Result } from "./srs";

export interface PaperSection {
  label: string;
  type: QuestionType;
  /** 主观题按 form 区分题型 */
  forms?: ShortQuestion["form"][];
  count: number;
  /** 每题分值 */
  points: number;
}

export interface PaperSpec {
  minutes: number;
  /** 试卷结构的来源说明 */
  note: string;
  sections: PaperSection[];
}

export const PAPERS: Record<string, PaperSpec> = {
  "04735": {
    minutes: 150,
    note: "全国统考题型：单选、填空、简答、设计、综合，共 100 分。",
    sections: [
      { label: "单项选择题", type: "single", count: 15, points: 2 },
      { label: "填空题", type: "fill", count: 10, points: 1 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 5 },
      { label: "设计题", type: "short", forms: ["设计"], count: 5, points: 4 },
      { label: "综合题", type: "short", forms: ["综合应用"], count: 1, points: 15 },
    ],
  },
  "04751": {
    minutes: 150,
    note: "题型按南航大纲（单选、判断改错、简答、论述）；各题型的题量和分值是估计的。",
    sections: [
      { label: "单项选择题", type: "single", count: 20, points: 1 },
      { label: "判断改错题", type: "judge", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 6, points: 5 },
      { label: "论述题", type: "short", forms: ["论述"], count: 2, points: 15 },
    ],
  },
  "00898": {
    minutes: 150,
    note: "题型按南航大纲（单选、判断改错、简答、综合应用）；各题型的题量和分值是估计的。",
    sections: [
      { label: "单项选择题", type: "single", count: 20, points: 1 },
      { label: "判断改错题", type: "judge", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 6 },
      { label: "综合应用题", type: "short", forms: ["综合应用"], count: 2, points: 15 },
    ],
  },
};

export interface PaperItem {
  q: Question;
  section: string;
  points: number;
  /** 单选题选项的显示顺序 */
  order: number[];
}

export interface Paper {
  course: string;
  minutes: number;
  items: PaperItem[];
  maxScore: number;
}

/** 作答：单选存显示位置，判断存 true/false，填空存文字 */
export type Answer = number | boolean | string;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const matches = (q: Question, s: PaperSection) =>
  q.type === s.type && (!s.forms || (q.type === "short" && s.forms.includes(q.form)));

export function assemblePaper(course: string, exclude: Record<string, unknown> = {}, rand: () => number = Math.random): Paper | null {
  const bank = getBank(course);
  const spec = PAPERS[course];
  if (!bank || !spec) return null;
  const all = [...bank.questions.values()].filter((q) => !exclude[q.id]);
  const items: PaperItem[] = [];
  for (const s of spec.sections) {
    const pool = shuffle(all.filter((q) => matches(q, s)), rand).slice(0, s.count);
    for (const q of pool) items.push({ q, section: s.label, points: s.points, order: shuffledOrder(4) });
  }
  return { course, minutes: spec.minutes, items, maxScore: items.reduce((n, it) => n + it.points, 0) };
}

/** 题库里每个题型够不够组一套卷：返回各部分实际能抽到的题数 */
export function paperAvailability(course: string): { label: string; need: number; have: number }[] {
  const bank = getBank(course);
  const spec = PAPERS[course];
  if (!bank || !spec) return [];
  const all = [...bank.questions.values()];
  return spec.sections.map((s) => ({ label: s.label, need: s.count, have: all.filter((q) => matches(q, s)).length }));
}

/** 客观题判对错；没作答算错。主观题看自评 */
export function judgeItem(item: PaperItem, answer: Answer | undefined, rating?: Result): Result {
  const q = item.q;
  if (q.type === "short") return rating ?? "wrong";
  if (answer === undefined) return "wrong";
  if (q.type === "single") return typeof answer === "number" && item.order[answer] === q.answer ? "right" : "wrong";
  if (q.type === "judge") return answer === q.answer ? "right" : "wrong";
  return typeof answer === "string" && checkFill(answer, q.answers) ? "right" : "wrong";
}

export const itemScore = (item: PaperItem, r: Result) => (r === "right" ? item.points : r === "partial" ? item.points / 2 : 0);

export interface PaperScore {
  total: number;
  max: number;
  bySection: { label: string; score: number; max: number }[];
  results: Record<string, Result>;
}

export function scorePaper(paper: Paper, answers: Record<string, Answer>, ratings: Record<string, Result>): PaperScore {
  const results: Record<string, Result> = {};
  const sections = new Map<string, { score: number; max: number }>();
  let total = 0;
  for (const it of paper.items) {
    const r = judgeItem(it, answers[it.q.id], ratings[it.q.id]);
    results[it.q.id] = r;
    const s = itemScore(it, r);
    total += s;
    const sec = sections.get(it.section) ?? { score: 0, max: 0 };
    sec.score += s;
    sec.max += it.points;
    sections.set(it.section, sec);
  }
  return { total, max: paper.maxScore, bySection: [...sections].map(([label, v]) => ({ label, ...v })), results };
}
