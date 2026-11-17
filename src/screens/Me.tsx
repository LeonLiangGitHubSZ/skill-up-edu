import { useRef, useState } from "react";
import { ReminderCard } from "../components/ReminderCard";
import { TopBar } from "../components/TopBar";
import { getBank } from "../data/banks";
import { STUDY_PLAN } from "../data/program";
import { checkForUpdate } from "../pwa";
import { addDays, dayKey, parseDay } from "../lib/date";
import { createState } from "../lib/state";
import { exportBackup, readBackup } from "../lib/storage";
import { useStore } from "../store";

const WEEKDAY = "日一二三四五六";

export function Me() {
  const { state, update, replace } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [updateMsg, setUpdateMsg] = useState("");
  const totalQuestions = STUDY_PLAN.reduce((n, p) => n + (getBank(p.code)?.questions.size ?? 0), 0);

  const onCheck = async () => {
    setUpdateMsg("正在检查…");
    const r = await checkForUpdate();
    setUpdateMsg(
      r === "update" ? "发现新版本，正在下载，稍后屏幕顶部会出现更新横幅" : r === "latest" ? "已经是最新版本 ✓" : "当前环境不支持离线更新（例如在电脑浏览器里预览时）",
    );
  };

  const cards = Object.values(state.cards);
  const answered = cards.reduce((n, c) => n + c.reps, 0);
  const mastered = cards.filter((c) => c.state === 2 && c.last === "right").length;
  const lessonsDone = Object.keys(state.lessons).length;
  const today = dayKey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const maxXp = Math.max(10, ...week.map((d) => state.days[d]?.xp ?? 0));

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = await readBackup(file);
      if (window.confirm("导入会覆盖本机现在的学习记录，确定吗？")) {
        replace(next);
        setMsg("已导入备份");
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="screen">
      <TopBar showCourse={false} />
      <div className="scroll pad">
        <h1 className="page-title">我的</h1>

        <div className="card version-card">
          <div className="card-row">
            <div>
              <div className="muted small">当前版本</div>
              <b>{__APP_VERSION__}</b>
              <div className="muted small">题库 {totalQuestions} 题</div>
            </div>
            <button className="btn inline ghost" onClick={() => void onCheck()}>检查更新</button>
          </div>
          {updateMsg && <div className="small">{updateMsg}</div>}
        </div>

        <div className="stat-grid">
          <div className="stat"><div className="n acc">{state.streak}</div><div className="l">连胜天数</div></div>
          <div className="stat"><div className="n">{state.bestStreak}</div><div className="l">最长连胜</div></div>
          <div className="stat"><div className="n xp">{state.xp}</div><div className="l">总经验</div></div>
          <div className="stat"><div className="n">{lessonsDone}</div><div className="l">学过的课</div></div>
          <div className="stat"><div className="n">{answered}</div><div className="l">累计答题</div></div>
          <div className="stat"><div className="n ok">{mastered}</div><div className="l">已掌握</div></div>
        </div>

        <div className="card">
          <div className="muted small">最近 7 天经验值 · 请假卡 {state.freezes} 张（每周一送 1 张，断签时自动使用）</div>
          <div className="week">
            {week.map((d) => {
              const xp = state.days[d]?.xp ?? 0;
              return (
                <div key={d} className="week-col">
                  <span className="week-xp">{xp || ""}</span>
                  <i style={{ height: `${Math.round((xp / maxXp) * 70) + 2}px` }} className={d === today ? "today" : ""} />
                  <span className="muted small">{d === today ? "今" : WEEKDAY[parseDay(d).getDay()]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <h2 className="section-title">设置</h2>
        <ReminderCard />
        <div className="card list">
          <label className="toggle">
            <span>音效</span>
            <input type="checkbox" checked={state.settings.sound} onChange={(e) => update((d) => { d.settings.sound = e.target.checked; })} />
          </label>
          <label className="toggle">
            <span>
              体力机制
              <small>答错扣体力，复习错题回血</small>
            </span>
            <input type="checkbox" checked={state.settings.hearts} onChange={(e) => update((d) => { d.settings.hearts = e.target.checked; })} />
          </label>
        </div>

        <h2 className="section-title">数据</h2>
        <div className="card list">
          <p className="muted small">学习记录只存在这台手机上。换手机或清理 Safari 数据前，先导出备份。</p>
          <button className="btn ghost" onClick={async () => setMsg((await exportBackup(state)) === "shared" ? "" : "备份已下载")}>导出备份</button>
          <button className="btn ghost" onClick={() => fileInput.current?.click()}>导入备份</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
          <button
            className="btn ghost danger"
            onClick={() => {
              if (window.confirm("清空全部学习记录？这一步不能撤销。") && window.confirm("真的清空吗？建议先导出备份。")) {
                replace(createState());
                setMsg("已清空");
              }
            }}
          >
            清空学习记录
          </button>
          {msg && <div className="muted small">{msg}</div>}
        </div>

        <h2 className="section-title">关于</h2>
        <div className="card soft small">
          <p>Skill Up EDU · 江苏自考 计算机科学与技术（专升本）个人学习助手。</p>
          <p>题目由 Claude 按江苏省教育考试院公布的考试大纲原创，答案以指定教材为准；带“待核对”的题请对照教材确认。</p>
          <p>考试日程来自江苏省教育考试院官网；4 月、7 月、10 月的安排是按往年推测，以官方公布为准。</p>
          <p className="muted">数据版本 {state.v} · 记录开始于 {state.created.slice(0, 10)}</p>
        </div>
      </div>
    </div>
  );
}
