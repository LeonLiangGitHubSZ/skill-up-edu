import type { Lesson, Question, Unit } from "./types";

// 题库随应用一起打包（总量几百 KB），离线可用
const modules = import.meta.glob<Unit>("./banks/*/u*.json", { eager: true, import: "default" });

export interface Bank {
  course: string;
  units: Unit[];
  lessons: Lesson[];
  questions: Map<string, Question>;
  /** 题目 id -> 所在单元标题 */
  unitOf: Map<string, Unit>;
}

const banks = new Map<string, Bank>();
for (const unit of Object.values(modules)) {
  let bank = banks.get(unit.course);
  if (!bank) {
    bank = { course: unit.course, units: [], lessons: [], questions: new Map(), unitOf: new Map() };
    banks.set(unit.course, bank);
  }
  bank.units.push(unit);
}
for (const bank of banks.values()) {
  bank.units.sort((a, b) => a.unit - b.unit);
  for (const unit of bank.units) {
    for (const lesson of unit.lessons) {
      bank.lessons.push(lesson);
      for (const q of lesson.questions) {
        bank.questions.set(q.id, q);
        bank.unitOf.set(q.id, unit);
      }
    }
  }
}

export const getBank = (course: string): Bank | undefined => banks.get(course);

export function findQuestion(id: string): Question | undefined {
  const course = id.split("-")[0];
  return banks.get(course)?.questions.get(id);
}
