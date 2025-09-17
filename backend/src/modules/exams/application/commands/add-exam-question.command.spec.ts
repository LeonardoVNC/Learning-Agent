import { Test } from '@nestjs/testing';
import { AddExamQuestionCommandHandler } from './add-exam-question.handler';
import { AddExamQuestionCommand } from './add-exam-question.command';
import { EXAM_QUESTION_REPO } from '../../tokens';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AddExamQuestionCommandHandler', () => {
  let handler: AddExamQuestionCommandHandler;
  let repo: { existsExam: jest.Mock; addToExam: jest.Mock };

  beforeEach(async () => {
    repo = {
      existsExam: jest.fn(),
      addToExam: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AddExamQuestionCommandHandler,
        { provide: EXAM_QUESTION_REPO, useValue: repo },
      ],
    }).compile();

    handler = moduleRef.get(AddExamQuestionCommandHandler);
  });

  it('throws NotFoundException if exam does not exist', async () => {
    repo.existsExam.mockResolvedValue(false);

    const cmd = new AddExamQuestionCommand('exam1', 'end', {
      kind: 'TRUE_FALSE',
      text: 'Algo?',
      correctBoolean: true,
    });

    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException if kind is not supported', async () => {
    repo.existsExam.mockResolvedValue(true);

    const cmd = new AddExamQuestionCommand('exam1', 'end', {
      kind: 'INVALID',
      text: 'Pregunta inválida',
    } as any);

    await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
  });

  it('calls repo.addToExam and returns created question', async () => {
    repo.existsExam.mockResolvedValue(true);
    repo.addToExam.mockResolvedValue({ id: 'q1', order: 1 });

    const cmd = new AddExamQuestionCommand('exam1', 'end', {
      kind: 'TRUE_FALSE',
      text: '¿Es correcto?',
      correctBoolean: false,
    });

    const result = await handler.execute(cmd);

    expect(repo.addToExam).toHaveBeenCalledWith('exam1', cmd.question, 'end');
    expect(result).toEqual({ id: 'q1', order: 1 });
  });
});
