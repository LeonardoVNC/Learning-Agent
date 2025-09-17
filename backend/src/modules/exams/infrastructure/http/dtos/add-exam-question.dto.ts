import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class AddExamQuestionDto {
  @IsIn(['MULTIPLE_CHOICE','TRUE_FALSE','OPEN_ANALYSIS','OPEN_EXERCISE'])
  kind!: 'MULTIPLE_CHOICE'|'TRUE_FALSE'|'OPEN_ANALYSIS'|'OPEN_EXERCISE';

  @IsString() @IsNotEmpty() @MaxLength(4000)
  text!: string;

  // MCQ
  @IsOptional() @IsArray()
  options?: string[];

  @IsOptional() @IsInt() @Min(0)
  correctOptionIndex?: number;

  // TRUE_FALSE
  @IsOptional() @IsBoolean()
  correctBoolean?: boolean;

  // OPEN_*
  @IsOptional() @IsString()
  expectedAnswer?: string;

  @IsIn(['start','middle','end'])
  position!: 'start'|'middle'|'end';

  @IsOptional()
  @ValidateIf(o => o.kind === 'MULTIPLE_CHOICE')
  @IsInt()
  @Min(0)
  @ValidateIf(o => o.kind === 'TRUE_FALSE')
  @IsBoolean()
  @ValidateIf(o => o.kind === 'OPEN_ANALYSIS' || o.kind === 'OPEN_EXERCISE')
  @IsIn([null], { message: 'correctAnswer debe ser null para preguntas abiertas.' })
  correctAnswer?: number | boolean | null;
}
