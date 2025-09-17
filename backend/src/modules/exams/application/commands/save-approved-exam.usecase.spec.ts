import { SaveApprovedExamUseCase } from './save-approved-exam.usecase';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('SaveApprovedExamUseCase', () => {
  let useCase: SaveApprovedExamUseCase;
  let prisma: any;
  let repo: any;

  beforeEach(() => {
    prisma = { teacherProfile: { findUnique: jest.fn() }, course: { findUnique: jest.fn() } };
    repo = { save: jest.fn() };
    useCase = new SaveApprovedExamUseCase(prisma, repo);
  });

  it('should throw BadRequestException if title missing', async () => {
    await expect(useCase.execute({ title: '', courseId: 'c1', teacherId: 't1', content: {} }))
      .rejects.toThrow(BadRequestException);
  });

  it('should throw ForbiddenException if teacher not found', async () => {
    prisma.teacherProfile.findUnique.mockResolvedValue(null);
    await expect(useCase.execute({ title: 'Exam', courseId: 'c1', teacherId: 't1', content: {} }))
      .rejects.toThrow(ForbiddenException);
  });

  it('should save exam if valid', async () => {
    prisma.teacherProfile.findUnique.mockResolvedValue({});
    prisma.course.findUnique.mockResolvedValue({ teacherId: 't1' });
    repo.save.mockResolvedValue({ id: 'exam1' });

    const result = await useCase.execute({ title: 'Exam', courseId: 'c1', teacherId: 't1', content: {} });
    expect(result).toEqual({ id: 'exam1' });
  });
});
