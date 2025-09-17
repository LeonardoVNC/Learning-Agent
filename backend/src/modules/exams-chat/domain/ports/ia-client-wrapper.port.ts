export interface IaClientWrapper {
  generateQuestion(prompt: string): Promise<{
    questionText: string
    options?: string[]
    tokensUsed: number
  }>
}
