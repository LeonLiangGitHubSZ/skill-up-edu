import { describe, expect, it } from "vitest";
import { RELEASES, unseenReleases, type Release } from "./changelog";

const r = (id: string): Release => ({ id, date: id, title: id, items: [id] });
const list = [r("c"), r("b"), r("a")]; // 最新的在前，a 是第一版

describe("更新说明", () => {
  it("从第一版升级上来的老用户（没有记录、有学习记录）看到第一版之后的全部更新", () => {
    expect(unseenReleases(undefined, true, list).map((x) => x.id)).toEqual(["c", "b"]);
  });
  it("新用户不显示", () => {
    expect(unseenReleases(undefined, false, list)).toEqual([]);
  });
  it("看过 b 的用户只看到更新的 c；看过最新的不显示", () => {
    expect(unseenReleases("b", true, list).map((x) => x.id)).toEqual(["c"]);
    expect(unseenReleases("c", true, list)).toEqual([]);
  });
  it("记录的 id 已经不存在时只显示最新一条", () => {
    expect(unseenReleases("zz", true, list).map((x) => x.id)).toEqual(["c"]);
  });
  it("真实的更新日志 id 不重复、最新的在前", () => {
    const ids = RELEASES.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...RELEASES].sort((x, y) => y.date.localeCompare(x.date)).map((x) => x.date)).toEqual(RELEASES.map((x) => x.date));
  });
});
