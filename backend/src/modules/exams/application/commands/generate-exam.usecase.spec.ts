import { GenerateExamUseCase } from './generate-exam.usecase';

describe('GenerateExamUseCase', () => {
  let useCase: GenerateExamUseCase;
  let llm: any;
  let templates: any;

  beforeEach(() => {
    llm = { complete: jest.fn() };
    templates = { render: jest.fn() };
    useCase = new GenerateExamUseCase(llm, templates);
  });

  it('should call LLM and return result', async () => {
    templates.render.mockResolvedValue('prompt');
    llm.complete.mockResolvedValue({ text: 'output' });

    const result = await useCase.execute({ templateId: 't1', subject: 'Math', level: 'easy', numQuestions: 5 });
    expect(result.output).toBe('output');
  });
});
