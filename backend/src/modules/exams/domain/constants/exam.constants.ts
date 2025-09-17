export const EXAM_STATUS = {
    GUARDADO: 'Guardado',
    PUBLICADO: 'Publicado',
} as const;
export type ExamStatus = typeof EXAM_STATUS[keyof typeof EXAM_STATUS];
export const ALL_EXAM_STATUS: readonly ExamStatus[] = Object.values(EXAM_STATUS) as ExamStatus[];

export const EXAM_DIFFICULTY = {
    FACIL: 'fácil',
    MEDIO: 'medio',
    DIFICIL: 'difícil',
} as const;
export type ExamDifficulty = typeof EXAM_DIFFICULTY[keyof typeof EXAM_DIFFICULTY];
export const ALL_EXAM_DIFFICULTY: readonly ExamDifficulty[] = Object.values(EXAM_DIFFICULTY) as ExamDifficulty[];

export const LLM_DEFAULTS = {
    PROVIDER: process.env.LLM_PROVIDER ?? 'ollama',
    MODEL: process.env.LLM_MODEL ?? 'llama2',
    FORMAT: 'json',
} as const;

export const QUESTION_TYPE = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
    OPEN_ANALYSIS: 'open_analysis',
    OPEN_EXERCISE: 'open_exercise',
} as const;

export type QuestionType = typeof QUESTION_TYPE[keyof typeof QUESTION_TYPE];