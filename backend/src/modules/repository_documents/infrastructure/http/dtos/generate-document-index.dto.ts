import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';

export class GenerateDocumentIndexRequestDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['basic', 'intermediate', 'advanced'])
  detailLevel?: 'basic' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exerciseTypes?: string[];
}

export interface GenerateDocumentIndexResponseDto {
  success: boolean;
  data: DocumentIndexDto;
  message: string;
}

export interface DocumentIndexDto {
  id: string;
  documentId: string;
  title: string;
  chapters: IndexChapterDto[];
  generatedAt: string;
  status: string;
}

export interface IndexChapterDto {
  title: string;
  description: string;
  subtopics: IndexSubtopicDto[];
  exercises: ExerciseDto[];
}

export interface IndexSubtopicDto {
  title: string;
  description: string;
  exercises: ExerciseDto[];
}

export interface ExerciseDto {
  type: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedTime?: string;
  keywords?: string[];
}
