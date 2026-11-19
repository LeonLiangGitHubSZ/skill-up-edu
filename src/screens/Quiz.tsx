import { useMemo, useRef, useState } from "react";
import type { Lesson, Question } from "../data/types";
import { courseByCode } from "../data/program";
import { checkFill, optionOrder } from "../lib/answer";
import { coursePace, daysSavedByLesson } from "../lib/pace";
import { sounds } from "../lib/sound";
import { nextCard, type CardRec, type Result } from "../lib/srs";
import { finishLesson, finishReview, gainHeart, gradeQuestion, HEART_MAX, spendHeart } from "../lib/state";
import { useStore } from "../store";

export type QuizSpec =
  | { mode: "lesson"; course: string; lesson: Lesson }
  | { mode: "review"; title: string; questions: Question[] };

interface Item {
  q: Question;
  retry: boolean;
  order: number[];
}

type Phase = "answer" | "feedback" | "reveal" | "noHearts" | "done";

const LETTERS = "ABCDE";
const TYPE_LABEL: Record<Question["type"], string> = { single: "单项选择", multi: "多项选择", judge: "判断改错", fill: "填空", short: "" };

const makeItem = (q: Question, retry = false): Item => ({ q, retry, order: optionOrder(q) });

interface Summary {
  xp: number;
  accuracy: number;
  streak: number;
  streakUp: boolean;
  saved: number;
  answered: number;
}

