import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { findQuestion, getBank } from "../data/banks";
import { courseByCode, STUDY_PLAN } from "../data/program";
import type { Question } from "../data/types";
import { PAPERS, paperAvailability } from "../lib/mock";
import { dueQuestions, HEART_MAX, nextHeartAt, wrongQuestions } from "../lib/state";
import { useStore } from "../store";

const SESSION_SIZE = 15;
const LETTERS = "ABCD";

const toQuestions = (ids: string[]) => ids.map(findQuestion).filter((q): q is Question => !!q);

export function Review({ onStart, onMock }: { onStart: (title: string, questions: Question[]) => void; onMock: (course: string) => void }) {
  const { state, update } = useStore();
  const [detail, setDetail] = useState<Question | null>(null);
  const [copied, setCopied] = useState(false);
  const due = dueQuestions(state);
  const wrong = wrongQuestions(state);
  const flagged = Object.keys(state.flags);
  const heartAt = nextHeartAt(state);

  const copyFlags = async () => {
    const text = flagged
      .map((id) => `${id}：${findQuestion(id)?.stem ?? "(题目已不存在)"}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(`Skill Up EDU 标记有问题的题目（${flagged.length} 道）：\n${text}`);
      setCopied(true);
    } catch {
      window.prompt("复制下面的内容：", text);
    }
  };

  return (
    <div className="screen">
      <TopBar showCourse={false} />
      <div className="scroll pad">
        <h1 className="page-title">复习</h1>

        <div className="card">
          <div className="card-row">
            <div>
              <div className="big-num">{due.length}</div>
              <div className="muted small">道题到复习时间（按遗忘曲线安排）</div>
            </div>
            <button
              className="btn inline"
              disabled={due.length === 0}
              onClick={() => onStart("到期复习", toQuestions(due.slice(0, SESSION_SIZE)))}
            >
              开始复习
            </button>
          </div>
          <div className="by-course">
            {STUDY_PLAN.map(({ code }) => {
              const n = due.filter((id) => id.startsWith(code + "-")).length;
              return (
                <button
                  key={code}
                  className="pill"
                  disabled={n === 0}
                  onClick={() => onStart(`${courseByCode(code)?.short} 到期复习`, toQuestions(due.filter((id) => id.startsWith(code + "-")).slice(0, SESSION_SIZE)))}
                >
                  {courseByCode(code)?.short} {n}
                </button>
              );
            })}
          </div>
          {due.length === 0 && <div className="muted small">暂时没有到期的题。学新课后，答过的题会按记忆规律回到这里。</div>}
        </div>

        {state.settings.hearts && (
          <div className="card soft">
            ❤️ 体力 {state.hearts}/{HEART_MAX}：复习时答对 1 题回 1 点
            {heartAt && `；${heartAt.getHours()}:${String(heartAt.getMinutes()).padStart(2, "0")} 自动恢复 1 点`}
          </div>
        )}

        <h2 className="section-title">模拟考试 <span className="muted small">按真实题型组卷，整套做完再看答案</span></h2>
        {STUDY_PLAN.map(({ code }) => {
          const spec = PAPERS[code];
          if (!spec || !getBank(code)) return null;
          const last = state.mocks.filter((m) => m.course === code).at(-1);
          const short = paperAvailability(code).filter((a) => a.have < a.need);
          return (
            <div key={code} className="card">
              <div className="card-row">
                <div>
                  <b>{courseByCode(code)?.name}</b>
                  <div className="muted small">{spec.minutes} 分钟 · {spec.sections.map((x) => `${x.label.replace("题", "")} ${x.count}`).join(" · ")}</div>
                  {last && <div className="small">上次 {Math.round(last.score)}/{last.max} 分 · {last.at.slice(5, 10).replace("-", "/")}</div>}
                </div>
                <button className="btn inline" onClick={() => onMock(code)}>开始</button>
              </div>
              {short.length > 0 && <div className="muted small">题库里{short.map((x) => `${x.label}只有 ${x.have} 道`).join("、")}，这部分会少抽几题。</div>}
              <div className="muted small">{spec.note}</div>
            </div>
          );
        })}

        <h2 className="section-title">
          错题本 <span className="muted small">{wrong.length} 道</span>
          {wrong.length > 0 && (
            <button className="link" onClick={() => onStart("错题强化", toQuestions(wrong.slice(0, SESSION_SIZE)))}>
              练前 {Math.min(SESSION_SIZE, wrong.length)} 道
            </button>
          )}
        </h2>
        {wrong.length === 0 && <div className="muted small">还没有错题。</div>}
        {STUDY_PLAN.map(({ code }) => {
          const ids = wrong.filter((id) => id.startsWith(code + "-"));
          if (!ids.length) return null;
          const bank = getBank(code);
          return (
            <div key={code} className="list-group">
              <div className="list-head">{courseByCode(code)?.name}</div>
              {ids.map((id) => {
                const q = findQuestion(id);
                if (!q) return null;
                return (
                  <button key={id} className="list-item" onClick={() => setDetail(q)}>
                    <span className="ellipsis">{q.stem}</span>
                    <span className="muted small nowrap">第{bank?.unitOf.get(id)?.unit}章 · 错 {state.cards[id].wrongCount} 次</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {flagged.length > 0 && (
          <>
            <h2 className="section-title">
              标记有问题 <span className="muted small">{flagged.length} 道</span>
              <button className="link" onClick={copyFlags}>{copied ? "已复制" : "复制给 Claude 修改"}</button>
            </h2>
            {flagged.map((id) => {
              const q = findQuestion(id);
              return (
                <div key={id} className="list-item">
                  <span className="ellipsis">{q?.stem ?? id}</span>
                  <button className="link" onClick={() => update((d) => { delete d.flags[id]; })}>取消标记</button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {detail && (
        <div className="sheet-backdrop" onClick={() => setDetail(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <QuestionDetail q={detail} />
            <button className="btn" onClick={() => setDetail(null)}>关 闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionDetail({ q }: { q: Question }) {
  return (
    <div className="detail">
      <div className="qtext small-q">{q.stem}</div>
      {q.code && <pre className="code">{q.code}</pre>}
      {q.type === "single" && (
        <ol className="opts-list">
          {q.options.map((o, i) => (
            <li key={i} className={i === q.answer ? "right-text" : ""}>{LETTERS[i]}. {o}</li>
          ))}
        </ol>
      )}
      {q.type === "judge" && <p><b>{q.answer ? "正确" : `错误。改错：${q.fix}`}</b></p>}
      {q.type === "fill" && <p><b>答案：{q.answers.join(" / ")}</b></p>}
      {q.type === "short" && (
        <>
          <ol>{q.points.map((p, i) => <li key={i}>{p}</li>)}</ol>
          {q.answer && <pre className="code">{q.answer}</pre>}
        </>
      )}
      <p className="muted small">{q.explain}</p>
    </div>
  );
}
