import { describe, expect, it } from "vitest";
import { isDue, localNow, publicKey, WINDOW_MINUTES } from "./reminder.mjs";

describe("学习提醒：是否到点", () => {
  it("按北京时间计算：UTC 12:30 是北京时间 20:30", () => {
    expect(localNow(new Date("2026-11-17T12:30:00Z"))).toEqual({ day: "2026-11-17", minutes: 20 * 60 + 30 });
    expect(localNow(new Date("2026-11-17T16:30:00Z"))).toEqual({ day: "2026-11-18", minutes: 30 });
  });

  it("到点后的补发时间窗内才算到点，之前和之后都不发", () => {
    const at = (h, m) => ({ day: "d", minutes: h * 60 + m });
    expect(isDue("20:30", at(20, 29))).toBe(false);
    expect(isDue("20:30", at(20, 30))).toBe(true);
    expect(isDue("20:30", at(20, 52))).toBe(true);
    expect(isDue("20:30", at(20, 30 + WINDOW_MINUTES - 1))).toBe(true);
    expect(isDue("20:30", at(20, 30 + WINDOW_MINUTES))).toBe(false);
    expect(isDue("7:05", at(7, 7))).toBe(true);
  });

  it("没设置或格式不对时不发", () => {
    expect(isDue("", { day: "d", minutes: 600 })).toBe(false);
    expect(isDue(undefined, { day: "d", minutes: 600 })).toBe(false);
    expect(isDue("8点", { day: "d", minutes: 600 })).toBe(false);
  });

  it("能从 src/data/push.ts 读到公钥这一行", () => {
    expect(typeof publicKey()).toBe("string");
    expect(publicKey().length).toBeGreaterThan(0);
  });
});
