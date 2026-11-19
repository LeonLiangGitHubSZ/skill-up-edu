import { useState } from "react";
import { courseByCode } from "../data/program";
import { bankCourses } from "../lib/plan";
import { coursePace } from "../lib/pace";
import { useStore } from "../store";

export function TopBar({ showCourse = true }: { showCourse?: boolean }) {
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const active = courseByCode(state.settings.active);

  return (
    <>
      <div className="top">
        {showCourse ? (
          <button className="course-chip" onClick={() => setOpen(true)}>
            {active?.short ?? "选择课程"} <span className="caret">▾</span>
          </button>
        ) : (
          <span className="brand">Skill Up</span>
        )}
        <span className="chip streak" title="连胜天数">🔥 {state.streak}</span>
        <span className="chip xp" title="经验值">⚡ {state.xp}</span>
        {state.settings.hearts && <span className="chip heart" title="体力">❤️ {state.hearts}</span>}
      </div>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {[
              { title: "正在备考", list: bankCourses().filter((c) => state.courses[c]?.status === "studying") },
              { title: "其他课程（在「路线」页标成备考后计入每天的目标）", list: bankCourses().filter((c) => state.courses[c]?.status !== "studying") },
            ].map((group) =>
              group.list.length === 0 ? null : (
                <div key={group.title} className="sheet-group">
                  <div className="sheet-title">{group.title}</div>
                  {group.list.map((code) => {
                    const c = courseByCode(code)!;
                    const p = coursePace(state, code);
                    return (
                      <button
                        key={code}
                        className={`sheet-row ${code === state.settings.active ? "on" : ""}`}
                        onClick={() => {
                          update((d) => {
                            d.settings.active = code;
                          });
                          setOpen(false);
                        }}
                      >
                        <div>
                          <b>{c.name}</b>
                          <div className="muted small">
                            {code} · {c.credits} 学分 · {p.daysLeft !== null ? `${p.daysLeft} 天后考试` : "考期待定"}
                          </div>
                        </div>
                        <span className="muted small">{p.done}/{p.total} 课</span>
                      </button>
                    );
                  })}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </>
  );
}
