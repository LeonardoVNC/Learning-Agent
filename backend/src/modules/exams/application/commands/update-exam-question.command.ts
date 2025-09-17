import { UpdateExamQuestionPatch } from '../../domain/models/exam-question.models';

export class UpdateExamQuestionCommand {
    constructor(
        public readonly questionId: string,
        public readonly teacherId: string,
        public readonly patch: UpdateExamQuestionPatch,
    ) { }
}
