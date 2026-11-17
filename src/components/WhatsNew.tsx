import { useEffect } from "react";
import { RELEASES, unseenReleases } from "../data/changelog";
import { useStore } from "../store";

/** 更新完成后在首页显示一次：告诉你已经是新版本、这次更新了什么 */
export function WhatsNew() {
  const { state, update } = useStore();
  const hasHistory = Object.keys(state.lessons).length > 0 || Object.keys(state.cards).length > 0;
  const unseen = unseenReleases(state.seenRelease, hasHistory);
  const latest = RELEASES[0].id;

  // 新用户不需要看更新说明，直接记为已看过
  useEffect(() => {
    if (unseen.length === 0 && state.seenRelease !== latest) update((d) => { d.seenRelease = latest; });
  }, [unseen.length, state.seenRelease, latest, update]);

  if (unseen.length === 0) return null;
  return (
    <div className="whatsnew">
      <div className="whatsnew-title">✅ 已更新到最新版本</div>
      <div className="muted small">版本 {__APP_VERSION__}</div>
      {unseen.map((r) => (
        <div key={r.id} className="whatsnew-release">
          <b>{r.date.slice(5).replace("-", "/")} · {r.title}</b>
          <ul>{r.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
        </div>
      ))}
      <button className="btn ok" onClick={() => update((d) => { d.seenRelease = latest; })}>知道了</button>
    </div>
  );
}
