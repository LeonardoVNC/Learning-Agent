import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EXAM_REPO, EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import { ExamMapper } from '../../infrastructure/mappers/exam.mapper';
import { QUESTION_KIND } from '../../domain/constants/question-kind.constants';

export type GetExamByIdQuery = { examId: string; teacherId: string };

function toCorrectAnswer(q: any) {
    switch (q.kind) {
        case QUESTION_KIND.MULTIPLE_CHOICE:
            return q.correctOptionIndex != null ? q.options?.[q.correctOptionIndex] ?? null : null;
        case QUESTION_KIND.TRUE_FALSE:
            return q.correctBoolean ?? null;
        case QUESTION_KIND.OPEN_ANALYSIS:
        case QUESTION_KIND.OPEN_EXERCISE:
            return q.expectedAnswer ?? null;
        default:
            return null;
    }
}

@Injectable()
export class GetExamByIdUseCase {
    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
        @Inject(EXAM_QUESTION_REPO) private readonly questionRepo: ExamQuestionRepositoryPort,
    ) { }

    async execute(q: GetExamByIdQuery) {
        const exam = await this.examRepo.findByIdOwned(q.examId, q.teacherId);
        if (!exam) {
            throw new NotFoundException('Exam not found or not owned by teacher.');
        }

        const questions = await this.questionRepo.listByExamOwned(q.examId, q.teacherId);

        return {
            exam: ExamMapper.toPersistence(exam),
            questions: questions.map((qq: any) => ({
                id: qq.id,
                kind: qq.kind,                      
                text: qq.text,
                options: qq.options ?? null,
                correctOptionIndex: qq.correctOptionIndex ?? null,
                correctBoolean: qq.correctBoolean ?? null,
                expectedAnswer: qq.expectedAnswer ?? null,
                correctAnswer: toCorrectAnswer(qq),
                order: qq.order,
            })),
        };
    }
}
