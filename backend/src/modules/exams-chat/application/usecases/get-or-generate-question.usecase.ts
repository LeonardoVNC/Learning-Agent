import { Question } from '../../domain/entities/question.entity';
import { QuestionRepositoryPort } from '../../domain/ports/question-repository.port';
import { IaClientWrapper } from '../../domain/ports/ia-client-wrapper.port';
import { AuditRepository } from '../../domain/ports/audit-repository.port';
import { QuestionMetricsService } from '../../domain/ports/question-metrics-service.port';
import { createSignature } from '../../utils/createSignature';

export class GetOrGenerateQuestionUseCase {
  constructor(
    private readonly repo: QuestionRepositoryPort,
    private readonly iaClient: IaClientWrapper,
    private readonly audit: AuditRepository,
    private readonly metrics: QuestionMetricsService,
    private readonly ttlMs = 30 * 24 * 60 * 60 * 1000
  ) {}

  async execute(input: { prompt: string; examId?: string; userId?: string }): Promise<{ id: string; question: string; cached: boolean }> {
    const now = new Date();
    const signature = createSignature({ text: input.prompt });
    const existing = await this.repo.findBySignature(signature);

    if (
      existing &&
      ((existing.lastUsedAt ?? existing.createdAt) &&
        (now.getTime() - (existing.lastUsedAt ?? existing.createdAt).getTime()) <= this.ttlMs)
    ) {
      existing.lastUsedAt = now;
      await this.repo.incrementUsage(existing.id, 0);

      await this.audit.record({
        questionId: existing.id,
        timestamp: now,
        userId: input.userId,
        examId: input.examId,
        signature,
        source: 'cached',
        tokensUsed: 0,
      });

      this.metrics.incrementCacheHits();
      this.metrics.addTokensSaved(existing.tokensGenerated);

      return { id: existing.id, question: existing.text, cached: true };
    }

    const generated = await this.iaClient.generateQuestion(input.prompt);

    const toSave = new Question(
      generated.questionText,
      'open_analysis',
      generated.options ?? null,
      'generated',
      undefined,
      now,
      signature,
      input.examId ?? null,
      undefined,
      generated.tokensUsed,
      undefined,
      0,
      undefined
    );

    const saved = await this.repo.save(toSave);

    await this.audit.record({
      questionId: saved.id,
      timestamp: now,
      userId: input.userId,
      examId: input.examId,
      signature,
      source: 'generated',
      tokensUsed: generated.tokensUsed,
    });

    this.metrics.incrementCacheMisses();
    this.metrics.addTokensGenerated(generated.tokensUsed);

    return { id: saved.id, question: saved.text, cached: false };
  }
}
