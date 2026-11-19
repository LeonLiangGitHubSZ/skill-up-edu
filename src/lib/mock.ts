// 模拟考试：按试卷结构从题库抽题组卷、交卷后计分
import { getBank } from "../data/banks";
import type { Question, QuestionType, ShortQuestion } from "../data/types";
import { checkFill, optionOrder } from "./answer";
import type { Result } from "./srs";

export interface PaperSection {
  label: string;
  type: QuestionType | QuestionType[];
  /** 主观题按 form 区分题型 */
  forms?: ShortQuestion["form"][];
  /** 按代码区分：none 不带代码；program 带完整程序（程序分析）；blank 代码里有 ______（程序填充） */
  code?: "none" | "program" | "blank";
  /** 只从这几课抽题（课的 id，如 "13000-u90-l1"）：题型相同、材料类型不同时用（英语的阅读选择和完形填空都是单选） */
  lessons?: string[];
  /** 整课抽：同一篇材料的题放在一起、按原顺序，不和别的材料混排（阅读理解、完形填空） */
  whole?: boolean;
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
  "13013": {
    minutes: 150,
    note: "题量按 2023 年 10 月 13013 真题；程序填充、程序设计的分值是估计的（程序填充每空 2 分，按 9 空计）。",
    sections: [
      { label: "单项选择题", type: "single", code: "none", count: 15, points: 2 },
      { label: "填空题", type: "fill", code: "none", count: 10, points: 2 },
      { label: "程序分析题", type: ["single", "fill"], code: "program", count: 4, points: 4 },
      { label: "程序填充题", type: ["single", "fill"], code: "blank", count: 9, points: 2 },
      { label: "程序设计题", type: "short", forms: ["程序设计"], count: 2, points: 8 },
    ],
  },
  "02324": {
    minutes: 150,
    note: "全国统考题型：单选、填空、计算、证明、综合应用；各题型的题量和分值是估计的。",
    sections: [
      { label: "单项选择题", type: "single", count: 15, points: 1 },
      { label: "填空题", type: "fill", count: 10, points: 2 },
      { label: "计算题", type: "short", forms: ["计算"], count: 5, points: 6 },
      { label: "证明题", type: "short", forms: ["证明"], count: 3, points: 7 },
      { label: "综合应用题", type: "short", forms: ["综合应用"], count: 2, points: 7 },
    ],
  },
  "13180": {
    minutes: 150,
    note: "题型和分值参照旧课程 02323 / 02326 的试卷估计：单选、填空、简答、综合（计算与 P/V 应用）。",
    sections: [
      { label: "单项选择题", type: "single", count: 20, points: 1 },
      { label: "填空题", type: "fill", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 4 },
      { label: "综合题", type: "short", forms: ["计算", "综合应用"], count: 4, points: 10 },
    ],
  },
  "13015": {
    minutes: 150,
    note: "题型、题量和分值都是估计的：单选、填空、简答、综合应用（分析计算）。",
    sections: [
      { label: "单项选择题", type: "single", count: 15, points: 2 },
      { label: "填空题", type: "fill", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 4 },
      { label: "综合应用题", type: "short", forms: ["计算", "综合应用"], count: 3, points: 10 },
    ],
  },
  "13003": {
    minutes: 150,
    note: "题型和分值参照原全国统考 02331 数据结构的试卷估计：单选、填空、解答（应用）、算法阅读、算法设计。",
    sections: [
      { label: "单项选择题", type: "single", code: "none", count: 15, points: 2 },
      { label: "填空题", type: "fill", code: "none", count: 10, points: 2 },
      { label: "解答题", type: "short", forms: ["综合应用", "简答"], count: 4, points: 5 },
      { label: "算法阅读题", type: ["single", "fill"], code: "program", count: 4, points: 5 },
      { label: "算法设计题", type: "short", forms: ["程序设计"], count: 1, points: 10 },
    ],
  },
  "15044": {
    minutes: 150,
    note: "题型和分值参照旧课程 03709 的试卷估计：单选、多选、简答、论述（含材料分析）。",
    sections: [
      { label: "单项选择题", type: "single", count: 30, points: 1 },
      { label: "多项选择题", type: "multi", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 6 },
      { label: "论述题", type: "short", forms: ["论述", "材料分析"], count: 2, points: 10 },
    ],
  },
  "04747": {
    minutes: 150,
    note: "题型按南航大纲（单选、填空、简答、程序改错、程序分析、程序设计）；各题型的题量和分值是估计的。",
    sections: [
      { label: "单项选择题", type: "single", code: "none", count: 10, points: 1 },
      { label: "填空题", type: "fill", code: "none", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 6, points: 3 },
      { label: "程序改错题", type: "short", forms: ["程序改错"], count: 4, points: 5 },
      { label: "程序分析题", type: ["single", "fill"], code: "program", count: 4, points: 4 },
      { label: "程序设计题", type: "short", forms: ["程序设计"], count: 2, points: 8 },
    ],
  },
  "00023": {
    minutes: 150,
    note: "题型和分值按往年 00023 试卷估计（2023 年换新教材后可能有变化）：单选、填空、计算、综合。",
    sections: [
      { label: "单项选择题", type: "single", count: 5, points: 3 },
      { label: "填空题", type: "fill", count: 5, points: 2 },
      { label: "计算题", type: "short", forms: ["计算"], count: 12, points: 5 },
      { label: "综合题", type: "short", forms: ["综合应用", "证明"], count: 3, points: 5 },
    ],
  },
  "02333": {
    minutes: 150,
    note: "题型按南航大纲（单选、名词解释、简答、综合应用）；各题型的题量和分值是估计的。",
    sections: [
      { label: "单项选择题", type: "single", count: 20, points: 1 },
      { label: "名词解释题", type: "short", forms: ["名词解释"], count: 5, points: 3 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 5 },
      { label: "综合应用题", type: "short", forms: ["综合应用"], count: 4, points: 10 },
    ],
  },
  "15043": {
    minutes: 150,
    note: "题型和分值参照旧课程 03708 的试卷估计：单选、多选、简答、论述（含材料分析）。",
    sections: [
      { label: "单项选择题", type: "single", count: 30, points: 1 },
      { label: "多项选择题", type: "multi", count: 10, points: 2 },
      { label: "简答题", type: "short", forms: ["简答"], count: 5, points: 6 },
      { label: "论述题", type: "short", forms: ["论述", "材料分析"], count: 2, points: 10 },
    ],
  },
  "13000": {
    minutes: 150,
    note: "题型和分值参照英语（二）00015（2012 年版）的试卷估计；阅读、填空类每部分整篇抽一篇材料。",
    sections: [
      { label: "阅读判断", type: "single", lessons: ["13000-u90-l1", "13000-u90-l2"], whole: true, count: 10, points: 1 },
      { label: "阅读选择", type: "single", lessons: ["13000-u90-l3", "13000-u90-l4"], whole: true, count: 5, points: 2 },
      { label: "概括段落大意和补全句子", type: "single", lessons: ["13000-u90-l5", "13000-u90-l6"], whole: true, count: 10, points: 1 },
      { label: "填句补文", type: "single", lessons: ["13000-u91-l5"], whole: true, count: 5, points: 2 },
      { label: "填词补文", type: "fill", lessons: ["13000-u91-l3", "13000-u91-l4"], whole: true, count: 10, points: 1.5 },
      { label: "完形填空", type: "single", lessons: ["13000-u91-l1", "13000-u91-l2"], whole: true, count: 10, points: 1.5 },
      { label: "英译汉", type: "short", forms: ["翻译"], whole: true, count: 5, points: 3 },
      { label: "写作", type: "short", forms: ["写作"], count: 1, points: 15 },
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

/** 作答：单选存显示位置，多选存显示位置数组，判断存 true/false，填空存文字 */
export type Answer = number | boolean | string | number[];

function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const BLANK = /_{4,}/;

/** 题目 id 去掉末尾的 -qN 就是课的 id */
export const lessonOf = (id: string) => id.replace(/-q\d+$/, "");

function matches(q: Question, s: PaperSection): boolean {
  const types = Array.isArray(s.type) ? s.type : [s.type];
  if (!types.includes(q.type)) return false;
  if (s.lessons && !s.lessons.includes(lessonOf(q.id))) return false;
  if (s.forms && !(q.type === "short" && s.forms.includes(q.form))) return false;
  if (s.code === "none") return !q.code;
  if (s.code === "program") return !!q.code && !BLANK.test(q.code);
  if (s.code === "blank") return !!q.code && BLANK.test(q.code);
  return true;
}

/** 随机选一课、按原顺序取题；优先选题量够一整部分的课，不够时再用下一课补齐 */
function pickWhole(questions: Question[], count: number, rand: () => number): Question[] {
  const byLesson = new Map<string, Question[]>();
  for (const q of questions) {
    const key = lessonOf(q.id);
    byLesson.set(key, [...(byLesson.get(key) ?? []), q]);
  }
  const groups = shuffle([...byLesson.values()], rand);
  groups.sort((a, b) => Number(b.length >= count) - Number(a.length >= count)); // 稳定排序：同一档里保持随机顺序
  return groups.flat().slice(0, count);
}

export function assemblePaper(course: string, exclude: Record<string, unknown> = {}, rand: () => number = Math.random): Paper | null {
  const bank = getBank(course);
  const spec = PAPERS[course];
  if (!bank || !spec) return null;
  const all = [...bank.questions.values()].filter((q) => !exclude[q.id]);
  const items: PaperItem[] = [];
  for (const s of spec.sections) {
    const matched = all.filter((q) => matches(q, s));
    const pool = s.whole ? pickWhole(matched, s.count, rand) : shuffle(matched, rand).slice(0, s.count);
    for (const q of pool) items.push({ q, section: s.label, points: s.points, order: optionOrder(q) });
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
  if (q.type === "multi") {
    if (!Array.isArray(answer)) return "wrong";
    const chosen = answer.map((i) => item.order[i]).sort((a, b) => a - b);
    return chosen.length === q.answer.length && chosen.every((v, k) => v === q.answer[k]) ? "right" : "wrong";
  }
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
