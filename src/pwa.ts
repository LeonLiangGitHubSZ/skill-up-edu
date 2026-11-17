// 离线缓存与更新：发现新版本时通知界面；从后台切回前台、以及每 30 分钟检查一次更新
import { registerSW } from "virtual:pwa-register";

let needRefresh = false;
let registration: ServiceWorkerRegistration | undefined;
let apply: ((reload?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();

export function initPWA() {
  if (apply) return;
  apply = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      listeners.forEach((l) => l());
    },
    onRegisteredSW(_url, r) {
      registration = r;
      if (!r) return;
      window.setInterval(() => void r.update().catch(() => {}), 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void r.update().catch(() => {});
      });
    },
  });
}

export const updateAvailable = () => needRefresh;

export function onUpdateAvailable(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 激活新版本并重新载入页面 */
export const applyUpdate = () => apply?.(true);

/** 手动检查：update = 发现新版本（正在下载或已就绪）；latest = 已是最新；unsupported = 当前环境没有离线缓存 */
export async function checkForUpdate(): Promise<"update" | "latest" | "unsupported"> {
  if (!registration) return "unsupported";
  try {
    await registration.update();
  } catch {
    return "unsupported";
  }
  return needRefresh || registration.installing || registration.waiting ? "update" : "latest";
}
