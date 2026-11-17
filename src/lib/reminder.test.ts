import { describe, expect, it } from "vitest";
import { reminderSummary } from "./reminder";
import { createState, finishLesson, gradeQuestion } from "./state";

describe("学习提醒的摘要", () => {
  it("汇总 3 门课今天的目标和已完成课数、连胜、到期复习题和最近的考试", () => {
    const now = new Date("2026-11-20T09:00:00");
    const s = createState(new Date("2026-11-18T08:00:00"));
    finishLesson(s, { lessonId: "04735-u01-l1", course: "04735", accuracy: 1, xp: 15 }, new Date("2026-11-19T20:00:00"));
    finishLesson(s, { lessonId: "04735-u01-l2", course: "04735", accuracy: 1, xp: 15 }, new Date("2026-11-20T08:00:00"));
    gradeQuestion(s, "04751-u01-l1-q1", "wrong", new Date("2026-11-20T08:10:00"));
    const r = reminderSummary(s, now);
    expect(r.day).toBe("2026-11-20");
    expect(r.goal).toBeGreaterThanOrEqual(3);
    expect(r.done).toBe(1);
    expect(r.streak).toBe(2);
    expect(r.due).toBe(1);
    expect(r.next).toEqual({ name: "网络安全", daysLeft: 50 });
  });
});
