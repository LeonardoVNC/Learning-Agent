import { Test } from '@nestjs/testing';
import { UpdateExamQuestionCommandHandler } from './update-exam-question.handler';
import { UpdateExamQuestionCommand } from './update-exam-question.command';
import { EXAM_QUESTION_REPO, EXAM_REPO } from '../../tokens';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UpdateExamQuestionCommandHandler', () => {
  let handler: UpdateExamQuestionCommandHandler;
  let qRepo: { findById: jest.Mock; update: jest.Mock };
  let examRepo: { findById: jest.Mock };

  beforeEach(async () => {
    qRepo = { findById: jest.fn(), update: jest.fn() };
    examRepo = { findById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateExamQuestionCommandHandler,
        { provide: EXAM_QUESTION_REPO, useValue: qRepo },
        { provide: EXAM_REPO, useValue: examRepo },
      ],
    }).compile();

    handler = moduleRef.get(UpdateExamQuestionCommandHandler);
  });

  it('throws if question not found', async () => {
    qRepo.findById.mockResolvedValue(null);

    const cmd = new UpdateExamQuestionCommand('q1', { text: 'hola' });
    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('throws if exam not found', async () => {
    qRepo.findById.mockResolvedValue({ id: 'q1', examId: 'exam1', kind: 'TRUE_FALSE' });
    examRepo.findById.mockResolvedValue(null);

    const cmd = new UpdateExamQuestionCommand('q1', { text: 'hola' });
    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('throws if exam is already approved', async () => {
    qRepo.findById.mockResolvedValue({ id: 'q1', examId: 'exam1', kind: 'TRUE_FALSE' });
    examRepo.findById.mockResolvedValue({ id: 'exam1', approvedAt: new Date() });

    const cmd = new UpdateExamQuestionCommand('q1', { text: 'hola' });
    await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
  });

  it('updates and returns updated question', async () => {
    const current = { id: 'q1', examId: 'exam1', kind: 'TRUE_FALSE' };
    qRepo.findById.mockResolvedValue(current);
    examRepo.findById.mockResolvedValue({ id: 'exam1' });
    qRepo.update.mockResolvedValue({ id: 'q1', text: 'nuevo' });

    const cmd = new UpdateExamQuestionCommand('q1', { text: 'nuevo' });
    const result = await handler.execute(cmd);

    expect(qRepo.update).toHaveBeenCalledWith('q1', { text: 'nuevo' });
    expect(result).toEqual({ id: 'q1', text: 'nuevo' });
  });
});
