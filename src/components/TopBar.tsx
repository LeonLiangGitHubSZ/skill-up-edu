import { useState } from "react";
import { getBank } from "../data/banks";
import { courseByCode, STUDY_PLAN } from "../data/program";
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
            <div className="sheet-title">正在备考</div>
            {STUDY_PLAN.map(({ code }) => {
              const c = courseByCode(code)!;
              const p = coursePace(state, code);
              const hasBank = !!getBank(code);
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
                  <span className="muted small">{hasBank ? `${p.done}/${p.total} 课` : "题库准备中"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
