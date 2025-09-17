// domain/entities/interview-question.entity.ts
export class InterviewQuestion {
  constructor(
    public readonly id: string,
    public readonly classId: string,
    public text: string,
    public readonly createdAt: Date,
    public lastUsedAt: Date | null,
  ) {}

  // Método para marcar como usado
  markAsUsed(): void {
    this.lastUsedAt = new Date();
  }

  // Método para verificar si está reciente
  isRecentlyUsed(days: number = 7): boolean {
    if (!this.lastUsedAt) return false;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    return this.lastUsedAt > daysAgo;
  }
}
