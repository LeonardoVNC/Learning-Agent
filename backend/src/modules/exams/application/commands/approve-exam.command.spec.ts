import { Test } from '@nestjs/testing';
import { ApproveExamCommandHandler } from './approve-exam.handler';
import { ApproveExamCommand } from './approve-exam.command';
import { EXAM_REPO } from '../../tokens';
import { NotFoundException } from '@nestjs/common';

describe('ApproveExamCommandHandler', () => {
  let handler: ApproveExamCommandHandler;
  let repo: { findById: jest.Mock; approve: jest.Mock };

  beforeEach(async () => {
    repo = { findById: jest.fn(), approve: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApproveExamCommandHandler,
        { provide: EXAM_REPO, useValue: repo },
      ],
    }).compile();

    handler = moduleRef.get(ApproveExamCommandHandler);
  });

  it('throws NotFoundException if exam not found', async () => {
    repo.findById.mockResolvedValue(null);

    const cmd = new ApproveExamCommand('exam1');
    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('approves and returns ok', async () => {
    repo.findById.mockResolvedValue({ id: 'exam1' });
    repo.approve.mockResolvedValue(undefined);

    const cmd = new ApproveExamCommand('exam1');
    const result = await handler.execute(cmd);

    expect(repo.approve).toHaveBeenCalledWith('exam1');
    expect(result).toEqual({ ok: true });
  });
});
