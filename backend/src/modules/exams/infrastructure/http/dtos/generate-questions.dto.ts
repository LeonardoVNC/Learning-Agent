import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class DistributionDto {
  @IsOptional() @IsInt() @Min(0)
  multiple_choice!: number;

  @IsOptional() @IsInt() @Min(0)
  true_false!: number;

  @IsOptional() @IsInt() @Min(0)
  open_analysis!: number;

  @IsOptional() @IsInt() @Min(0)
  open_exercise!: number;
}

export class GenerateQuestionsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsIn(['fácil', 'medio', 'difícil'])
  difficulty!: 'fácil' | 'medio' | 'difícil';

  @IsInt()
  @IsPositive()
  totalQuestions!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reference?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DistributionDto)
  distribution?: DistributionDto;

  @IsOptional() @IsUUID()
  examId?: string;

  @IsOptional() @IsUUID()
  classId?: string;
}
