import { TopBar } from "../components/TopBar";
import { WhatsNew } from "../components/WhatsNew";
import { getBank } from "../data/banks";
import { courseByCode, sessionById, SLOT_LABEL, STUDY_PLAN } from "../data/program";
import type { Lesson } from "../data/types";
import { dayKey, daysBetween, shortDate } from "../lib/date";
import { coursePace, SPRINT_DAYS, type Pace } from "../lib/pace";
import { studyingCourses } from "../lib/plan";
import { dueQuestions } from "../lib/state";
import { useStore } from "../store";

const REGISTER_URL = "https://sdata.jseea.cn/tpl_front/homepage.html";
const LEVEL_TEXT = { calm: "节奏正常", mid: "备考期", hot: "冲刺期" } as const;
const WEEKDAY = "日一二三四五六";

export function Home({ onLesson, onReview }: { onLesson: (course: string, lesson: Lesson) => void; onReview: () => void }) {
  const { state, update } = useStore();
  const code = state.settings.active;
  const course = courseByCode(code);
  const bank = getBank(code);
  const pace = coursePace(state, code);
  const all = studyingCourses(state).map((c) => coursePace(state, c));
  const goal = all.reduce((n, p) => n + p.todayTarget, 0);
  const goalDone = all.reduce((n, p) => n + Math.min(p.todayDone, p.todayTarget), 0);
  const due = dueQuestions(state).length;
  const current = bank?.lessons.find((l) => !state.lessons[l.id]?.times);
  const order = new Map(bank?.lessons.map((l, i) => [l.id, i]));

  return (
    <div className="screen">
      <TopBar />
      <div className="scroll">
        <WhatsNew />
        <Urgency pace={pace} name={course?.name ?? code} />
        <RegistrationNotice />
        {pace.sprint && <div className="notice hot">⏰ 考前冲刺周：新课先停一停，专心复习到期题和错题，到「复习」页做几套模拟卷。</div>}

        <div className="goal">
          <span>今日目标</span>
          <div className="bar"><i style={{ width: `${goal ? Math.round((goalDone / goal) * 100) : 100}%` }} /></div>
          <b>{goalDone}/{goal} 课</b>
        </div>
        <div className="goal-courses">
          {all.map((p) => (
            <button
              key={p.code}
              className={p.code === code ? "on" : ""}
              onClick={() => update((d) => { d.settings.active = p.code; })}
            >
              {courseByCode(p.code)?.short} {Math.min(p.todayDone, p.todayTarget)}/{p.todayTarget}
            </button>
          ))}
        </div>

        {due > 0 && (
          <button className="review-cta" onClick={onReview}>
            🔁 有 <b>{due}</b> 道题到复习时间了，趁现在巩固一下
          </button>
        )}

        {!bank ? (
          <div className="empty">题库正在准备中…</div>
        ) : (
          bank.units.map((u) => {
            const doneCount = u.lessons.filter((l) => state.lessons[l.id]?.times).length;
            return (
              <section key={u.unit}>
                <div className="unit">
                  <b>{u.unit === 0 || u.unit >= 90 ? u.title : `第 ${u.chapter ?? u.unit} 章 · ${u.title}`}</b>
                  <span>{doneCount}/{u.lessons.length} 课</span>
                </div>
                <div className="nodes">
                  {u.lessons.map((l, i) => {
                    const rec = state.lessons[l.id];
                    const isCur = current?.id === l.id;
                    const offset = Math.round(Math.sin((order.get(l.id) ?? 0) * 1.1) * 42);
                    return (
                      <div key={l.id} className={`node-row ${offset > 0 ? "rev" : ""}`} style={{ transform: `translateX(${offset}px)` }}>
                        <button className={`node ${rec ? "done" : isCur ? "cur" : "todo"}`} onClick={() => onLesson(code, l)} aria-label={l.title}>
                          {isCur && <span className="start">开始</span>}
                          {rec ? "★" : isCur ? "📖" : i + 1}
                        </button>
                        <div className="node-label">
                          {l.title}
                          <small>{rec ? `学过 ${rec.times} 次 · 最佳 ${Math.round(rec.best * 100)}%` : `${l.questions.length} 题`}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
        <div className="foot-note">题目由 AI 按考试大纲原创，答案以教材为准；发现问题点「题有问题」。</div>
      </div>
    </div>
  );
}

function paceLine(p: Pace): string {
  if (p.total === 0) return "题库准备中";
  if (p.remaining === 0) return "新课已学完，转入复习 🎉";
  if (p.actual === 0 || p.marginDays === null) return "还没有学习记录，先学第一课";
  if (p.marginDays >= SPRINT_DAYS) return `按现速度：考前 ${p.marginDays} 天学完`;
  if (p.marginDays >= 0) return `按现速度：考前 ${p.marginDays} 天才学完，冲刺周会很赶`;
  return `按现速度来不及，差 ${-p.marginDays} 天`;
}

function Urgency({ pace, name }: { pace: Pace; name: string }) {
  const at = pace.examAt;
  const plan = STUDY_PLAN.find((p) => p.code === pace.code);
  const slot = plan?.session ? sessionById(plan.session)?.slots[pace.code] : undefined;
  const when = at ? `${at.getMonth() + 1}/${at.getDate()}（周${WEEKDAY[at.getDay()]}）${slot ? SLOT_LABEL[slot].slice(2) : ""}` : "";
  return (
    <div className={`urg ${pace.level}`}>
      <span className="lvl">{pace.sprint ? "冲刺周" : LEVEL_TEXT[pace.level]}</span>
      {pace.daysLeft !== null && pace.daysLeft >= 0 ? (
        <div className="d">{pace.daysLeft}<small>天后考试</small></div>
      ) : (
        <div className="d small-d">考期待定</div>
      )}
      <div className="t">{name}{when && ` · ${when}`}</div>
      <div className="pace">
        <span>剩 {pace.remaining} 课</span>
        {pace.remaining > 0 && <span>每天约 {pace.required < 0.1 ? "0.1" : pace.required.toFixed(1)} 课</span>}
      </div>
      <div className="t2">{paceLine(pace)}</div>
    </div>
  );
}

function RegistrationNotice() {
  const { state, update } = useStore();
  const session = sessionById(STUDY_PLAN[0].session ?? "");
  const reg = session?.registration;
  if (!session || !reg || state.registered[session.id]) return null;
  const today = dayKey();
  const toStart = daysBetween(today, reg.start);
  const toEnd = daysBetween(today, reg.end);
  if (toStart > 30 || toEnd < -3) return null;
  const confirm = () => update((d) => { d.registered[session.id] = true; });
  const window = `${shortDate(reg.start)}–${shortDate(reg.end)}`;

  if (toStart > 0)
    return (
      <div className="notice">
        📝 {session.label}考期报名{reg.estimated ? "预计" : ""}在 <b>{window}</b>，还有 {toStart} 天。新生注册要先准备“三照”：身份证人像面、手持身份证照、证件照。
        {reg.estimated && <div className="small">日期按往年推算，以官方报名通告为准（预计 11 月下旬发布）。</div>}
        <div className="notice-actions"><button className="link" onClick={confirm}>我已报名</button></div>
      </div>
    );
  if (toEnd >= 0)
    return (
      <div className="notice hot">
        📝 报名窗口开放中，<b>{shortDate(reg.end)} 17:00</b> 截止！错过就要等下一个考期。
        <div className="notice-actions">
          <a className="link" href={REGISTER_URL} target="_blank" rel="noreferrer">去报名</a>
          <button className="link" onClick={confirm}>我已报名</button>
        </div>
      </div>
    );
  return (
    <div className="notice">
      报名应该已经结束了。如果你已经报上名，点一下确认。
      <div className="notice-actions"><button className="link" onClick={confirm}>我已报名</button></div>
    </div>
  );
}
