import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DistributionDTO {
  @IsOptional() @IsInt() @Min(0) @Max(999) multiple_choice!: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) true_false!: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) open_analysis!: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) open_exercise!: number;
}

export class CreateExamDto {
  @IsString() @MaxLength(120)
  title!: string;

  @IsUUID()
  classId!: string;

  @IsString() @MaxLength(200)
  subject!: string;

  @IsString()
  difficulty!: string;

  @IsInt() @Min(1) @Max(10)
  attempts!: number;

  @IsInt() @Min(1) @Max(1000)
  totalQuestions!: number;

  @IsInt()
  @Min(45, { message: 'Tiempo (minutos) mínimo: 45.' })
  @Max(240, { message: 'Tiempo (minutos) máximo: 240.' })
  timeMinutes!: number;

  @IsOptional() @IsString() @MaxLength(2000)
  reference?: string | null;

  @IsOptional() @ValidateNested() @Type(() => DistributionDTO)
  distribution?: DistributionDTO;

  @IsOptional() @IsEnum(['Guardado', 'Publicado'] as const)
  status?: 'Guardado' | 'Publicado';
}
