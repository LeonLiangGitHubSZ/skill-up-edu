// 专业计划与考试日程。来源：江苏省教育考试院
// - 专业计划：江苏自考信息系统「专业计划查询」X2080901（2024 版）
// - 2027 年 1 月日程：苏教考自〔2026〕7 号（2026-05-13）
// - 4 月 / 7 月 / 10 月：按 2025、2026 年官方日程推测，等官方公布后更新

export type Slot = "sat-am" | "sat-pm" | "sun-am" | "sun-pm";
export const SLOT_LABEL: Record<Slot, string> = {
  "sat-am": "周六上午",
  "sat-pm": "周六下午",
  "sun-am": "周日上午",
  "sun-pm": "周日下午",
};
const SLOT_START: Record<Slot, [day: 0 | 1, hour: number, minute: number]> = {
  "sat-am": [0, 9, 0],
  "sat-pm": [0, 14, 30],
  "sun-am": [1, 9, 0],
  "sun-pm": [1, 14, 30],
};

export type CourseGroup = "思政" | "公共基础" | "专业核心" | "专业应用" | "二选一" | "实践" | "毕业设计";

export interface CourseInfo {
  code: string;
  name: string;
  /** 顶栏等窄处显示 */
  short: string;
  credits: number;
  group: CourseGroup;
  /** 学位课 */
  degree?: boolean;
  /** 省考课程（南航命题） */
  provincial?: boolean;
  note?: string;
}

export const MAJOR = {
  code: "X2080901",
  name: "计算机科学与技术（专升本）",
  school: "南京航空航天大学",
  plan: "2024 版",
  /** 二选一选 04751 时的毕业学分 */
  minCredits: 73,
};

export const COURSES: CourseInfo[] = [
  { code: "15040", name: "习近平新时代中国特色社会主义思想概论", short: "习思想概论", credits: 3, group: "思政" },
  { code: "15043", name: "中国近现代史纲要", short: "近现代史", credits: 3, group: "思政" },
  { code: "15044", name: "马克思主义基本原理", short: "马原", credits: 3, group: "思政" },
  { code: "13000", name: "英语（专升本）", short: "英语", credits: 7, group: "公共基础", degree: true },
  { code: "00023", name: "高等数学（工本）", short: "高数", credits: 10, group: "公共基础" },
  { code: "02324", name: "离散数学", short: "离散", credits: 4, group: "公共基础" },
  { code: "13013", name: "高级语言程序设计", short: "高级语言", credits: 4, group: "专业核心" },
  { code: "13003", name: "数据结构与算法", short: "数据结构", credits: 4, group: "专业核心", degree: true },
  { code: "13015", name: "计算机系统原理", short: "系统原理", credits: 4, group: "专业核心", degree: true },
  { code: "13180", name: "操作系统", short: "操作系统", credits: 4, group: "专业核心", degree: true },
  { code: "02333", name: "软件工程", short: "软件工程", credits: 3, group: "专业应用" },
  { code: "00898", name: "互联网软件应用与开发", short: "互联网软件", credits: 3, group: "专业应用", provincial: true },
  { code: "04735", name: "数据库系统原理", short: "数据库", credits: 4, group: "专业应用" },
  { code: "04747", name: "Java 语言程序设计（一）", short: "Java", credits: 3, group: "专业应用" },
  { code: "04751", name: "计算机网络安全", short: "网络安全", credits: 3, group: "二选一", provincial: true, note: "与 13017 二选一；选它毕业要求 73 学分" },
  { code: "13017", name: "计算机网络与信息安全", short: "网络与信安", credits: 6, group: "二选一", note: "与 04751 二选一；排在周六下午，会多占一个考期" },
  { code: "13014", name: "高级语言程序设计（实践）", short: "高级语言实践", credits: 2, group: "实践" },
  { code: "13004", name: "数据结构与算法（实践）", short: "数据结构实践", credits: 2, group: "实践" },
  { code: "02334", name: "软件工程（实践）", short: "软工实践", credits: 1, group: "实践" },
  { code: "00899", name: "互联网软件应用与开发（实践）", short: "互联网软件实践", credits: 3, group: "实践" },
  { code: "04736", name: "数据库系统原理（实践）", short: "数据库实践", credits: 2, group: "实践" },
  { code: "04748", name: "Java 语言程序设计（一）（实践）", short: "Java 实践", credits: 1, group: "实践" },
  { code: "14976", name: "毕业设计", short: "毕业设计", credits: 0, group: "毕业设计", note: "须先通过全部课程才能报考" },
];

