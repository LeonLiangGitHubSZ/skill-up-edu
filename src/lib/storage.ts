import { get, set } from "idb-keyval";
import { dayKey } from "./date";
import { migrate, type AppState } from "./state";

const KEY = "skillup-state-v1";

export async function loadState(): Promise<AppState> {
  try {
    return migrate(await get(KEY));
  } catch {
    return migrate(null);
  }
}

export async function saveState(s: AppState): Promise<void> {
  await set(KEY, s);
}

/** 请求持久化存储，降低被系统清理的概率（加到主屏幕后 iOS 不按 7 天规则清理） */
export async function requestPersist(): Promise<void> {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // 不支持就算了
  }
}

/** 导出备份：能用系统分享就分享（iPhone 可存到“文件”），否则直接下载 */
export async function exportBackup(s: AppState): Promise<"shared" | "downloaded"> {
  const name = `skillup-backup-${dayKey()}.json`;
  const blob = new Blob([JSON.stringify(s)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Skill Up EDU 备份" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return "downloaded";
}

export async function readBackup(file: File): Promise<AppState> {
  const data = JSON.parse(await file.text());
  if (!data || data.v !== 1 || typeof data.cards !== "object") throw new Error("不是 Skill Up EDU 的备份文件");
  return migrate(data);
}
