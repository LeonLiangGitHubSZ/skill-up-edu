// 哪些课计入每天的目标：有题库、并且在路线页标成“备考”的课
import { getBank } from "../data/banks";
import { STUDY_PLAN } from "../data/program";
import type { AppState } from "./state";

/** 有题库的课程（按 STUDY_PLAN 的顺序） */
export const bankCourses = (): string[] => STUDY_PLAN.map((p) => p.code).filter((c) => getBank(c));

/** 正在备考的课程；一门都没标时退回当前选中的课 */
export function studyingCourses(s: AppState): string[] {
  const list = bankCourses().filter((c) => s.courses[c]?.status === "studying");
  return list.length ? list : [s.settings.active].filter((c) => getBank(c));
}
