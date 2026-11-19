// 填空题判分：忽略空格、大小写、全角/半角差异、分隔符和引号；
// 保留括号和小数点（(n+1)/2 和 n+1/2、1.5 和 15 意思不同）

export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[−–]/g, "-")
    .replace(/[,、;:"'“”‘’《》【】]/g, "")
    .replace(/[。.]$/, "");
}

/** 答案以中文全角括号结尾时（如“第一范式（1NF）”），括号里外的写法都算对 */
function variants(answer: string): string[] {
  const m = /^(.+?)（(.+)）$/.exec(answer.trim());
  return m ? [answer, m[1], m[2]] : [answer];
}

export function checkFill(input: string, answers: string[]): boolean {
  const v = normalize(input);
  return v.length > 0 && answers.flatMap(variants).some((a) => normalize(a) === v);
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
