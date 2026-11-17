# Skill Up EDU

江苏自考 计算机科学与技术（专升本，X2080901，主考南京航空航天大学）个人学习助手。手机网页应用（PWA），加到 iPhone 主屏幕后全屏、离线可用。

- 借鉴多邻国的机制：关卡路线、连胜、经验值、体力、即时反馈。
- 按考期制造紧迫感：倒计时、需要的速度和实际速度对比、报名提醒、考前冲刺周。
- 错题和学过的题按 FSRS 遗忘曲线安排复习。
- 模拟考试：按各门课的试卷结构从题库抽题组卷，限时作答，交卷后客观题自动判分、主观题对照要点自评。
- 学习记录只存在本机（IndexedDB），可以导出 / 导入备份。

第一版覆盖 2027 年 1 月考期的 3 门课：04751 计算机网络安全、04735 数据库系统原理、00898 互联网软件应用与开发。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm test           # 单元测试
npm run check      # 校验题库
npm run build      # 构建到 dist/
```

## 题库

- 位置：`src/data/banks/<课程代码>/uNN.json`，一章一个文件，格式见 `src/data/types.ts`。
- 编写规范：项目根目录 `docs/question-bank-spec.md`。
- 题目由 AI 按江苏省教育考试院公布的考试大纲原创，答案以指定教材为准。

## 部署

推送到 GitHub 的 `main` 分支后，`.github/workflows/deploy.yml` 自动校验题库、跑测试、构建并发布到 GitHub Pages（构建时 `BASE_PATH` 设为 `/<仓库名>/`）。
