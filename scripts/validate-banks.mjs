#!/usr/bin/env node
// 校验题库：node scripts/validate-banks.mjs [课程代码...]
// 退出码 0 = 没有错误（警告不影响退出码）。
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BANKS = join(dirname(fileURLToPath(import.meta.url)), "../src/data/banks");
const LEVELS = ["识记", "领会", "应用"];
const FORMS = ["简答", "论述", "设计", "综合应用"];
const LETTERS = "ABCD";

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

const courses = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(BANKS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const summary = [];
for (const course of courses) {
  const dir = join(BANKS, course);
  if (!existsSync(dir)) { err(course, "目录不存在"); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const ids = new Set();
  const stems = new Map();
  const answerCount = [0, 0, 0, 0];
  const typeCount = {};
  let lessonTotal = 0;
  let questionTotal = 0;

  for (const file of files) {
    const where = `${course}/${file}`;
    let unit;
    try { unit = JSON.parse(readFileSync(join(dir, file), "utf8")); } catch (e) { err(where, `JSON 解析失败：${e.message}`); continue; }
    const m = /^u(\d{2})\.json$/.exec(file);
    if (!m) { err(where, "文件名应为 uNN.json"); continue; }
    const nn = m[1];
    if (unit.course !== course) err(where, `course 应为 "${course}"`);
    if (unit.unit !== Number(nn)) err(where, `unit 应为 ${Number(nn)}`);
    if (!nonEmpty(unit.title)) err(where, "缺少 title");
    if (unit.unit >= 90 && !String(unit.title).startsWith("专项：")) err(where, "专项单元（unit ≥ 90）的 title 应以「专项：」开头");
    if (!Array.isArray(unit.lessons) || unit.lessons.length === 0) { err(where, "lessons 为空"); continue; }

    unit.lessons.forEach((lesson, li) => {
      const lw = `${where} 第${li + 1}课`;
      const lessonId = `${course}-u${nn}-l${li + 1}`;
      if (lesson.id !== lessonId) err(lw, `id 应为 ${lessonId}（实际 ${lesson.id}）`);
      if (!nonEmpty(lesson.title)) err(lw, "缺少 title");
      if (!Array.isArray(lesson.questions)) { err(lw, "questions 不是数组"); return; }
      if (lesson.questions.length < 5 || lesson.questions.length > 10) err(lw, `每课 5–10 题（实际 ${lesson.questions.length}）`);
      const shortCount = lesson.questions.filter((q) => q.type === "short").length;
      if (shortCount > 2 && unit.unit < 90) warn(lw, `主观题 ${shortCount} 道，建议每课不超过 2 道`);
      lessonTotal++;

      lesson.questions.forEach((q, qi) => {
        const qw = `${lw} 第${qi + 1}题`;
        const qid = `${lessonId}-q${qi + 1}`;
        questionTotal++;
        if (q.id !== qid) err(qw, `id 应为 ${qid}（实际 ${q.id}）`);
        if (ids.has(q.id)) err(qw, `id 重复：${q.id}`);
        ids.add(q.id);
        typeCount[q.type] = (typeCount[q.type] ?? 0) + 1;
        if (!nonEmpty(q.stem)) err(qw, "缺少 stem");
        if (!LEVELS.includes(q.level)) err(qw, `level 应为 ${LEVELS.join("/")}`);
        if (!nonEmpty(q.kp)) err(qw, "缺少 kp");
        if (!nonEmpty(q.explain)) err(qw, "缺少 explain");
        if (q.code !== undefined && !nonEmpty(q.code)) err(qw, "code 为空字符串");
        if (q.verify !== undefined && !nonEmpty(q.verify)) err(qw, "verify 为空字符串");
        const key = (q.stem ?? "").replace(/\s+/g, "");
        if (stems.has(key)) err(qw, `题干与 ${stems.get(key)} 重复`);
        stems.set(key, q.id);
        if (q.type !== "short" && (q.stem ?? "").length > 150) warn(qw, `题干 ${q.stem.length} 字，手机上偏长`);

        switch (q.type) {
          case "single": {
            if (!Array.isArray(q.options) || q.options.length !== 4) { err(qw, "单选题需要 4 个选项"); break; }
            q.options.forEach((o, oi) => {
              if (!nonEmpty(o)) err(qw, `选项 ${LETTERS[oi]} 为空`);
              else if (/^\s*[A-DＡ-Ｄ][.．、:：)）\s]/.test(o)) err(qw, `选项 ${LETTERS[oi]} 不要带字母前缀`);
              else if (o.length > 60) warn(qw, `选项 ${LETTERS[oi]} ${o.length} 字，偏长`);
            });
            if (new Set(q.options.map((o) => String(o).trim())).size !== 4) err(qw, "选项有重复");
            if (![0, 1, 2, 3].includes(q.answer)) err(qw, "answer 应为 0–3");
            else answerCount[q.answer]++;
            if (q.options.some((o) => /以上(都|均|全)/.test(o))) warn(qw, "尽量不用「以上都…」选项");
            break;
          }
          case "judge":
            if (typeof q.answer !== "boolean") err(qw, "判断题 answer 应为 true/false");
            if (q.answer === false && !nonEmpty(q.fix)) err(qw, "答案为错时必须给 fix（改错）");
            if (q.answer === true && q.fix !== undefined) err(qw, "答案为对时不要给 fix");
            break;
          case "fill":
            if ((q.stem.match(/_{4}/g) ?? []).length !== 1) err(qw, "填空题题干里应恰好有一个 ____");
            if (!Array.isArray(q.answers) || q.answers.length === 0 || !q.answers.every(nonEmpty)) err(qw, "answers 不能为空");
            break;
          case "short":
            if (!FORMS.includes(q.form)) err(qw, `form 应为 ${FORMS.join("/")}`);
            if (!Array.isArray(q.points) || q.points.length < 2 || q.points.length > 6 || !q.points.every(nonEmpty)) err(qw, "points 需要 2–6 条");
            if (q.answer !== undefined && !nonEmpty(q.answer)) err(qw, "answer 为空字符串");
            break;
          default:
            err(qw, `未知题型 ${q.type}`);
        }
      });
    });
  }

  const singles = answerCount.reduce((a, b) => a + b, 0);
  if (singles >= 20) {
    answerCount.forEach((n, i) => {
      if (n / singles > 0.4) warn(course, `单选题答案 ${LETTERS[i]} 占 ${Math.round((n / singles) * 100)}%，分布不均`);
    });
  }
  summary.push(`${course}: ${files.length} 章 ${lessonTotal} 课 ${questionTotal} 题 ${JSON.stringify(typeCount)} 单选答案分布 ${answerCount.map((n, i) => LETTERS[i] + n).join(" ")}`);
}

for (const s of summary) console.log(s);
if (warnings.length) console.log(`\n警告 ${warnings.length} 条：\n` + warnings.slice(0, 50).join("\n") + (warnings.length > 50 ? "\n…" : ""));
if (errors.length) {
  console.log(`\n错误 ${errors.length} 条：\n` + errors.slice(0, 80).join("\n") + (errors.length > 80 ? "\n…" : ""));
  process.exit(1);
}
console.log("\n校验通过");
