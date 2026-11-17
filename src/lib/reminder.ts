// 学习提醒：生成给推送用的学习摘要、订阅网页推送、把设置写到 GitHub 仓库的 Actions 变量
import { del, get, set } from "idb-keyval";
import { courseByCode, STUDY_PLAN } from "../data/program";
import { REMINDER_REPO, REMINDER_WORKFLOW, VAPID_PUBLIC_KEY } from "../data/push";
import { dayKey } from "./date";
import { coursePace } from "./pace";
import { dueQuestions, type AppState } from "./state";

/** 给 Service Worker 读的学习摘要（推送到达时按它生成通知文字） */
export interface ReminderSummary {
  day: string;
  goal: number;
  done: number;
  streak: number;
  due: number;
  next: { name: string; daysLeft: number } | null;
}

export const SUMMARY_KEY = "skillup-reminder";
const TOKEN_KEY = "skillup-github-token";

export function reminderSummary(s: AppState, now = new Date()): ReminderSummary {
  const paces = STUDY_PLAN.map((p) => coursePace(s, p.code, now));
  const upcoming = paces
    .filter((p) => p.daysLeft !== null && p.daysLeft >= 0)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
  return {
    day: dayKey(now),
    goal: paces.reduce((n, p) => n + p.todayTarget, 0),
    done: paces.reduce((n, p) => n + Math.min(p.todayDone, p.todayTarget), 0),
    streak: s.streak,
    due: dueQuestions(s, now).length,
    next: upcoming ? { name: courseByCode(upcoming.code)?.short ?? upcoming.code, daysLeft: upcoming.daysLeft ?? 0 } : null,
  };
}

export async function saveSummary(s: AppState) {
  try {
    await set(SUMMARY_KEY, reminderSummary(s));
  } catch {
    // 推送文字退回通用说法，不影响使用
  }
}

// 令牌只存在本机，单独存放，不进学习记录，也不会被导出到备份里
export const loadToken = () => get<string>(TOKEN_KEY);
export const saveToken = (t: string) => set(TOKEN_KEY, t.trim());
export const forgetToken = () => del(TOKEN_KEY);

export type PushSupport = "ok" | "not-installed" | "unsupported" | "not-configured";

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY.startsWith("B")) return "not-configured";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    return ios && !standalone ? "not-installed" : "unsupported";
  }
  return "ok";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** 申请通知权限并订阅推送；必须在点击按钮的处理函数里调用 */
export async function subscribePush(): Promise<PushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("没有通知权限：请在 iPhone 设置 → 通知 → Skill Up 里允许通知");
  const reg = await navigator.serviceWorker.ready;
  return (
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  );
}

async function githubApi(token: string, method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`https://api.github.com/repos/${REMINDER_REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function explain(status: number): string {
  if (status === 401) return "令牌无效或已过期，请重新创建";
  if (status === 403 || status === 404) return "令牌权限不够：需要只针对 skill-up-edu 仓库，Actions 和 Variables 都选 Read and write";
  return `GitHub 返回错误 ${status}，稍后再试`;
}

async function setVariable(token: string, name: string, value: string) {
  let res = await githubApi(token, "PATCH", `/actions/variables/${name}`, { name, value });
  if (res.status === 404) res = await githubApi(token, "POST", "/actions/variables", { name, value });
  if (!res.ok) throw new Error(explain(res.status));
}

/** 把订阅和提醒时间写进仓库变量，定时任务按它们发送 */
export async function saveReminder(token: string, r: { enabled: boolean; time: string; subscription?: PushSubscription }) {
  if (r.subscription) await setVariable(token, "PUSH_SUBSCRIPTION", JSON.stringify(r.subscription));
  await setVariable(token, "REMINDER_TIME", r.time);
  await setVariable(token, "REMINDER_ENABLED", r.enabled ? "true" : "false");
}

/** 让定时任务马上发一条测试提醒 */
export async function sendTestReminder(token: string) {
  const res = await githubApi(token, "POST", `/actions/workflows/${REMINDER_WORKFLOW}/dispatches`, { ref: "main", inputs: { test: true } });
  if (res.status !== 204) throw new Error(explain(res.status));
}
