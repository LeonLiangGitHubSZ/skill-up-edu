// 更新日志：最新的在前。每次推送有用户能感知的变化时，在最前面加一条（id 不能重复）。
export interface Release {
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const RELEASES: Release[] = [
  {
    id: "2026-11-19b",
    date: "2026-11-19",
    title: "6 门实践课",
    items: [
      "新增 6 门实践课 790 道题：C 语言、数据结构、MySQL、Java、Java Web、软件工程，现在 20 门课共 4225 题",
      "每课有上机细节题，加上带完整参考答案的上机题；参考答案都实际运行过",
      "每门实践课都能做上机模拟考试（考核形式是推测的，以南航通知为准）",
      "程序填空题的引号要写对：代码里的 '0' 和 0 意思不同",
    ],
  },
  {
    id: "2026-11-19",
    date: "2026-11-19",
    title: "其余 11 门课的题库",
    items: [
      "新增 11 门课 2553 道题，现在 14 门课共 3435 题（习思想概论暂缺）",
      "新题型：多选题、英语阅读材料、程序改错、名词解释、英译汉和写作",
      "这 11 门课都能做模拟考试；英语按真题每部分一篇材料组卷",
      "在「路线」把课标成「备考」：它才会出现在课程菜单的「正在备考」、复习页的模拟考试里，并计入每天的目标",
    ],
  },
  {
    id: "2026-11-17c",
    date: "2026-11-17",
    title: "每日学习提醒",
    items: [
      "「我的 → 每日学习提醒」可以设定每天的提醒时间（需要从主屏幕图标打开）",
      "提醒会写今天还差几课、连胜几天、离考试还有几天",
      "可以先点“发送测试提醒”确认能收到",
    ],
  },
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
