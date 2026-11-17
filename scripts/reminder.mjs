#!/usr/bin/env node
// 学习提醒的定时任务脚本（.github/workflows/reminder.yml 调用）
//   node scripts/reminder.mjs due   判断现在（北京时间）是否到了提醒时间，写出 due / day / test
//   node scripts/reminder.mjs send  发送网页推送（需要先装好 web-push，见工作流）
// 订阅信息只从环境变量读，不打印到日志里（公开仓库的日志所有人可见）。
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TZ = "Asia/Shanghai";
/** 到点之后多长时间内仍然补发（GitHub 定时任务可能延迟；每天只发一次由缓存保证） */
export const WINDOW_MINUTES = 120;
const SUBJECT = "https://leonlianggithubsz.github.io/skill-up-edu/";

export function localNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const v = (t) => parts.find((p) => p.type === t).value;
  return { day: `${v("year")}-${v("month")}-${v("day")}`, minutes: Number(v("hour")) * 60 + Number(v("minute")) };
}

export function isDue(time, now) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? "").trim());
  if (!m) return false;
  const t = Number(m[1]) * 60 + Number(m[2]);
  return now.minutes >= t && now.minutes < t + WINDOW_MINUTES;
}

/** 公钥只在 src/data/push.ts 里维护一份 */
export function publicKey() {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/data/push.ts"), "utf8");
  return /VAPID_PUBLIC_KEY = "([^"]+)"/.exec(src)?.[1] ?? "";
}

const output = (key, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  console.log(`${key}=${value}`);
};

const mode = process.argv[2];
if (mode === "due") {
  const test = process.env.TEST === "true";
  const now = localNow();
  output("day", now.day);
  output("test", String(test));
  output("due", String(test || isDue(process.env.REMINDER_TIME, now)));
}

if (mode === "send") {
  const { default: webpush } = await import("/tmp/webpush/node_modules/web-push/src/index.js");
  const key = publicKey();
  if (!key.startsWith("B") || !process.env.VAPID_PRIVATE_KEY) {
    console.error("缺少推送密钥：src/data/push.ts 的公钥或仓库 Secret VAPID_PRIVATE_KEY");
    process.exit(1);
  }
  let subscription;
  try {
    subscription = JSON.parse(process.env.PUSH_SUBSCRIPTION ?? "");
  } catch {
    console.error("仓库变量 PUSH_SUBSCRIPTION 不是有效的订阅信息：请在 App 里重新开启提醒");
    process.exit(1);
  }
  webpush.setVapidDetails(SUBJECT, key, process.env.VAPID_PRIVATE_KEY);
  try {
    const res = await webpush.sendNotification(subscription, JSON.stringify({ test: process.env.TEST === "true" }), { TTL: 3600, urgency: "high" });
    console.log(`已发送，推送服务返回 ${res.statusCode}`);
  } catch (e) {
    console.error(`发送失败：推送服务返回 ${e.statusCode ?? "未知"}`);
    if (e.statusCode === 404 || e.statusCode === 410) console.error("订阅已失效：请在 App 的「我的 → 每日学习提醒」里重新开启");
    process.exit(1);
  }
}
