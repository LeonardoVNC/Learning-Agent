import { PrismaQuestionRepositoryAdapter } from '../src/modules/exams-chat/infrastructure/persistance/prisma-question-repository.adapter';
import { Question } from '../src/modules/exams-chat/domain/entities/question.entity';

describe('PrismaQuestionRepositoryAdapter - prisma mocked', () => {
  let mockPrisma: any;
  let repo: PrismaQuestionRepositoryAdapter;

  beforeEach(() => {
    mockPrisma = {
      generatedQuestion: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };
    repo = new PrismaQuestionRepositoryAdapter(mockPrisma);
  });

  it('save should call prisma.upsert and return mapped Question', async () => {
    const q = Question.create('¿Qué es testing?');
    q.signature = 'sig-1';
    const record = {
      id: q.id,
      examId: null,
      topic: null,
      signature: q.signature,
      text: q.text,
      type: q.type,
      options: q.options,
      tokensGenerated: q.tokensGenerated,
      createdAt: q.createdAt,
      lastUsedAt: null,
      uses: q.uses,
      difficulty: null,
    };
    mockPrisma.generatedQuestion.upsert.mockResolvedValue(record);
    const saved = await repo.save(q);
    expect(saved.id).toBe(q.id);
    expect(saved.signature).toBe(q.signature);
    expect(mockPrisma.generatedQuestion.upsert).toHaveBeenCalled();
  });

  it('findBySignature should call prisma.findUnique and return mapped Question', async () => {
    const record = {
      id: 'id-1',
      examId: 'exam1',
      topic: 't',
      signature: 'sig-xx',
      text: 'texto',
      type: 'open_analysis',
      options: null,
      tokensGenerated: 0,
      createdAt: new Date(),
      lastUsedAt: null,
      uses: 0,
      difficulty: null,
    };
    mockPrisma.generatedQuestion.findUnique.mockResolvedValue(record);
    const found = await repo.findBySignature('sig-xx');
    expect(found).not.toBeNull();
    expect(found?.signature).toBe('sig-xx');
    expect(mockPrisma.generatedQuestion.findUnique).toHaveBeenCalledWith({
      where: { signature: 'sig-xx' },
    });
  });

  it('incrementUsage should call prisma.update with increments', async () => {
    mockPrisma.generatedQuestion.update.mockResolvedValue({});
    await repo.incrementUsage('id-1', 7);
    expect(mockPrisma.generatedQuestion.update).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      data: {
        uses: { increment: 1 },
        tokensGenerated: { increment: 7 },
        lastUsedAt: expect.any(Date),
      },
    });
  });

  it('pruneToLimitByExam should delete returned ids', async () => {
    mockPrisma.generatedQuestion.findMany.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
    ]);
    mockPrisma.generatedQuestion.deleteMany.mockResolvedValue({ count: 2 });
    await repo.pruneToLimitByExam('exam1', 1);
    expect(mockPrisma.generatedQuestion.findMany).toHaveBeenCalledWith({
      where: { examId: 'exam1' },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      select: { id: true },
    });
    expect(mockPrisma.generatedQuestion.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
    });
  });

  it('countByExam should return prisma.count result', async () => {
    mockPrisma.generatedQuestion.count.mockResolvedValue(5);
    const c = await repo.countByExam('examX');
    expect(c).toBe(5);
    expect(mockPrisma.generatedQuestion.count).toHaveBeenCalledWith({
      where: { examId: 'examX' },
    });
  });

  it('deleteOlderThan should call prisma.deleteMany and return count', async () => {
    mockPrisma.generatedQuestion.deleteMany.mockResolvedValue({ count: 3 });
    const removed = await repo.deleteOlderThan(new Date('2000-01-01'));
    expect(removed).toBe(3);
    expect(mockPrisma.generatedQuestion.deleteMany).toHaveBeenCalled();
  });
});

describe('PrismaQuestionRepositoryAdapter - in-memory behavior', () => {
  let repo: PrismaQuestionRepositoryAdapter;

  beforeEach(() => {
    repo = new PrismaQuestionRepositoryAdapter();
  });

  it('save should create and then update the same signature on second save', async () => {
    const q = Question.create('¿Qué es in-memory?');
    const saved1 = await repo.save(q);
    expect(saved1.id).toBeDefined();
    const all1 = await repo.findAll();
    expect(all1.length).toBe(1);
    const saved2 = await repo.save(q);
    expect(saved2.uses).toBeGreaterThanOrEqual(1);
    const all2 = await repo.findAll();
    expect(all2.length).toBe(1);
  });

  it('findById should return null when not found and return object when exists', async () => {
    const q = Question.create('Buscar por id');
    const saved = await repo.save(q);
    const found = await repo.findById(saved.id);
    expect(found).not.toBeNull();
    const notFound = await repo.findById('no-such-id');
    expect(notFound).toBeNull();
  });

  it('findBySignature should find by signature', async () => {
    const q = Question.create('Firma test');
    const s = await repo.save(q);
    const found = await repo.findBySignature(s.signature);
    expect(found).not.toBeNull();
    expect(found?.signature).toBe(s.signature);
  });

  it('incrementUsage should increment uses and set lastUsedAt', async () => {
    const q = Question.create('increment test');
    const saved = await repo.save(q);
    await repo.incrementUsage(saved.id, 3);
    const found = await repo.findById(saved.id);
    expect(found?.uses).toBeGreaterThanOrEqual(1);
    expect(found?.lastUsedAt).toBeInstanceOf(Date);
    expect(found?.tokensGenerated).toBeGreaterThanOrEqual(3);
  });

  it('pruneToLimitByExam should keep only limit items per exam', async () => {
    const a1 = Question.create('q1');
    a1.examId = 'EX1';
    const a2 = Question.create('q2');
    a2.examId = 'EX1';
    const a3 = Question.create('q3');
    a3.examId = 'EX1';
    await repo.save(a1);
    await new Promise((r) => setTimeout(r, 1));
    await repo.save(a2);
    await new Promise((r) => setTimeout(r, 1));
    await repo.save(a3);
    await repo.pruneToLimitByExam('EX1', 2);
    const remaining = (await repo.findAll()).filter((x) => x.examId === 'EX1');
    expect(remaining.length).toBeLessThanOrEqual(2);
  });

  it('deleteOlderThan should remove items older than date', async () => {
    const old = Question.rehydrate({
      ...Question.create('old').toJSON(),
      createdAt: new Date('2000-01-01'),
      id: 'old-id',
    });
    const recent = Question.create('new');
    await repo.save(old);
    await repo.save(recent);
    const removed = await repo.deleteOlderThan(new Date('2010-01-01'));
    expect(removed).toBeGreaterThanOrEqual(1);
    const all = await repo.findAll();
    expect(all.find((a) => a.id === 'old-id')).toBeUndefined();
  });
});
