import type { ExamQuestion, NewExamQuestion, InsertPosition, UpdateExamQuestionPatch, DerivedCounts, } from '../models/exam-question.models';

export interface ExamQuestionRepositoryPort {
  existsExamOwned(examId: string, teacherId: string): Promise<boolean>;

  countByExamOwned(examId: string, teacherId: string): Promise<number>;
  countsByExamOwned(examId: string, teacherId: string): Promise<DerivedCounts>;

  bulkCountsByExamIdsOwned(
    examIds: string[],
    teacherId: string,
  ): Promise<Map<string, DerivedCounts>>;

  addToExamOwned(
    examId: string,
    teacherId: string,
    question: NewExamQuestion,
    position: InsertPosition
  ): Promise<ExamQuestion>;

  findByIdOwned(id: string, teacherId: string): Promise<ExamQuestion | null>;

  updateOwned(
    id: string,
    teacherId: string,
    patch: UpdateExamQuestionPatch
  ): Promise<ExamQuestion>;

  listByExamOwned(examId: string, teacherId: string): Promise<ExamQuestion[]>;
}
