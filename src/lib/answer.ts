// 填空题判分：忽略空格、大小写、全角/半角差异、分隔符和引号；
// 保留括号和小数点（(n+1)/2 和 n+1/2、1.5 和 15 意思不同）。
// 程序填空（代码里留了 ______ 的空）和带英文引号的答案，引号要一致：代码里的 '0' 和 0、"a" 和 'a' 意思不同。
// 读程序写结果（有代码、没有空）仍按普通填空判。

export function normalize(s: string, keepQuotes = false): string {
  let t = s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[−–]/g, "-");
  // iPhone 键盘的“智能标点”会把 ' " 换成弯引号，先换回来
  if (keepQuotes) t = t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[,、;:《》【】]/g, "");
  else t = t.replace(/[,、;:"'“”‘’《》【】]/g, "");
  return t.replace(/[。.]$/, "");
}

const HAS_ASCII_QUOTE = /['"]/;

/** 答案以中文全角括号结尾时（如“第一范式（1NF）”），括号里外的写法都算对 */
function variants(answer: string): string[] {
  const m = /^(.+?)（(.+)）$/.exec(answer.trim());
  return m ? [answer, m[1], m[2]] : [answer];
}

/** code：题目的代码。代码里有 ______（程序填空）时，引号一律要一致 */
export function checkFill(input: string, answers: string[], code?: string): boolean {
  if (normalize(input).length === 0) return false;
  const blank = code !== undefined && /_{4,}/.test(code);
  return answers.flatMap(variants).some((a) => {
    const keep = blank || HAS_ASCII_QUOTE.test(a);
    return normalize(a, keep) === normalize(input, keep);
  });
}

/** 打乱选项顺序，返回新顺序里每个位置对应的原选项下标 */
export function shuffledOrder(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** 选项的显示顺序：keepOrder 时按原顺序，否则打乱 */
export function optionOrder(q: { type: string; options?: string[]; keepOrder?: boolean }): number[] {
  const n = q.options?.length ?? 4;
  return q.keepOrder ? Array.from({ length: n }, (_, i) => i) : shuffledOrder(n);
}
