export const QUESTION_KIND = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    TRUE_FALSE: 'TRUE_FALSE',
    OPEN_ANALYSIS: 'OPEN_ANALYSIS',
    OPEN_EXERCISE: 'OPEN_EXERCISE',
} as const;

export type QuestionKind = typeof QUESTION_KIND[keyof typeof QUESTION_KIND];

export const ALL_QUESTION_KINDS: readonly QuestionKind[] = Object.values(
    QUESTION_KIND,
) as QuestionKind[];

export const isOpenKind = (
    k: string | undefined,
): k is typeof QUESTION_KIND.OPEN_ANALYSIS | typeof QUESTION_KIND.OPEN_EXERCISE =>
    k === QUESTION_KIND.OPEN_ANALYSIS || k === QUESTION_KIND.OPEN_EXERCISE;
