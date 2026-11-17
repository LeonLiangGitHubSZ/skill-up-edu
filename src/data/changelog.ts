// 更新日志：最新的在前。每次推送有用户能感知的变化时，在最前面加一条（id 不能重复）。
export interface Release {
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const RELEASES: Release[] = [
  {
    id: "2026-11-17b",
    date: "2026-11-17",
    title: "更新提示更醒目",
    items: [
      "有新版本时，屏幕顶部会出现醒目的更新横幅",
      "更新完成后会显示这张“已更新”卡片",
      "「我的」页可以看到当前版本、题库题数，也能手动检查更新",
    ],
  },
  {
    id: "2026-11-17",
    date: "2026-11-17",
    title: "第二批题库 + 模拟考试",
    items: [
      "新增 262 道题，3 门课共 882 题",
      "每门课在路线末尾新增两个主观题专项单元",
      "新增模拟考试：在「复习」页底部，按真实题型组卷、限时作答",
    ],
  },
  {
    id: "2026-11-10",
    date: "2026-11-10",
    title: "第一版",
    items: ["3 门课 620 道题，关卡、连胜、体力、遗忘曲线复习"],
  },
];

/**
 * 还没看过的更新说明。seen 是上次看过的 id；
 * 第一版没有记录 seen，这种老用户（有学习记录）显示第一版之后的全部更新，新用户不显示。
 */
export function unseenReleases(seen: string | undefined, hasHistory: boolean, releases: Release[] = RELEASES): Release[] {
  const first = releases[releases.length - 1]?.id;
  if (seen === undefined) return hasHistory ? releases.filter((r) => r.id !== first) : [];
  const i = releases.findIndex((r) => r.id === seen);
  return i === -1 ? releases.slice(0, 1) : releases.slice(0, i);
}
