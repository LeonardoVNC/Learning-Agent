import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  DerivedCounts,
  InsertPosition,
  UpdateExamQuestionPatch,
} from '../../domain/models/exam-question.models';
import { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import { ExamQuestion } from '../../domain/entities/exam-question.entity';

type Kind = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ANALYSIS' | 'OPEN_EXERCISE';

function mapRowToDomain(q: any): ExamQuestion {
  return {
    id: q.id,
    examId: q.examId,
    kind: q.kind as Kind,
    text: q.text,
    order: q.order,
    options: q.mcq ? q.mcq.options.map((o: any) => o.text) : undefined,
    correctOptionIndex: q.mcq?.correctOptionIndex ?? undefined,
    correctBoolean: q.trueFalse?.answer ?? undefined,
    expectedAnswer:
      q.openAnalysis?.expectedAnswer ??
      q.openExercise?.expectedAnswer ??
      undefined,
  } as ExamQuestion;
}

@Injectable()
export class PrismaExamQuestionRepository implements ExamQuestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private ownedExamWhere(examId: string, teacherId: string) {
    return {
      id: examId,
      class: { course: { teacherId } },
    };
  }

  private ownedQuestionWhere(questionId: string, teacherId: string) {
    return {
      id: questionId,
      exam: { class: { course: { teacherId } } },
    };
  }

  async existsExamOwned(examId: string, teacherId: string): Promise<boolean> {
    const n = await this.prisma.exam.count({
      where: this.ownedExamWhere(examId, teacherId),
    });
    return n > 0;
  }

  async countByExamOwned(examId: string, teacherId: string): Promise<number> {
    return this.prisma.examQuestion.count({
      where: { examId, exam: { class: { course: { teacherId } } } },
    });
  }

  async countsByExamOwned(
    examId: string,
    teacherId: string,
  ): Promise<DerivedCounts> {
    const list = await this.prisma.examQuestion.findMany({
      where: { examId, exam: { class: { course: { teacherId } } } },
      select: { kind: true },
    });

    let mcq = 0,
      tf = 0,
      oa = 0,
      oe = 0;
    for (const r of list) {
      switch (r.kind as Kind) {
        case 'MULTIPLE_CHOICE':
          mcq++;
          break;
        case 'TRUE_FALSE':
          tf++;
          break;
        case 'OPEN_ANALYSIS':
          oa++;
          break;
        case 'OPEN_EXERCISE':
          oe++;
          break;
      }
    }

    return {
      totalQuestions: list.length,
      mcqCount: mcq,
      trueFalseCount: tf,
      openAnalysisCount: oa,
      openExerciseCount: oe,
    };
  }

  async bulkCountsByExamIdsOwned(
    examIds: string[],
    teacherId: string,
  ): Promise<Map<string, DerivedCounts>> {
    const out = new Map<string, DerivedCounts>();
    if (examIds.length === 0) return out;

    const rows = await this.prisma.examQuestion.findMany({
      where: {
        examId: { in: examIds },
        exam: { class: { course: { teacherId } } },
      },
      select: { examId: true, kind: true },
    });

    const tmp = new Map<
      string,
      { total: number; mcq: number; tf: number; oa: number; oe: number }
    >();
    for (const r of rows) {
      const bucket =
        tmp.get(r.examId) || { total: 0, mcq: 0, tf: 0, oa: 0, oe: 0 };
      bucket.total++;
      switch (r.kind as Kind) {
        case 'MULTIPLE_CHOICE':
          bucket.mcq++;
          break;
        case 'TRUE_FALSE':
          bucket.tf++;
          break;
        case 'OPEN_ANALYSIS':
          bucket.oa++;
          break;
        case 'OPEN_EXERCISE':
          bucket.oe++;
          break;
      }
      tmp.set(r.examId, bucket);
    }

    for (const id of examIds) {
      const b = tmp.get(id) || { total: 0, mcq: 0, tf: 0, oa: 0, oe: 0 };
      out.set(id, {
        totalQuestions: b.total,
        mcqCount: b.mcq,
        trueFalseCount: b.tf,
        openAnalysisCount: b.oa,
        openExerciseCount: b.oe,
      });
    }
    return out;
  }

  async addToExamOwned(
    examId: string,
    teacherId: string,
    question: any, 
    position: InsertPosition,
  ): Promise<ExamQuestion> {
    const exists = await this.existsExamOwned(examId, teacherId);
    if (!exists) throw new Error('Exam not found or not owned by teacher.');

    return this.prisma.$transaction(async (tx) => {
      const max = await tx.examQuestion.aggregate({
        where: { examId },
        _max: { order: true },
      });
      const currentMax = max._max.order ?? 0;

      let targetOrder = currentMax + 1;
      if (position === 'start') {
        targetOrder = 1;
        await tx.examQuestion.updateMany({
          where: { examId },
          data: { order: { increment: 1 } },
        });
      } else if (position === 'middle') {
        targetOrder = Math.floor((currentMax + 2) / 2); 
        await tx.examQuestion.updateMany({
          where: { examId, order: { gte: targetOrder } },
          data: { order: { increment: 1 } },
        });
      } 

      const createdQuestion = await tx.examQuestion.create({
        data: {
          examId,
          kind: question.kind,
          text: question.text.trim(),
          order: targetOrder,
        },
      });

      switch (question.kind as Kind) {
        case 'MULTIPLE_CHOICE': {
          await tx.mCQ.create({
            data: {
              questionId: createdQuestion.id,
              correctOptionIndex: question.correctOptionIndex,
            },
          });
          const options = (question.options ?? []).map((text: string, idx: number) => ({
            mcqId: createdQuestion.id,
            idx,
            text,
          }));
          if (options.length > 0) {
            await tx.mCQOption.createMany({ data: options });
          }
          break;
        }
        case 'TRUE_FALSE': {
          await tx.trueFalse.create({
            data: {
              questionId: createdQuestion.id,
              answer: !!question.correctBoolean,
            },
          });
          break;
        }
        case 'OPEN_ANALYSIS': {
          await tx.openAnalysis.create({
            data: {
              questionId: createdQuestion.id,
              expectedAnswer: question.expectedAnswer ?? '',
            },
          });
          break;
        }
        case 'OPEN_EXERCISE': {
          await tx.openExercise.create({
            data: {
              questionId: createdQuestion.id,
              expectedAnswer: question.expectedAnswer ?? '',
            },
          });
          break;
        }
      }

      const row = await tx.examQuestion.findUnique({
        where: { id: createdQuestion.id },
        include: {
          mcq: { include: { options: { orderBy: { idx: 'asc' } } } },
          trueFalse: true,
          openAnalysis: true,
          openExercise: true,
        },
      });

      return mapRowToDomain(row);
    });
  }

  async findByIdOwned(
    id: string,
    teacherId: string,
  ): Promise<ExamQuestion | null> {
    const row = await this.prisma.examQuestion.findFirst({
      where: this.ownedQuestionWhere(id, teacherId),
      include: {
        mcq: { include: { options: { orderBy: { idx: 'asc' } } } },
        trueFalse: true,
        openAnalysis: true,
        openExercise: true,
      },
    });
    if (!row) return null;
    return mapRowToDomain(row);
  }

  async updateOwned(
    id: string,
    teacherId: string,
    patch: UpdateExamQuestionPatch,
  ): Promise<ExamQuestion> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.examQuestion.findFirst({
        where: this.ownedQuestionWhere(id, teacherId),
        include: {
          mcq: { include: { options: true } },
          trueFalse: true,
          openAnalysis: true,
          openExercise: true,
        },
      });
      if (!current) throw new Error('Question not found or not owned by teacher.');

      if (patch.text !== undefined) {
        await tx.examQuestion.update({
          where: { id },
          data: { text: patch.text.trim() },
        });
      }

      switch (current.kind as Kind) {
        case 'MULTIPLE_CHOICE': {
          if (patch.options) {
            await tx.mCQOption.deleteMany({ where: { mcqId: id } });
            if (patch.options.length > 0) {
              await tx.mCQOption.createMany({
                data: patch.options.map((text, idx) => ({
                  mcqId: id,
                  idx,
                  text: String(text),
                })),
              });
            }
          }
          if (patch.correctOptionIndex != null) {
            const count = await tx.mCQOption.count({ where: { mcqId: id } });
            if (
              patch.correctOptionIndex < 0 ||
              patch.correctOptionIndex >= count
            ) {
              throw new Error('correctOptionIndex out of range.');
            }
            await tx.mCQ.update({
              where: { questionId: id },
              data: { correctOptionIndex: patch.correctOptionIndex },
            });
          }
          break;
        }

        case 'TRUE_FALSE': {
          if (patch.correctBoolean != null) {
            await tx.trueFalse.update({
              where: { questionId: id },
              data: { answer: !!patch.correctBoolean },
            });
          }
          break;
        }

        case 'OPEN_ANALYSIS': {
          if (patch.expectedAnswer !== undefined) {
            await tx.openAnalysis.update({
              where: { questionId: id },
              data: { expectedAnswer: String(patch.expectedAnswer) },
            });
          }
          break;
        }

        case 'OPEN_EXERCISE': {
          if (patch.expectedAnswer !== undefined) {
            await tx.openExercise.update({
              where: { questionId: id },
              data: { expectedAnswer: String(patch.expectedAnswer) },
            });
          }
          break;
        }
      }

      const updated = await tx.examQuestion.findUnique({
        where: { id },
        include: {
          mcq: { include: { options: { orderBy: { idx: 'asc' } } } },
          trueFalse: true,
          openAnalysis: true,
          openExercise: true,
        },
      });

      return mapRowToDomain(updated);
    });
  }

  async listByExamOwned(
    examId: string,
    teacherId: string,
  ): Promise<ExamQuestion[]> {
    const rows = await this.prisma.examQuestion.findMany({
      where: { examId, exam: { class: { course: { teacherId } } } },
      orderBy: [{ order: 'asc' }],
      include: {
        mcq: { include: { options: { orderBy: { idx: 'asc' } } } },
        trueFalse: true,
        openAnalysis: true,
        openExercise: true,
      },
    });
    return rows.map(mapRowToDomain);
  }
}
