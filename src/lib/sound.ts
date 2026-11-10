// 简单合成音效（iPhone 不支持网页震动，用声音和动画做反馈）
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};

function tone(freqs: number[], step = 0.12, type: OscillatorType = "sine", volume = 0.18) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(volume, t0 + i * step);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + (i + 1) * step + 0.1);
      o.connect(g).connect(ctx!.destination);
      o.start(t0 + i * step);
      o.stop(t0 + (i + 1) * step + 0.12);
    });
  } catch {
    // 没有音频也不影响使用
  }
}

export const sounds = {
  tap: () => tone([520], 0.04, "sine", 0.08),
  right: () => tone([660, 880], 0.09),
  wrong: () => tone([220, 180], 0.14, "square", 0.08),
  done: () => tone([523, 659, 784, 1047], 0.11),
};
