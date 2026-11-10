import { createEmptyCard, fsrs, Rating, type CardInput, type Grade, type State } from "ts-fsrs";

/** 一道题的记忆卡片（FSRS），日期存 ISO 字符串，方便存进 IndexedDB 和导出 */
export interface CardRec {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
  /** 最近一次的结果 */
  last: Result;
  /** 累计答错次数（错题本用） */
  wrongCount: number;
}

export type Result = "right" | "partial" | "wrong";

const scheduler = fsrs({ enable_fuzz: true });

const GRADE: Record<Result, Grade> = { right: Rating.Good, partial: Rating.Hard, wrong: Rating.Again };

export function nextCard(prev: CardRec | undefined, result: Result, now: Date): CardRec {
  const input: CardInput = prev
    ? {
        due: prev.due,
        stability: prev.stability,
        difficulty: prev.difficulty,
        scheduled_days: prev.scheduled_days,
        learning_steps: prev.learning_steps,
        reps: prev.reps,
        lapses: prev.lapses,
        state: prev.state as State,
        last_review: prev.last_review ?? null,
      }
    : createEmptyCard(now);
  const { card } = scheduler.next(input, now, GRADE[result]);
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
    last: result,
    wrongCount: (prev?.wrongCount ?? 0) + (result === "wrong" ? 1 : 0),
  };
}
