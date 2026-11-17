// 学习提醒（网页推送）的配置。公钥可以公开；私钥只存在 GitHub 仓库的 Secret（VAPID_PRIVATE_KEY）里。
// scripts/reminder.mjs 会从这个文件读取公钥，改的时候保持 `VAPID_PUBLIC_KEY = "..."` 这个写法。
export const VAPID_PUBLIC_KEY = "BHtwxEV32rTTr310cmXNhA1RXsFV0jEi0Z7WAQwJmgRoCs4Aqtb1yRffWmL08CnDoZRJ_4z4lJfjxACj0OJgr-c";

/** 存放提醒设置的仓库（定时任务在这里运行） */
export const REMINDER_REPO = "LeonLiangGitHubSZ/skill-up-edu";
export const REMINDER_WORKFLOW = "reminder.yml";
export const TOKEN_HELP_URL = "https://github.com/settings/personal-access-tokens/new";
