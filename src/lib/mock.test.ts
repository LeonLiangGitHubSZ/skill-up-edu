import { describe, expect, it } from "vitest";
import { getBank } from "../data/banks";
import type { Question } from "../data/types";
import { assemblePaper, lessonOf, PAPERS, scorePaper, type Paper } from "./mock";

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
          expect(Array.isArray(s.type) ? s.type : [s.type]).toContain(it.q.type);
          if (s.forms && it.q.type === "short") expect(s.forms).toContain(it.q.form);
          if (s.code === "none") expect(it.q.code).toBeUndefined();
          if (s.code === "program") expect(it.q.code ?? "").not.toMatch(/_{4,}/);
          if (s.code === "blank") expect(it.q.code ?? "").toMatch(/_{4,}/);
          if (s.lessons) expect(s.lessons).toContain(lessonOf(it.q.id));
          expect(it.points).toBe(s.points);
        }
      }
      expect(paper!.maxScore).toBe(paper!.items.reduce((n, it) => n + it.points, 0));
    }
  });

  it("已配置的课程题库够组满一整套 100 分的卷", () => {
    for (const course of ["04735", "13013", "02324", "13180", "13015", "13003", "15044", "04747", "00023", "02333", "15043", "13000"]) expect(assemblePaper(course)!.maxScore).toBe(100);
  });

  it("整课抽：同一篇材料的题连在一起、按原顺序；有题量够一整部分的课时只用这一课", () => {
    for (const [course, spec] of Object.entries(PAPERS)) {
      const bank = getBank(course)!;
      for (const s of spec.sections.filter((x) => x.whole)) {
        const types = Array.isArray(s.type) ? s.type : [s.type];
        const sizes = new Map<string, number>();
        for (const q of bank.questions.values()) {
          const l = lessonOf(q.id);
          if (types.includes(q.type) && (!s.lessons || s.lessons.includes(l))) sizes.set(l, (sizes.get(l) ?? 0) + 1);
        }
        const enough = [...sizes.values()].some((n) => n >= s.count);
        for (let k = 0; k < 20; k++) {
          const ids = assemblePaper(course)!.items.filter((it) => it.section === s.label).map((it) => it.q.id);
          const runs: string[][] = [];
          for (const id of ids) {
            const last = runs.at(-1);
            if (last && lessonOf(last[0]) === lessonOf(id)) last.push(id);
            else runs.push([id]);
          }
          expect(new Set(runs.map((r) => lessonOf(r[0]))).size).toBe(runs.length);
          for (const r of runs) {
            const n = r.map((id) => Number(/-q(\d+)$/.exec(id)![1]));
            expect(n).toEqual([...n].sort((a, b) => a - b));
          }
          if (enough) expect(runs.length).toBe(1);
        }
      }
    }
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

  it("多选题全部选对才得分，少选、多选都不得分", () => {
    const q: Question = { level: "识记", kp: "k", explain: "e", id: "t-u01-l1-q9", type: "multi", stem: "多选", options: ["a", "b", "c", "d", "e"], answer: [0, 2, 3] };
    const p: Paper = { course: "t", minutes: 150, maxScore: 2, items: [{ q, section: "多选", points: 2, order: [4, 3, 2, 1, 0] }] };
    // 显示顺序 [e, d, c, b, a]：原选项 0、2、3 在显示位置 4、2、1
    expect(scorePaper(p, { "t-u01-l1-q9": [4, 2, 1] }, {}).total).toBe(2);
    expect(scorePaper(p, { "t-u01-l1-q9": [4, 2] }, {}).total).toBe(0);
    expect(scorePaper(p, { "t-u01-l1-q9": [4, 2, 1, 0] }, {}).total).toBe(0);
  });

  it("单选选了错的显示位置判错", () => {
    const s = scorePaper(paper, { "t-u01-l1-q1": 2 }, {});
    expect(s.results["t-u01-l1-q1"]).toBe("wrong");
  });
});
