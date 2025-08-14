export class Student {
  constructor(
    public readonly userId: string,
    public code: number,
    public career?: string,
    public admissionYear?: number,
  ) {}
}