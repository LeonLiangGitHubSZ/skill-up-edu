import { useEffect, useState } from "react";
import { applyUpdate, onUpdateAvailable, updateAvailable } from "../pwa";

/** 发现新版本时盖在屏幕顶部的横幅（答题、模拟考试时不显示，退出后再出现） */
export function UpdateBanner() {
  const [show, setShow] = useState(updateAvailable);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = onUpdateAvailable(() => setShow(true));
    // 点了“稍后”的话，下次切回前台再提醒
    const onVisible = () => {
      if (document.visibilityState === "visible" && updateAvailable()) setShow(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="update-banner" role="alert">
      <b>🎁 有新版本可以更新</b>
      <div className="small">新题和新功能已经下载好，更新只要几秒，学习记录不会丢。</div>
      <div className="update-actions">
        <button
          className="btn"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void applyUpdate();
          }}
        >
          {busy ? "正在更新…" : "立即更新"}
        </button>
        <button className="btn later" onClick={() => setShow(false)}>稍后</button>
      </div>
    </div>
  );
}
