import { Difficulty } from './difficulty.vo';
import { PositiveInt } from './positive-int.vo';
import { ExamStatus } from '../constants/exam.constants';

export class Exam {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly status: ExamStatus,
    public readonly classId: string,
    public readonly difficulty: Difficulty,
    public readonly attempts: PositiveInt,
    public readonly timeMinutes: PositiveInt,
    public readonly reference: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

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
    return new Exam(
      raw.id,
      raw.title,
      raw.status,
      raw.classId,
      Difficulty.create(raw.difficulty),
      PositiveInt.create('attempts', raw.attempts),
      PositiveInt.create('timeMinutes', raw.timeMinutes),
      raw.reference ?? null,
      new Date(raw.createdAt),
      new Date(raw.updatedAt),
    );
  }
}
