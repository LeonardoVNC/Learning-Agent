import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ValidateCorrectAnswer } from '../validators/correct-answer.validator';

export class UpdateExamQuestionDto {
  @IsOptional()
  kind!: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ANALYSIS' | 'OPEN_EXERCISE';

  @IsOptional() @IsString() @MaxLength(4000)
  text?: string;

  @IsOptional() @IsArray()
  options?: string[];

  @IsOptional() @IsInt()
  correctOptionIndex?: number;

  @IsOptional() @IsBoolean()
  correctBoolean?: boolean;

  @IsOptional() @IsString()
  expectedAnswer?: string;

  @IsOptional()
  @ValidateCorrectAnswer()
  correctAnswer?: number | boolean | null;
}
