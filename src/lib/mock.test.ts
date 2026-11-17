import { describe, expect, it } from "vitest";
import type { Question } from "../data/types";
import { assemblePaper, PAPERS, scorePaper, type Paper } from "./mock";

describe("模拟考试组卷", () => {
  it("按试卷结构抽题：题型对得上、不重复、不超过每部分的题量", () => {
    for (const course of Object.keys(PAPERS)) {
      const paper = assemblePaper(course);
      expect(paper).not.toBeNull();
      const ids = paper!.items.map((it) => it.q.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of PAPERS[course].sections) {
        const part = paper!.items.filter((it) => it.section === s.label);
        expect(part.length).toBeLessThanOrEqual(s.count);
        expect(part.length).toBeGreaterThan(0);
        for (const it of part) {
          expect(it.q.type).toBe(s.type);
          if (s.forms && it.q.type === "short") expect(s.forms).toContain(it.q.form);
          expect(it.points).toBe(s.points);
        }
      }
      expect(paper!.maxScore).toBe(paper!.items.reduce((n, it) => n + it.points, 0));
    }
  });

  it("04735 题库够组满一整套 100 分的卷", () => {
    expect(assemblePaper("04735")!.maxScore).toBe(100);
  });

  it("标记有问题的题不进试卷", () => {
    const first = assemblePaper("04735")!;
    const flagged = Object.fromEntries(first.items.map((it) => [it.q.id, "x"]));
    const second = assemblePaper("04735", flagged)!;
    expect(second.items.some((it) => flagged[it.q.id])).toBe(false);
  });
});

describe("模拟考试计分", () => {
  const base = { level: "识记" as const, kp: "k", explain: "e" };
  const qs: Question[] = [
    { ...base, id: "t-u01-l1-q1", type: "single", stem: "单选", options: ["a", "b", "c", "d"], answer: 2 },
    { ...base, id: "t-u01-l1-q2", type: "judge", stem: "判断", answer: false, fix: "改" },
    { ...base, id: "t-u01-l1-q3", type: "fill", stem: "填____", answers: ["主码"] },
    { ...base, id: "t-u01-l1-q4", type: "short", form: "简答", stem: "简答", points: ["p1", "p2"] },
    { ...base, id: "t-u01-l1-q5", type: "single", stem: "没作答", options: ["a", "b", "c", "d"], answer: 0 },
  ];
  const paper: Paper = {
    course: "t",
    minutes: 150,
    maxScore: 2 + 2 + 1 + 6 + 2,
    items: [
      { q: qs[0], section: "单选", points: 2, order: [3, 2, 1, 0] }, // 显示位置 1 对应原选项 2（正确）
      { q: qs[1], section: "判断", points: 2, order: [0, 1, 2, 3] },
      { q: qs[2], section: "填空", points: 1, order: [0, 1, 2, 3] },
      { q: qs[3], section: "简答", points: 6, order: [0, 1, 2, 3] },
      { q: qs[4], section: "单选", points: 2, order: [0, 1, 2, 3] },
    ],
  };

  it("客观题按显示顺序判分、没作答算错，主观题按自评给满分 / 一半 / 0", () => {
    const s = scorePaper(paper, { "t-u01-l1-q1": 1, "t-u01-l1-q2": false, "t-u01-l1-q3": " 主码 " }, { "t-u01-l1-q4": "partial" });
    expect(s.results).toEqual({ "t-u01-l1-q1": "right", "t-u01-l1-q2": "right", "t-u01-l1-q3": "right", "t-u01-l1-q4": "partial", "t-u01-l1-q5": "wrong" });
    expect(s.total).toBe(2 + 2 + 1 + 3 + 0);
    expect(s.bySection.find((x) => x.label === "单选")).toEqual({ label: "单选", score: 2, max: 4 });
  });

  it("单选选了错的显示位置判错", () => {
    const s = scorePaper(paper, { "t-u01-l1-q1": 2 }, {});
    expect(s.results["t-u01-l1-q1"]).toBe("wrong");
  });
});
