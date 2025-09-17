import { Inject, Injectable } from '@nestjs/common';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';

export type ListClassExamsQuery = { classId: string; teacherId: string };

@Injectable()
export class ListClassExamsUseCase {
    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
    ) { }

    async execute(q: ListClassExamsQuery) {
        const exams = await this.examRepo.listByClassOwned(q.classId, q.teacherId);
        return exams.map(e => ({
            id: e.id,
            title: e.title,
            classId: e.classId,
            status: e.status,
            difficulty: e.difficulty?.getValue(),
            attempts: e.attempts?.getValue(),
            timeMinutes: e.timeMinutes?.getValue(),
            reference: e.reference,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
        }));
    }
}
