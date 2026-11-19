import { useEffect, useMemo, useState } from "react";
import { courseByCode } from "../data/program";
import { scorePaper, type Answer, type Paper, type PaperScore } from "../lib/mock";
import { sounds } from "../lib/sound";
import type { Result } from "../lib/srs";
import { finishMock } from "../lib/state";
import { useStore } from "../store";

const LETTERS = "ABCDE";

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? h + ":" : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function MockExam({ paper, onExit }: { paper: Paper; onExit: () => void }) {
  const { update } = useStore();
  const [phase, setPhase] = useState<"answer" | "grade" | "result">("answer");
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [ratings, setRatings] = useState<Record<string, Result>>({});
  const [gradePos, setGradePos] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<(PaperScore & { seconds: number; xp: number }) | null>(null);
  const shorts = useMemo(() => paper.items.filter((it) => it.q.type === "short"), [paper]);
  const course = courseByCode(paper.course);
  /** 实践课是上机考核：主观题在电脑上做，不是在纸上写 */
  const practice = course?.group === "实践";

  useEffect(() => {
    if (phase !== "answer") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  const elapsed = (now - startedAt) / 1000;
  const remaining = paper.minutes * 60 - elapsed;
  const item = paper.items[pos];
  const answered = (id: string) => {
    const a = answers[id];
    return a !== undefined && a !== "" && !(Array.isArray(a) && a.length === 0);
  };
  const objectiveLeft = paper.items.filter((it) => it.q.type !== "short" && !answered(it.q.id)).length;

  const setAnswer = (v: Answer) => {
    sounds.tap();
    setAnswers((a) => ({ ...a, [item.q.id]: v }));
  };

  function submit() {
    const msg = objectiveLeft > 0 ? `还有 ${objectiveLeft} 道客观题没作答，确定交卷吗？` : "确定交卷吗？";
    if (!window.confirm(msg)) return;
    setNow(Date.now());
    if (shorts.length) setPhase("grade");
    else finish({});
  }

  function finish(finalRatings: Record<string, Result>) {
    const score = scorePaper(paper, answers, finalRatings);
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    const xp = 20 + Math.round((score.total / Math.max(1, score.max)) * 30);
    update((d) => {
      finishMock(d, { course: paper.course, score: score.total, max: score.max, seconds, results: score.results });
    });
    sounds.done();
    setDone({ ...score, seconds, xp });
    setPhase("result");
  }

  function rate(r: Result) {
    const next = { ...ratings, [shorts[gradePos].q.id]: r };
    setRatings(next);
    if (gradePos + 1 < shorts.length) setGradePos(gradePos + 1);
    else finish(next);
  }

  if (phase === "result" && done) {
    const pass = done.total >= done.max * 0.6;
    const wrong = Object.values(done.results).filter((r) => r !== "right").length;
    return (
      <div className="quiz done-wrap">
        <div className="big-emoji pop">{pass ? "🎉" : "💪"}</div>
        <h2>{course?.short} 模拟考试</h2>
        <div className="mock-score">
          {Number.isInteger(done.total) ? done.total : done.total.toFixed(1)}
          <small> / {done.max} 分</small>
        </div>
        <p className="muted">{pass ? "过了及格线（60 分），保持住！" : "还没到及格线（60 分），按错题再补一补。"}用时 {clock(done.seconds)}</p>
        <table className="mock-table">
          <tbody>
            {done.bySection.map((s) => (
              <tr key={s.label}><td>{s.label}</td><td>{Number.isInteger(s.score) ? s.score : s.score.toFixed(1)} / {s.max}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">没拿满分的 {wrong} 道题已加入复习，经验 +{done.xp}</p>
        <button className="btn" onClick={onExit}>完 成</button>
      </div>
    );
  }

  if (phase === "grade") {
    const it = shorts[gradePos];
    const q = it.q;
    return (
      <div className="quiz">
        <div className="lhead">
          <span className="mock-head">对照要点自评 {gradePos + 1}/{shorts.length}</span>
          <div className="prog"><i style={{ width: `${Math.round((gradePos / shorts.length) * 100)}%` }} /></div>
        </div>
        <div className="qwrap">
          <div className="qtype">{it.section}<span className="qmeta">本题 {it.points} 分</span></div>
          {q.passage && <div className="passage">{q.passage}</div>}
          <div className="qtext">{q.stem}</div>
          {q.code && <pre className="code">{q.code}</pre>}
          {q.type === "short" && (
            <div className="reveal">
              <div className="reveal-title">得分要点</div>
              <ol>{q.points.map((p, i) => <li key={i}>{p}</li>)}</ol>
              {q.answer && <pre className="code">{q.answer}</pre>}
              <p className="muted small">{q.explain}</p>
            </div>
          )}
        </div>
        <div className="foot">
          <div className="rate">
            <div className="muted small">{practice ? "对照要点和参考答案，你做出了多少？" : "对照要点，你在纸上写出了多少？"}</div>
            <div className="rate-row">
              <button className="btn bad" onClick={() => rate("wrong")}>不会 · 0</button>
              <button className="btn warn" onClick={() => rate("partial")}>部分 · {it.points / 2}</button>
              <button className="btn ok" onClick={() => rate("right")}>会了 · {it.points}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = item.q;
  const a = answers[q.id];
  const firstOfSection = pos === 0 || paper.items[pos - 1].section !== item.section;
  return (
    <div className="quiz">
      <div className="lhead">
        <button className="x" onClick={() => window.confirm("退出后这套模拟卷不保存，确定退出吗？") && onExit()} aria-label="退出">✕</button>
        <button className="mock-head link" onClick={() => setCardOpen(true)}>第 {pos + 1}/{paper.items.length} 题 · 答题卡</button>
        <span className={`mock-timer ${remaining < 600 ? "hot" : ""}`}>⏱ {remaining > 0 ? clock(remaining) : "时间到"}</span>
      </div>
      <div className="prog thin"><i style={{ width: `${Math.round(((pos + 1) / paper.items.length) * 100)}%` }} /></div>
      <div className="qwrap">
        <div className="qtype">
          {item.section}
          <span className="qmeta">{firstOfSection ? `每题 ${item.points} 分` : `${item.points} 分`}</span>
        </div>
        {q.passage && <div className="passage">{q.passage}</div>}
        <div className="qtext">{q.stem}</div>
        {q.code && <pre className="code">{q.code}</pre>}
        {q.type === "multi" &&
          item.order.map((orig, i) => {
            const arr = Array.isArray(a) ? a : [];
            return (
              <button key={orig} className={`opt ${arr.includes(i) ? "sel" : ""}`} onClick={() => setAnswer(arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i])}>
                <b>{LETTERS[i]}</b>{q.options[orig]}
              </button>
            );
          })}
        {q.type === "single" &&
          item.order.map((orig, i) => (
            <button key={orig} className={`opt ${a === i ? "sel" : ""}`} onClick={() => setAnswer(i)}>
              <b>{LETTERS[i]}</b>{q.options[orig]}
            </button>
          ))}
        {q.type === "judge" && (
          <div className="judge">
            <button className={`opt ${a === true ? "sel" : ""}`} onClick={() => setAnswer(true)}>✓ 正确</button>
            <button className={`opt ${a === false ? "sel" : ""}`} onClick={() => setAnswer(false)}>✗ 错误</button>
          </div>
        )}
        {q.type === "judge" && <p className="muted small">真实考试里判为错误的题还要改错，交卷后看解析时对照一下。</p>}
        {q.type === "fill" && (
          <input
            className="fill"
            value={typeof a === "string" ? a : ""}
            placeholder="在这里填写答案"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => setAnswers((x) => ({ ...x, [q.id]: e.target.value }))}
          />
        )}
        {q.type === "short" && (
          <div className="card soft">
            {practice
              ? "💻 实践考核是上机操作：在电脑上动手做出来（程序、SQL 要实际运行）。交卷后对照得分要点和参考答案给自己打分。"
              : "✍️ 在纸上作答（真实考试要手写）。交卷后对照得分要点给自己打分。"}
          </div>
        )}
      </div>
      <div className="foot">
        <div className="rate-row">
          <button className="btn ghost" disabled={pos === 0} onClick={() => setPos(pos - 1)}>上一题</button>
          {pos + 1 < paper.items.length ? (
            <button className="btn" onClick={() => setPos(pos + 1)}>下一题</button>
          ) : (
            <button className="btn ok" onClick={submit}>交 卷</button>
          )}
        </div>
      </div>
      {cardOpen && (
        <div className="sheet-backdrop" onClick={() => setCardOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">答题卡 · 还有 {objectiveLeft} 道客观题没作答</div>
            <div className="answer-card">
              {paper.items.map((it, i) => (
                <button
                  key={it.q.id}
                  className={`${i === pos ? "cur" : ""} ${it.q.type === "short" ? "short" : answered(it.q.id) ? "done" : ""}`}
                  onClick={() => { setPos(i); setCardOpen(false); }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="muted small">紫色 = 已作答，虚线 = {practice ? "上机题（在电脑上做）" : "主观题（在纸上写）"}</div>
            <button className="btn ok" onClick={() => { setCardOpen(false); submit(); }}>交 卷</button>
          </div>
        </div>
      )}
    </div>
  );
}
