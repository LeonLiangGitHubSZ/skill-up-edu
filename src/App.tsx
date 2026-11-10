import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { Home } from "./screens/Home";
import { Me } from "./screens/Me";
import { Quiz, type QuizSpec } from "./screens/Quiz";
import { Review } from "./screens/Review";
import { RoutePlan } from "./screens/RoutePlan";
import { dueQuestions } from "./lib/state";
import { useStore } from "./store";

type Tab = "learn" | "route" | "review" | "me";
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "learn", icon: "🏠", label: "学习" },
  { id: "route", icon: "🗺️", label: "路线" },
  { id: "review", icon: "🔁", label: "复习" },
  { id: "me", icon: "👤", label: "我的" },
];

export default function App() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("learn");
  const [quiz, setQuiz] = useState<QuizSpec | null>(null);
  const [updateReady, setUpdateReady] = useState<null | (() => void)>(null);
  const due = dueQuestions(state).length;

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh: () => setUpdateReady(() => () => void update(true)),
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, quiz]);

  if (quiz)
    return (
      <div className="app">
        <Quiz
          key={quiz.mode === "lesson" ? quiz.lesson.id : quiz.title}
          spec={quiz}
          onExit={(goReview) => {
            setQuiz(null);
            if (goReview) setTab("review");
          }}
        />
      </div>
    );

  return (
    <div className="app">
      {tab === "learn" && (
        <Home
          onLesson={(course, lesson) => setQuiz({ mode: "lesson", course, lesson })}
          onReview={() => setTab("review")}
        />
      )}
      {tab === "route" && <RoutePlan />}
      {tab === "review" && <Review onStart={(title, questions) => questions.length && setQuiz({ mode: "review", title, questions })} />}
      {tab === "me" && <Me />}
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.id === "review" && due > 0 && <em className="dot">{due > 99 ? "99+" : due}</em>}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {updateReady && (
        <button className="update-toast" onClick={updateReady}>有新版本（可能有新题），点这里更新</button>
      )}
    </div>
  );
}
