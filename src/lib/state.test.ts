import { describe, expect, it } from "vitest";
import { checkFill } from "./answer";
import { createState, dueQuestions, finishLesson, finishReview, gradeQuestion, HEART_MAX, refresh, spendHeart, wrongQuestions } from "./state";

const at = (s: string) => new Date(s);

describe("连胜与请假卡", () => {
  it("连续两天学习，连胜 +1；同一天学多次不重复加", () => {
    const s = createState(at("2026-11-10T08:00:00"));
    finishLesson(s, { lessonId: "04751-u01-l1", course: "04751", accuracy: 1, xp: 15 }, at("2026-11-10T09:00:00"));
    finishLesson(s, { lessonId: "04751-u01-l2", course: "04751", accuracy: 1, xp: 15 }, at("2026-11-10T20:00:00"));
    expect(s.streak).toBe(1);
    const r = finishReview(s, { answered: 5, xp: 10 }, at("2026-11-11T07:30:00"));
    expect(r.streakUp).toBe(true);
    expect(s.streak).toBe(2);
    expect(s.bestStreak).toBe(2);
  });

  it("漏一天时自动用请假卡，连胜不断", () => {
    const s = createState(at("2026-11-10T08:00:00"));
    finishLesson(s, { lessonId: "a", course: "04751", accuracy: 1, xp: 10 }, at("2026-11-10T09:00:00"));
    expect(s.freezes).toBe(1);
    refresh(s, at("2026-11-12T08:00:00")); // 11 号没学
    expect(s.streak).toBe(1);
    expect(s.freezes).toBe(0);
    finishLesson(s, { lessonId: "b", course: "04751", accuracy: 1, xp: 10 }, at("2026-11-12T09:00:00"));
    expect(s.streak).toBe(2);
  });

  it("漏的天数超过请假卡，连胜清零", () => {
    const s = createState(at("2026-11-10T08:00:00"));
    finishLesson(s, { lessonId: "a", course: "04751", accuracy: 1, xp: 10 }, at("2026-11-10T09:00:00"));
    refresh(s, at("2026-11-13T08:00:00")); // 漏 11、12 两天，只有 1 张卡
    expect(s.streak).toBe(0);
    finishLesson(s, { lessonId: "b", course: "04751", accuracy: 1, xp: 10 }, at("2026-11-13T09:00:00"));
    expect(s.streak).toBe(1);
  });

  it("每周一送 1 张请假卡，最多攒 2 张", () => {
    const s = createState(at("2026-11-10T08:00:00")); // 周二
    refresh(s, at("2026-11-16T08:00:00")); // 下周一
    expect(s.freezes).toBe(2);
    refresh(s, at("2026-11-23T08:00:00"));
    expect(s.freezes).toBe(2);
  });
});

describe("体力", () => {
  it("答错扣体力，2 小时恢复 1 点，不超过上限", () => {
    const s = createState(at("2026-11-10T08:00:00"));
    spendHeart(s, at("2026-11-10T08:00:00"));
    spendHeart(s, at("2026-11-10T08:10:00"));
    expect(s.hearts).toBe(HEART_MAX - 2);
    refresh(s, at("2026-11-10T10:05:00"));
    expect(s.hearts).toBe(HEART_MAX - 1);
    refresh(s, at("2026-11-10T20:00:00"));
    expect(s.hearts).toBe(HEART_MAX);
  });

  it("关掉体力机制后不扣", () => {
    const s = createState();
    s.settings.hearts = false;
    spendHeart(s);
    expect(s.hearts).toBe(HEART_MAX);
  });
});

describe("复习队列", () => {
  it("答错的题很快到期、进错题本；标记有问题的题不进复习", () => {
    const s = createState(at("2026-11-10T08:00:00"));
    const now = at("2026-11-10T09:00:00");
    gradeQuestion(s, "04751-u01-l1-q1", "wrong", now);
    gradeQuestion(s, "04751-u01-l1-q2", "right", now);
    gradeQuestion(s, "04735-u01-l1-q1", "wrong", now);
    const later = at("2026-11-10T09:30:00");
    expect(dueQuestions(s, later)).toContain("04751-u01-l1-q1");
    expect(dueQuestions(s, later, "04751")).not.toContain("04735-u01-l1-q1");
    expect(wrongQuestions(s)).toEqual(expect.arrayContaining(["04751-u01-l1-q1", "04735-u01-l1-q1"]));
    s.flags["04751-u01-l1-q1"] = later.toISOString();
    expect(dueQuestions(s, later)).not.toContain("04751-u01-l1-q1");
  });

  it("首次学完一课计入当天新课数，重学不重复计", () => {
    const s = createState(at("2026-11-10T08:00:00"));
    const first = finishLesson(s, { lessonId: "x", course: "04735", accuracy: 0.8, xp: 12 }, at("2026-11-10T09:00:00"));
    const again = finishLesson(s, { lessonId: "x", course: "04735", accuracy: 1, xp: 15 }, at("2026-11-10T10:00:00"));
    expect(first.firstTime).toBe(true);
    expect(again.firstTime).toBe(false);
    expect(s.days["2026-11-10"].fresh["04735"]).toBe(1);
    expect(s.lessons.x).toMatchObject({ times: 2, best: 1 });
    expect(s.xp).toBe(27);
  });
});

