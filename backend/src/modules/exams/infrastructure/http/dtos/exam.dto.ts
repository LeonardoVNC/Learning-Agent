import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ExamMetaReadDTO {
    id!: string;
    title!: string;
    status!: 'Guardado' | 'Publicado';
    classId!: string;
    createdAt!: string;
}

export class ExamDetailReadDTO extends ExamMetaReadDTO {
    subject!: string;
    difficulty!: string;
    attempts!: number;
    totalQuestions!: number;
    timeMinutes!: number;
    reference?: string | null;
    mcqCount!: number;
    trueFalseCount!: number;
    openAnalysisCount!: number;
    openExerciseCount!: number;
    questions?: any[];
}

export class PatchExamMetaDTO {
    @IsOptional() @IsString() @MaxLength(120) title?: string;

    @IsOptional() @IsEnum(['Guardado', 'Publicado'] as const)
    status?: 'Guardado' | 'Publicado';

    @IsOptional() @IsUUID() classId?: string;
}
