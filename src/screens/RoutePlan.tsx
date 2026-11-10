import { TopBar } from "../components/TopBar";
import {
  COURSES, courseByCode, CRITICAL_SLOT_COURSES, MAJOR, SESSIONS, SLOT_LABEL, type CourseGroup, type Slot,
} from "../data/program";
import { shortDate } from "../lib/date";
import type { CourseStatus } from "../lib/state";
import { useStore } from "../store";

const SLOTS: Slot[] = ["sat-am", "sat-pm", "sun-am", "sun-pm"];
const GROUPS: CourseGroup[] = ["思政", "公共基础", "专业核心", "专业应用", "二选一", "实践", "毕业设计"];
const STATUS_TEXT: Record<CourseStatus, string> = { todo: "未考", studying: "备考", passed: "已过" };
const STATUS_ICON: Record<CourseStatus, string> = { todo: "", studying: "📖", passed: "✅" };

export function RoutePlan() {
  const { state, update } = useStore();
  const status = (code: string): CourseStatus => state.courses[code]?.status ?? "todo";
  const passed = COURSES.filter((c) => status(c.code) === "passed");
  const credits = passed.reduce((n, c) => n + c.credits, 0);
  const choose13017 = status("13017") !== "todo" && status("04751") === "todo";
  const need = choose13017 ? 76 : MAJOR.minCredits;

  return (
    <div className="screen">
      <TopBar showCourse={false} />
      <div className="scroll pad">
        <h1 className="page-title">路线</h1>

        <div className="card">
          <div className="muted small">{MAJOR.code} {MAJOR.name} · 主考 {MAJOR.school}</div>
          <div className="grad">
            <div className="big-num">{credits}<small> / {need} 学分</small></div>
            <div className="muted small">已通过 {passed.length} 门 · 备考中 {COURSES.filter((c) => status(c.code) === "studying").length} 门</div>
          </div>
          <div className="bar wide"><i style={{ width: `${Math.min(100, Math.round((credits / need) * 100))}%` }} /></div>
          <p className="muted small">
            周六下午的 4 门必考课（高数、数据结构、高级语言、习思想概论）只在 4 月、10 月考，每次只能考一门，
            所以理论课最早 2028 年 10 月考完，之后做毕业设计。每个 4 月、10 月都别空着周六下午。
          </p>
        </div>

        <h2 className="section-title">考试路线</h2>
        {SESSIONS.map((s) => (
          <div key={s.id} className="card session">
            <div className="session-head">
              <b>{s.label}</b>
              <span className={`badge ${s.status}`}>{s.status === "official" ? "已公布" : "按往年推测"}</span>
            </div>
            {s.days && <div className="muted small">考试：{shortDate(s.days[0])}（六）、{shortDate(s.days[1])}（日）</div>}
            {s.registration && (
              <div className="muted small">
                报名：{s.registration.estimated ? "预计 " : ""}{shortDate(s.registration.start)}–{shortDate(s.registration.end)}
                {state.registered[s.id] ? " · 已报名 ✅" : ""}
              </div>
            )}
            <div className="slots">
              {SLOTS.map((slot) => {
                const codes = Object.entries(s.slots).filter(([, v]) => v === slot).map(([c]) => c);
                if (!codes.length) return null;
                const critical = slot === "sat-pm" && codes.some((c) => CRITICAL_SLOT_COURSES.includes(c));
                return (
                  <div key={slot} className="slot">
                    <span className="slot-label">{SLOT_LABEL[slot]}</span>
                    <span className="slot-courses">
                      {codes.map((c) => (
                        <span key={c} className={`tag ${status(c)}`}>{STATUS_ICON[status(c)]}{courseByCode(c)?.short}</span>
                      ))}
                      {critical && <span className="tag warn">选 1 门 · 决定毕业时间</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            {s.note && <div className="muted small">{s.note}</div>}
          </div>
        ))}

        <h2 className="section-title">全部课程</h2>
        {GROUPS.map((g) => (
          <div key={g} className="list-group">
            <div className="list-head">{g}</div>
            {COURSES.filter((c) => c.group === g).map((c) => (
              <div key={c.code} className="course-row">
                <div className="course-name">
                  {c.name}
                  <small>
                    {c.code} · {c.credits} 学分{c.degree ? " · 学位课" : ""}{c.provincial ? " · 省考" : ""}
                    {c.note ? ` · ${c.note}` : ""}
                  </small>
                </div>
                <div className="seg">
                  {(["todo", "studying", "passed"] as CourseStatus[]).map((st) => (
                    <button
                      key={st}
                      className={status(c.code) === st ? "on" : ""}
                      onClick={() => update((d) => { d.courses[c.code] = { ...d.courses[c.code], status: st }; })}
                    >
                      {STATUS_TEXT[st]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <p className="muted small">
          数据来源：江苏省教育考试院《关于公布江苏省高等教育自学考试2026年10月和2027年1月考试日程及开考课程教材计划的通知》（苏教考自〔2026〕7 号），
          以及 2025、2026 年 4 月 / 7 月 / 10 月的官方日程。
        </p>
      </div>
    </div>
  );
}
