import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO base para una pregunta generada por la IA
 */
export class GeneratedQuestionBaseDto {
    @IsString()
    text!: string;

    @IsIn(['multiple_choice', 'true_false', 'open_analysis', 'open_exercise'])
    type!: 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';
}

/**
 * Pregunta de opción múltiple
 */
export class GeneratedMCQDto extends GeneratedQuestionBaseDto {
    @IsArray()
    @IsString({ each: true })
    options!: string[];

    @IsOptional()
    correctOptionIndex?: number;
}

/**
 * Pregunta de verdadero/falso
 */
export class GeneratedTrueFalseDto extends GeneratedQuestionBaseDto {
    @IsOptional()
    correctBoolean?: boolean;
}

/**
 * Pregunta abierta (análisis / ejercicio)
 */
export class GeneratedOpenDto extends GeneratedQuestionBaseDto {
    @IsOptional()
    expectedAnswer?: string;
}

/**
 * DTO de salida agrupado
 */
export class GeneratedQuestionsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GeneratedMCQDto)
    multiple_choice!: GeneratedMCQDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GeneratedTrueFalseDto)
    true_false!: GeneratedTrueFalseDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GeneratedOpenDto)
    open_analysis!: GeneratedOpenDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GeneratedOpenDto)
    open_exercise!: GeneratedOpenDto[];
}
