export class GenerateQuestionsCommand {
  constructor(
    public readonly examId: string,
    public readonly teacherId: string,
    public readonly language: 'es' | 'en' = 'es',
    public readonly difficulty?: string,
    public readonly reference?: string | null,
  ) {}
}
