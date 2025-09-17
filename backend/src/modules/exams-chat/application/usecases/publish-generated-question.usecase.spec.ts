import { PublishGeneratedQuestionUseCase } from './publish-generated-question.usecase';

describe('PublishGeneratedQuestionUseCase', () => {
  let useCase: PublishGeneratedQuestionUseCase;
  let repo: any;

  beforeEach(() => {
    repo = { findBySignature: jest.fn(), save: jest.fn() };
    useCase = new PublishGeneratedQuestionUseCase(repo);
  });

  it('should throw if input invalid', async () => {
    await expect(useCase.execute({ text: null } as any)).rejects.toThrow('Invalid input: text is required');
  });

  it('should return duplicate if signature exists', async () => {
    repo.findBySignature.mockResolvedValue({ id: 'q1' });
    const result = await useCase.execute({ text: 'hello' });
    expect(result.result).toBe('duplicate');
  });

  it('should save and return created', async () => {
    repo.findBySignature.mockResolvedValue(null);
    repo.save.mockResolvedValue({ id: 'q1' });
    const result = await useCase.execute({ text: 'hello' });
    expect(result.result).toBe('created');
  });
});
