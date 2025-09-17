import { NewExamQuestion } from '../../domain/entities/exam-question.entity';
import type { InsertPosition } from '../../domain/models/exam-question.models';

export class AddExamQuestionCommand {
  constructor(
    public readonly examId: string,
    public readonly teacherId: string,
    public readonly position: InsertPosition,
    public readonly question: NewExamQuestion,
  ) {}
}
