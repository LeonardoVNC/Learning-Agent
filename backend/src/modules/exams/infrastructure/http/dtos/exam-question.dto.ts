import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExamQuestionReadDTO {
    id!: string;
    examId!: string;
    kind!: 'MULTIPLE_CHOICE'|'TRUE_FALSE'|'OPEN_ANALYSIS'|'OPEN_EXERCISE';
    text!: string;
    options?: unknown | null;
    correctOptionIndex?: number | null;
    correctBoolean?: boolean | null;
    expectedAnswer?: string | null;
    order!: number;
}

export class UpsertQuestionDTO {
    @IsEnum(['MULTIPLE_CHOICE','TRUE_FALSE','OPEN_ANALYSIS','OPEN_EXERCISE'] as const) kind!: any;
    @IsString() @MaxLength(2000) text!: string;
    @IsOptional() options?: unknown;
    @IsOptional() correctOptionIndex?: number;
    @IsOptional() correctBoolean?: boolean;
    @IsOptional() @MaxLength(2000) expectedAnswer?: string;
    @IsInt() @Min(0) order!: number;
}

export class UpsertQuestionsDTO {
    @IsUUID() examId!: string;
    @IsArray() @ValidateNested({ each: true }) @Type(() => UpsertQuestionDTO) items!: UpsertQuestionDTO[];
}
