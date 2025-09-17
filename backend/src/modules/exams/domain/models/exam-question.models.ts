import type { ExamQuestion, NewExamQuestion } from '../entities/exam-question.entity';

export type InsertPosition = 'start' | 'middle' | 'end';

export type UpdateExamQuestionPatch = {
    text?: string;
    options?: any[];
    correctOptionIndex?: number;
    correctBoolean?: boolean;
    expectedAnswer?: string;
};

export type DerivedCounts = {
    totalQuestions: number;
    mcqCount: number;
    trueFalseCount: number;
    openAnalysisCount: number;
    openExerciseCount: number;
};

export type { ExamQuestion, NewExamQuestion };
