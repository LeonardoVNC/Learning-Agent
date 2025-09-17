import { randomUUID } from 'crypto';
import { Exam } from '../../domain/entities/exam.entity';
import { Difficulty } from '../../domain/entities/difficulty.vo';
import { PositiveInt } from '../../domain/entities/positive-int.vo';
import { EXAM_STATUS, type ExamStatus } from '../../domain/constants/exam.constants';

export type ExamProps = {
  title: string;
  status?: ExamStatus;
  classId: string;
  difficulty: string;
  attempts: number;
  timeMinutes: number;
  reference?: string | null;
};

export class ExamFactory {
  static create(p: ExamProps): Exam {
    const id = randomUUID();
    const status: ExamStatus = p.status ?? EXAM_STATUS.GUARDADO;

    const difficulty = Difficulty.create(p.difficulty);
    const attempts = PositiveInt.create('attempts', p.attempts);
    const time = PositiveInt.create('timeMinutes', p.timeMinutes);
    const reference = p.reference ?? null;

    return new Exam(
      id,
      p.title?.trim() || 'Examen',
      status,
      p.classId,
      difficulty,
      attempts,
      time,
      reference,
      new Date(),
      new Date(),
    );
  }

  static rehydrate(raw: {
    id: string;
    title: string;
    status: ExamStatus;
    classId: string;
    difficulty: string;
    attempts: number;
    timeMinutes: number;
    reference: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Exam {
    return Exam.rehydrate(raw);
  }
}
