// 题库数据格式。题库文件放在 src/data/banks/<课程代码>/uNN.json，每个文件是一章（单元）。
// 校验脚本：node scripts/validate-banks.mjs

export type Level = "识记" | "领会" | "应用";

interface QuestionBase {
  /** 全局唯一：<课程>-uNN-l<课序>-q<题序>，例如 04751-u01-l1-q3 */
  id: string;
  /** 题干，纯文本；需要换行用 \n */
  stem: string;
  /** 可选：题干下方的代码 / SQL，等宽显示 */
  code?: string;
  /** 能力层次，取自考试大纲 */
  level: Level;
  /** 知识点，尽量用大纲里的说法 */
  kp: string;
  /** 解析：为什么这样答，1–3 句 */
  explain: string;
  /** 可选：出题时没把握、需要对照教材核实的地方 */
  verify?: string;
}

/** 单项选择题：4 个选项，选项文字不带 A/B/C/D 前缀（界面会加） */
export interface SingleQuestion extends QuestionBase {
  type: "single";
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

/** 判断改错题：answer=false 时必须给 fix（怎么改） */
export interface JudgeQuestion extends QuestionBase {
  type: "judge";
  answer: boolean;
  fix?: string;
}

/** 填空题：题干里恰好一个 ____，answers 是可接受的写法 */
export interface FillQuestion extends QuestionBase {
  type: "fill";
  answers: string[];
}

/** 主观题（简答 / 论述 / 设计 / 综合应用）：先自己想，再看要点自评 */
export interface ShortQuestion extends QuestionBase {
  type: "short";
  form: "简答" | "论述" | "设计" | "综合应用";
  /** 得分要点，2–6 条 */
  points: string[];
  /** 可选：完整参考答案（代码、SQL 等） */
  answer?: string;
}

export type Question = SingleQuestion | JudgeQuestion | FillQuestion | ShortQuestion;
export type QuestionType = Question["type"];

export interface Lesson {
  /** <课程>-uNN-l<课序> */
  id: string;
  title: string;
  questions: Question[];
}

export interface Unit {
  course: string;
  /** 章号，和教材 / 大纲一致 */
  unit: number;
  title: string;
  lessons: Lesson[];
}