export function Quiz({ spec, onExit }: { spec: QuizSpec; onExit: (goReview?: boolean) => void }) {
  const { state, update } = useStore();
  const initial = useMemo(() => (spec.mode === "lesson" ? spec.lesson.questions : spec.questions).map((q) => makeItem(q)), [spec]);
  const heartsOn = spec.mode === "lesson" && state.settings.hearts;
  const [queue, setQueue] = useState<Item[]>(initial);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => (heartsOn && state.hearts <= 0 ? "noHearts" : "answer"));
  const [picked, setPicked] = useState<number | boolean | number[] | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [combo, setCombo] = useState(0);
  const [toast, setToast] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const seen = useRef(new Set<string>());
  const tally = useRef({ firstRight: 0, firstTotal: 0, right: 0, answered: 0 });
  const cardBefore = useRef<CardRec | undefined>(undefined);
  /** 本题作答后剩余体力（state 要等下一次渲染才更新，这里先算好） */
  const heartsAfter = useRef(state.hearts);

  const item = queue[pos];
  const q = item?.q;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  };

  function submit(r: Result) {
    const first = !seen.current.has(q.id);
    const t = tally.current;
    if (first) {
      seen.current.add(q.id);
      t.firstTotal++;
      if (r === "right") t.firstRight++;
    }
    t.answered++;
    if (r === "right") t.right++;
    cardBefore.current = state.cards[q.id];
    heartsAfter.current = heartsOn && r === "wrong" ? Math.max(0, state.hearts - 1) : state.hearts;
    update((d) => {
      if (first) gradeQuestion(d, q.id, r);
      if (r === "wrong" && spec.mode === "lesson") spendHeart(d);
      if (r === "right" && spec.mode === "review") gainHeart(d);
    });
    if (r !== "right" && !item.retry && q.type !== "short") setQueue((qq) => [...qq, makeItem(q, true)]);
    setCombo((c) => (r === "right" ? c + 1 : 0));
    if (r === "right") sounds.right();
    else if (r === "wrong") sounds.wrong();
    setResult(r);
  }

  function check() {
    let r: Result = "wrong";
    if (q.type === "single" && typeof picked === "number") r = item.order[picked] === q.answer ? "right" : "wrong";
    else if (q.type === "multi" && Array.isArray(picked)) {
      const chosen = picked.map((i) => item.order[i]).sort((a, b) => a - b);
      r = chosen.length === q.answer.length && chosen.every((v, k) => v === q.answer[k]) ? "right" : "wrong";
    } else if (q.type === "judge" && typeof picked === "boolean") r = picked === q.answer ? "right" : "wrong";
    else if (q.type === "fill") r = checkFill(text, q.answers) ? "right" : "wrong";
    submit(r);
    setPhase("feedback");
  }

  /** 填空题：判错了但其实意思对，改判为对 */
  function overrideRight() {
    const firstAttempt = !item.retry;
    if (heartsOn) heartsAfter.current = Math.min(HEART_MAX, heartsAfter.current + 1);
    update((d) => {
      if (firstAttempt) d.cards[q.id] = nextCard(cardBefore.current, "right", new Date());
      if (spec.mode === "lesson" && d.settings.hearts) d.hearts = Math.min(HEART_MAX, d.hearts + 1);
    });
    if (firstAttempt) {
      tally.current.firstRight++;
      setQueue((qq) => {
        const i = qq.findLastIndex((it) => it.q.id === q.id && it.retry);
        return i > pos ? qq.filter((_, k) => k !== i) : qq;
      });
    }
    tally.current.right++;
    setCombo((c) => c + 1);
    setResult("right");
    sounds.right();
  }

  function rateShort(r: Result) {
    submit(r);
    next();
  }

  function next() {
    if (heartsOn && heartsAfter.current <= 0) {
      setPhase("noHearts");
      return;
    }
    if (pos + 1 >= queue.length) {
      finish();
      return;
    }
    setPos(pos + 1);
    setPhase("answer");
    setPicked(null);
    setText("");
    setResult(null);
  }

  function finish() {
    const t = tally.current;
    const accuracy = t.firstTotal ? t.firstRight / t.firstTotal : 1;
    // 最后一题的作答可能还没合并进 state，所以真正的修改走 update；结算页数字在副本上预演
    const preview = structuredClone(state);
    let s: Summary;
    if (spec.mode === "lesson") {
      const before = coursePace(state, spec.course);
      const xp = 10 + t.firstRight + (accuracy === 1 ? 5 : 0);
      const input = { lessonId: spec.lesson.id, course: spec.course, accuracy, xp };
      const r = finishLesson(preview, input);
      update((d) => { finishLesson(d, input); });
      s = { xp, accuracy, streak: preview.streak, streakUp: r.streakUp, saved: r.firstTime ? daysSavedByLesson(before) : 0, answered: t.answered };
    } else {
      const xp = 5 + t.right;
      const input = { answered: t.answered, xp };
      const r = finishReview(preview, input);
      update((d) => { finishReview(d, input); });
      s = { xp, accuracy, streak: preview.streak, streakUp: r.streakUp, saved: 0, answered: t.answered };
    }
    sounds.done();
    setSummary(s);
    setPhase("done");
  }

  function exit() {
    if (phase === "done" || pos === 0 || window.confirm("现在退出，这一课不算完成（已答的题会记入复习）。确定退出吗？")) onExit();
  }

  function flag() {
    update((d) => {
      d.flags[q.id] = new Date().toISOString();
    });
    flash("已标记“题有问题”，以后先跳过这题");
  }

  if (phase === "done" && summary) return <ResultView spec={spec} s={summary} onDone={() => onExit()} />;
  if (phase === "noHearts")
    return (
      <div className="quiz center-col">
        <div className="big-emoji">💔</div>
        <h2>体力用完了</h2>
        <p className="muted">答错会扣体力。去复习错题，答对 1 题回 1 点；或者等 2 小时自动恢复 1 点。已答的题都记下来了。</p>
        <button className="btn" onClick={() => onExit(true)}>去复习回血</button>
        <button className="btn ghost" onClick={() => onExit()}>先退出</button>
      </div>
    );

  const total = queue.length;
  const progress = (pos + (phase === "answer" ? 0 : 1)) / total;
  const title = spec.mode === "lesson" ? spec.lesson.title : spec.title;
  const course = courseByCode(q.id.split("-")[0]);

  return (
    <div className="quiz">
      <div className="lhead">
        <button className="x" onClick={exit} aria-label="退出">✕</button>
        <div className="prog"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        {heartsOn && <span className="chip heart">❤️ {state.hearts}</span>}
      </div>
      <div className="combo" style={{ opacity: combo >= 3 ? 1 : 0 }}>🔥 连对 {combo} 题</div>
      <div className="qwrap">
        <div className="qtype">
          {q.type === "short" ? q.form : TYPE_LABEL[q.type]}
          {item.retry && " · 再来一次"}
          <span className="qmeta">{spec.mode === "review" ? `${course?.short ?? ""} · ` : ""}{title}</span>
        </div>
        {q.passage && <div className="passage">{q.passage}</div>}
        <div className="qtext">{q.stem}</div>
        {q.code && <pre className="code">{q.code}</pre>}
        {q.type === "multi" && (
          <div>
            <div className="muted small multi-hint">多选：选出全部正确的选项</div>
            {item.order.map((orig, i) => {
              const sel = Array.isArray(picked) && picked.includes(i);
              const correct = q.answer.includes(orig);
              const cls = ["opt"];
              if (phase === "answer" && sel) cls.push("sel");
              if (phase !== "answer" && correct) cls.push("right");
              if (phase !== "answer" && sel && !correct) cls.push("wrong");
              return (
                <button
                  key={orig}
                  className={cls.join(" ")}
                  disabled={phase !== "answer"}
                  onClick={() => {
                    setPicked((p) => {
                      const arr = Array.isArray(p) ? p : [];
                      return arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i];
                    });
                    sounds.tap();
                  }}
                >
                  <b>{LETTERS[i]}</b>{q.options[orig]}
                </button>
              );
            })}
          </div>
        )}
        {q.type === "single" && (
          <div>
            {item.order.map((orig, i) => {
              const cls = ["opt"];
              if (phase === "answer" && picked === i) cls.push("sel");
              if (phase !== "answer" && orig === q.answer) cls.push("right");
              if (phase !== "answer" && picked === i && orig !== q.answer) cls.push("wrong");
              return (
                <button key={orig} className={cls.join(" ")} disabled={phase !== "answer"} onClick={() => { setPicked(i); sounds.tap(); }}>
                  <b>{LETTERS[i]}</b>{q.options[orig]}
                </button>
              );
            })}
          </div>
        )}
        {q.type === "judge" && (
          <div className="judge">
            {[true, false].map((v) => {
              const cls = ["opt"];
              if (phase === "answer" && picked === v) cls.push("sel");
              if (phase !== "answer" && v === q.answer) cls.push("right");
              if (phase !== "answer" && picked === v && v !== q.answer) cls.push("wrong");
              return (
                <button key={String(v)} className={cls.join(" ")} disabled={phase !== "answer"} onClick={() => { setPicked(v); sounds.tap(); }}>
                  {v ? "✓ 正确" : "✗ 错误"}
                </button>
              );
            })}
          </div>
        )}
        {q.type === "fill" && (
          <input
            className={`fill ${phase === "feedback" ? (result === "right" ? "right" : "wrong") : ""}`}
            value={text}
            disabled={phase !== "answer"}
            placeholder="在这里填写答案"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) check(); }}
          />
        )}
        {q.type === "short" && phase === "reveal" && (
          <div className="reveal">
            <div className="reveal-title">得分要点</div>
            <ol>{q.points.map((p, i) => <li key={i}>{p}</li>)}</ol>
            {q.answer && <pre className="code">{q.answer}</pre>}
            <p className="muted small">{q.explain}</p>
          </div>
        )}
      </div>

      <div className={`foot ${phase === "feedback" ? (result === "right" ? "ok" : "bad") : ""}`}>
        {phase === "feedback" && (
          <div className="fb">
            <div className="fb-title">
              {result === "right" ? "答对了！" : q.type === "single" ? `正确答案：${LETTERS[item.order.indexOf(q.answer)]}` : q.type === "multi" ? `正确答案：${q.answer.map((a) => LETTERS[item.order.indexOf(a)]).sort().join("、")}` : q.type === "judge" ? `这句话是${q.answer ? "对的" : "错的"}` : `参考答案：${q.type === "fill" ? q.answers.join(" / ") : ""}`}
            </div>
            {q.type === "judge" && !q.answer && <div className="fb-fix">改错：{q.fix}</div>}
            <div className="fb-explain">{q.explain}</div>
            {q.verify && <div className="fb-verify">待核对：{q.verify}</div>}
            <div className="fb-actions">
              <button className="link" onClick={flag}>题有问题</button>
              {q.type === "fill" && result === "wrong" && <button className="link" onClick={overrideRight}>其实我答对了</button>}
            </div>
          </div>
        )}
        {phase === "answer" && q.type !== "short" && (
          <button className="btn" disabled={q.type === "fill" ? !text.trim() : q.type === "multi" ? !(Array.isArray(picked) && picked.length > 0) : picked === null} onClick={check}>检 查</button>
        )}
        {phase === "answer" && q.type === "short" && (
          <button className="btn" onClick={() => setPhase("reveal")}>想好了，看要点</button>
        )}
        {phase === "reveal" && (
          <div className="rate">
            <div className="muted small">对照要点，你能答出多少？</div>
            <div className="rate-row">
              <button className="btn bad" onClick={() => rateShort("wrong")}>不会</button>
              <button className="btn warn" onClick={() => rateShort("partial")}>部分</button>
              <button className="btn ok" onClick={() => rateShort("right")}>会了</button>
            </div>
            <button className="link" onClick={flag}>题有问题</button>
          </div>
        )}
        {phase === "feedback" && <button className="btn" onClick={() => next()}>继 续</button>}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ResultView({ spec, s, onDone }: { spec: QuizSpec; s: Summary; onDone: () => void }) {
  const perfect = s.accuracy === 1;
  const confetti = useMemo(
    () => (perfect ? Array.from({ length: 24 }, (_, i) => ({ left: (i * 37) % 100, delay: ((i * 13) % 6) / 10, hue: (i * 47) % 360, dur: 1.6 + ((i * 7) % 10) / 10 })) : []),
    [perfect],
  );
  return (
    <div className="quiz done-wrap">
      {confetti.map((c, i) => (
        <i key={i} className="conf" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: `hsl(${c.hue} 85% 55%)` }} />
      ))}
      <div className="big-emoji pop">{s.streakUp ? "🔥" : perfect ? "🏆" : "⭐"}</div>
      <h2>{s.streakUp ? `连胜 ${s.streak} 天！` : perfect ? "满分通过！" : spec.mode === "lesson" ? "这一课完成了！" : "复习完成！"}</h2>
      <p className="muted">{spec.mode === "lesson" ? spec.lesson.title : spec.title} · 离考试又近了一步</p>
      <div className="stats">
        <div className="stat"><div className="n xp">+{s.xp}</div><div className="l">经验值</div></div>
        <div className="stat"><div className="n ok">{Math.round(s.accuracy * 100)}%</div><div className="l">首次正确率</div></div>
        {spec.mode === "lesson" ? (
          <div className="stat"><div className="n acc">{s.saved > 0 ? `−${s.saved}` : "—"}</div><div className="l">{s.saved > 0 ? "学完日期提前(天)" : "已学过的课"}</div></div>
        ) : (
          <div className="stat"><div className="n acc">{s.answered}</div><div className="l">复习题数</div></div>
        )}
      </div>
      <button className="btn" onClick={onDone}>继 续</button>
    </div>
  );
}
