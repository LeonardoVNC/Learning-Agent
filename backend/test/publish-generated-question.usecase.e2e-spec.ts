import { PublishGeneratedQuestionUseCase } from '../src/modules/exams-chat/application/usecases/publish-generated-question.usecase';
import { PrismaQuestionRepositoryAdapter } from '../src/modules/exams-chat/infrastructure/persistance/prisma-question-repository.adapter';

describe('PublishGeneratedQuestionUseCase', () => {
  let repo: PrismaQuestionRepositoryAdapter;
  let useCase: PublishGeneratedQuestionUseCase;

  beforeEach(() => {
    repo = new PrismaQuestionRepositoryAdapter();
    useCase = new PublishGeneratedQuestionUseCase(repo as any);
  });

  it('creates a question when text is valid', async () => {
    const res = await useCase.execute({ text: '¿Qué es NestJS?' });
    expect(res.result).toBe('created');
    expect((res as any).questionId).toBeDefined();
  });

  it('detects duplicate ignoring HTML', async () => {
    await useCase.execute({ text: '¿Qué es <b>JavaScript</b>?' });
    const res = await useCase.execute({ text: '¿Qué es JavaScript?' });
    expect(res.result).toBe('duplicate');
  });

  it('trims overly long content', async () => {
    const long = 'a'.repeat(2000);
    const res = await useCase.execute({ text: long });
    expect(res.result).toBe('created');
  });

  it('throws when text is empty after normalization', async () => {
    await expect(useCase.execute({ text: '' })).rejects.toThrow();
  });

  it('uses signature to detect duplicates even with options', async () => {
    await useCase.execute({ text: 'Pregunta', options: ['A', 'B'] });
    const res = await useCase.execute({
      text: 'Pregunta',
      options: ['A', 'B'],
    });
    expect(res.result).toBe('duplicate');
  });
});