describe("填空判分", () => {
  it("忽略空格、大小写、全角半角", () => {
    expect(checkFill(" 主键 ", ["主码", "主键"])).toBe(true);
    expect(checkFill("Primary Key", ["primary key"])).toBe(true);
    expect(checkFill("ＳＱＬ", ["SQL"])).toBe(true);
    expect(checkFill("外码", ["主码", "主键"])).toBe(false);
    expect(checkFill("   ", ["主码"])).toBe(false);
  });

  it("保留括号和小数点，公式不会误判", () => {
    expect(checkFill("n+1/2", ["(n+1)/2"])).toBe(false);
    expect(checkFill("(n+1)/2", ["(n+1)/2"])).toBe(true);
    expect(checkFill("15", ["1.5"])).toBe(false);
    expect(checkFill("1.5", ["1.5"])).toBe(true);
    expect(checkFill("mysqluser", ["mysql.user"])).toBe(false);
  });

  it("分隔符和中文括号里的另一种叫法都宽容", () => {
    expect(checkFill("原子性，一致性", ["原子性、一致性"])).toBe(true);
    expect(checkFill("15 31", ["15,31"])).toBe(true);
    expect(checkFill("第一范式", ["第一范式（1NF）"])).toBe(true);
    expect(checkFill("1NF", ["第一范式（1NF）"])).toBe(true);
    expect(checkFill("第二范式", ["第一范式（1NF）"])).toBe(false);
    expect(checkFill("主键。", ["主键"])).toBe(true);
    expect(checkFill("-1/2", ["−1/2"])).toBe(true);
  });

  it("答案带英文引号时引号要一致，iPhone 的弯引号也算；不带引号的答案仍忽略引号", () => {
    expect(checkFill("ch - '0'", ["ch - '0'"])).toBe(true);
    expect(checkFill("ch-0", ["ch - '0'"])).toBe(false);
    expect(checkFill("ch - ‘0’", ["ch - '0'"])).toBe(true);
    expect(checkFill('"r"', ['"r"'])).toBe(true);
    expect(checkFill("r", ['"r"'])).toBe(false);
    expect(checkFill("'r'", ['"r"'])).toBe(false);
    expect(checkFill("“r”", ['"r"'])).toBe(true);
    expect(checkFill('"%d"', ["%d"])).toBe(true);
    expect(checkFill("\\0", ["'\\0'", "\\0", "空字符"])).toBe(true);
    expect(checkFill("'0'", ["'\\0'", "\\0", "空字符"])).toBe(false);
    expect(checkFill("“三个代表”", ["三个代表"])).toBe(true);
  });

  it("程序填空（代码里有空）：引号一律要一致；读程序写结果仍宽松", () => {
    const blank = "if (n > 0 && s[n - 1] == '\\n')\n  ______;";
    const answers = ["s[n - 1] = '\\0'", "s[n - 1] = 0"];
    expect(checkFill("s[n-1]=0", answers, blank)).toBe(true);
    expect(checkFill("s[n-1]='\\0'", answers, blank)).toBe(true);
    expect(checkFill("s[n-1]='0'", answers, blank)).toBe(false);
    expect(checkFill("s[n-1]=‘0’", answers, blank)).toBe(false);
    expect(checkFill('"%d"', ["%d"], 'printf("______", x);')).toBe(false);
    expect(checkFill(" i < N ", ["i<n"], "for (i = 0; ______; i++)")).toBe(true);
    const program = "int main(void) { printf(\"50%%\"); }";
    expect(checkFill("“算术异常”", ["算术异常"], program)).toBe(true);
    expect(checkFill('"50%"', ["50%"], program)).toBe(true);
  });
});
