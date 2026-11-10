// 填空题判分：忽略空格、大小写、全角/半角差异和常见标点

export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[。．.,，、;；:："'“”‘’()（）《》<>【】[\]]/g, "");
}

export function checkFill(input: string, answers: string[]): boolean {
  const v = normalize(input);
  return v.length > 0 && answers.some((a) => normalize(a) === v);
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
