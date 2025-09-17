import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';

export class ListExamsQuery {
  constructor(
    public readonly teacherId: string,
    public readonly classId?: string,
  ) { }
}

@Injectable()
export class ListExamsQueryHandler {
  constructor(
    @Inject(EXAM_REPO) private readonly repo: ExamRepositoryPort,
  ) { }

  async execute(q: ListExamsQuery) {
    if (!q.classId?.trim()) {
      throw new BadRequestException(
        'classId is required with the current repository API.',
      );
    }

    const exams = await this.repo.listByClassOwned(q.classId, q.teacherId);
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
