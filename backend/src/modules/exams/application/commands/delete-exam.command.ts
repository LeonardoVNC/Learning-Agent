export class DeleteExamCommand {
    constructor(
        public readonly examId: string,
        public readonly teacherId: string,
    ) {}
}
