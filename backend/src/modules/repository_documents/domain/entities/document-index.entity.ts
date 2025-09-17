export class DocumentIndex {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly title: string,
    public readonly chapters: IndexChapter[],
    public readonly generatedAt: Date = new Date(),
    public readonly status: IndexStatus = IndexStatus.GENERATED,
  ) {}
}

export class IndexChapter {
  constructor(
    public readonly title: string,
    public readonly description: string,
    public readonly subtopics: IndexSubtopic[],
    public readonly exercises: Exercise[],
  ) {}
}

export class IndexSubtopic {
  constructor(
    public readonly title: string,
    public readonly description: string,
    public readonly exercises: Exercise[],
  ) {}
}

export class Exercise {
  constructor(
    public readonly type: ExerciseType,
    public readonly title: string,
    public readonly description: string,
    public readonly difficulty: ExerciseDifficulty,
    public readonly estimatedTime?: string,
    public readonly keywords?: string[],
  ) {}
}

export enum IndexStatus {
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  ERROR = 'ERROR',
}

export enum ExerciseType {
  CONCEPTUAL = 'CONCEPTUAL',
  PRACTICAL = 'PRACTICAL',
  ANALYSIS = 'ANALYSIS',
  SYNTHESIS = 'SYNTHESIS',
  APPLICATION = 'APPLICATION',
  PROBLEM_SOLVING = 'PROBLEM_SOLVING',
}

export enum ExerciseDifficulty {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}