export const courseByCode = (code: string) => COURSES.find((c) => c.code === code);

export interface ExamSession {
  id: string;
  label: string;
  /** official = 官方已公布；projected = 按往年推测 */
  status: "official" | "projected";
  /** 两天考试日期（周六、周日） */
  days?: [string, string];
  registration?: { start: string; end: string; estimated: boolean; note: string };
  /** 本专业在这一考期开考的课程及时段 */
  slots: Record<string, Slot>;
  note?: string;
}

const NATIONAL_SLOTS: Record<string, Slot> = {
  "02324": "sat-am", "15044": "sat-am",
  "00023": "sat-pm", "13003": "sat-pm", "13013": "sat-pm", "13017": "sat-pm", "15040": "sat-pm",
  "13180": "sun-am", "15043": "sun-am",
  "13000": "sun-pm", "13015": "sun-pm",
};

export const SESSIONS: ExamSession[] = [
  {
    id: "2027-01",
    label: "2027 年 1 月",
    status: "official",
    days: ["2027-01-09", "2027-01-10"],
    registration: {
      start: "2026-12-01",
      end: "2026-12-05",
      estimated: true,
      note: "按往年推算（每天 9:00–17:00 前），官方报名通告预计 11 月下旬发布。新生注册和报考同时办，要先上传“三照”做身份验证，每天最多验证 3 次。",
    },
    slots: { "04751": "sat-am", "04735": "sun-am", "00898": "sun-pm" },
    note: "苏教考自〔2026〕7 号公布。1 月是省考，本专业只开这 3 门，时段不冲突，可以全报。",
  },
  {
    id: "2027-04",
    label: "2027 年 4 月",
    status: "projected",
    // 日期按往年（4 月第二个周末）推算，官方公布后更新
    days: ["2027-04-10", "2027-04-11"],
    registration: {
      start: "2027-03-01",
      end: "2027-03-05",
      estimated: true,
      note: "按往年推算，官方报名通告一般在 2 月下旬发布。",
    },
    slots: { ...NATIONAL_SLOTS, "04747": "sun-am", "02333": "sun-pm" },
    note: "按 2025、2026 年 4 月日程推测（两年完全相同），考试日期也是按往年推算的，日程预计 11 月下旬公布。",
  },
  {
    id: "2027-07",
    label: "2027 年 7 月",
    status: "projected",
    slots: { "04747": "sun-am", "02333": "sun-pm" },
    note: "按 2026 年 7 月日程推测。",
  },
  {
    id: "2027-10",
    label: "2027 年 10 月",
    status: "projected",
    slots: { ...NATIONAL_SLOTS, "04751": "sat-am", "04735": "sun-am", "00898": "sun-pm" },
    note: "按 2026 年 10 月日程推测。",
  },
];

/** 周六下午的 4 门必考课只在 4 月、10 月开考，一个考期只能考一门：决定最早毕业时间 */
export const CRITICAL_SLOT_COURSES = ["00023", "13003", "13013", "15040"];

/**
 * 有题库（或正在写题库）的课程，以及最早能考的考期。
 * startStudying = 新用户默认标成“备考”；其余课程要在路线页手动标成“备考”才计入每天的目标。
 */
export const STUDY_PLAN: { code: string; session: string; startStudying?: boolean }[] = [
  { code: "04751", session: "2027-01", startStudying: true },
  { code: "04735", session: "2027-01", startStudying: true },
  { code: "00898", session: "2027-01", startStudying: true },
  { code: "13013", session: "2027-04" },
  { code: "15040", session: "2027-04" },
  { code: "15044", session: "2027-04" },
  { code: "15043", session: "2027-04" },
  { code: "13015", session: "2027-04" },
  { code: "13180", session: "2027-04" },
  { code: "02324", session: "2027-04" },
  { code: "13003", session: "2027-04" },
  { code: "13000", session: "2027-04" },
  { code: "00023", session: "2027-04" },
  { code: "04747", session: "2027-04" },
  { code: "02333", session: "2027-04" },
];

export const sessionById = (id: string) => SESSIONS.find((s) => s.id === id);

/** 某门课在某考期的开考时间（本地时间）；考期未公布具体日期时返回 null */
export function examStart(code: string, sessionId: string): Date | null {
  const session = sessionById(sessionId);
  const slot = session?.slots[code];
  if (!session?.days || !slot) return null;
  const [dayIndex, h, m] = SLOT_START[slot];
  const [y, mo, d] = session.days[dayIndex].split("-").map(Number);
  return new Date(y, mo - 1, d, h, m);
}
