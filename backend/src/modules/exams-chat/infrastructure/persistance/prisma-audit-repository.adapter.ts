import { AuditRepository } from '../../domain/ports/audit-repository.port';

export class PrismaAuditRepositoryAdapter implements AuditRepository {
  constructor(private readonly prisma: any) {}

  async record(entry: {
    questionId?: string;
    timestamp: Date;
    userId?: string;
    examId?: string;
    signature: string;
    source: 'cached' | 'generated';
    tokensUsed: number;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        questionId: entry.questionId ?? null,
        timestamp: entry.timestamp,
        userId: entry.userId ?? null,
        examId: entry.examId ?? null,
        signature: entry.signature,
        source: entry.source,
        tokensUsed: entry.tokensUsed,
      },
    });
  }
}
