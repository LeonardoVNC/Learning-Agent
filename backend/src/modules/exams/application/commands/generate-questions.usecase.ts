import { Inject, Injectable } from '@nestjs/common';
import { EXAM_AI_GENERATOR, EXAM_REPO } from '../../tokens';
import type { AIQuestionGeneratorPort } from '../../domain/ports/ai-question-generator.port';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { Distribution } from '../../domain/entities/distribution.vo';
import { BadRequestError, NotFoundError, UnauthorizedError } from 'src/shared/handler/errors';
import { EXAM_DIFFICULTY, QUESTION_TYPE } from '../../domain/constants/exam.constants';

type Input = {
    teacherId: string;
    subject: string;
    difficulty: typeof EXAM_DIFFICULTY[keyof typeof EXAM_DIFFICULTY];
    totalQuestions: number;
    reference?: string | null;
    distribution?: Distribution;
    examId?: string;
    classId?: string;
    language?: 'es' | 'en';
    strict?: boolean;
};

type Output = {
    questions: {
        multiple_choice: any[];
        true_false: any[];
        open_analysis: any[];
        open_exercise: any[];
    };
};

@Injectable()
export class GenerateQuestionsUseCase {

    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
        @Inject(EXAM_AI_GENERATOR) private readonly aiGenerator: AIQuestionGeneratorPort,
    ) { }

    async execute(input: Input): Promise<Output> {
        const { teacherId, examId, classId } = input;

        if (!String(teacherId ?? '').trim()) throw new BadRequestError('teacherId es obligatorio.');
        if (!String(input.subject ?? '').trim()) throw new BadRequestError('subject es obligatorio.');
        if (!Object.values(EXAM_DIFFICULTY).includes(input.difficulty)) {
            throw new BadRequestError(`difficulty debe ser ${Object.values(EXAM_DIFFICULTY).join(' | ')}.`);
        }
        if (!Number.isFinite(input.totalQuestions) || input.totalQuestions <= 0) {
            throw new BadRequestError('totalQuestions debe ser un número mayor a 0.');
        }

        if (examId) {
            const exam = await this.examRepo.findByIdOwned(examId, teacherId);
            if (!exam) {
                throw new NotFoundError('No se ha encontrado el examen o no pertenece al docente.');
            }
            if (exam.status === 'Publicado') {
                throw new UnauthorizedError('No se pueden modificar exámenes publicados.');
            }
        } else if (classId) {
            const owns = await this.examRepo.teacherOwnsClass(classId, teacherId);
            if (!owns) {
                throw new UnauthorizedError('Acceso no autorizado: la clase no pertenece a este docente');
            }
        } 

        if (input.strict && input.distribution) {
            const { multiple_choice = 0, true_false = 0, open_analysis = 0, open_exercise = 0 } =
                input.distribution as any;
            const parts = [multiple_choice, true_false, open_analysis, open_exercise];
            if (parts.some((n) => !Number.isFinite(n) || n < 0)) {
                throw new BadRequestError('La distribución no puede contener valores negativos o no numéricos.');
            }
            const sum = parts.reduce((a, b) => a + b, 0);
            if (sum !== input.totalQuestions) {
                throw new BadRequestError('La suma de distribution debe ser igual a totalQuestions cuando strict=true.');
            }
        }

        const flat = await this.aiGenerator.generate({
            subject: input.subject,
            difficulty: input.difficulty,
            totalQuestions: input.totalQuestions,
            distribution: input.distribution,
            reference: input.reference ?? null,
        });

        const grouped = {
            multiple_choice: flat.filter((q: any) => q.type === QUESTION_TYPE.MULTIPLE_CHOICE),
            true_false: flat.filter((q: any) => q.type === QUESTION_TYPE.TRUE_FALSE),
            open_analysis: flat.filter((q: any) => q.type === QUESTION_TYPE.OPEN_ANALYSIS),
            open_exercise: flat.filter((q: any) => q.type === QUESTION_TYPE.OPEN_EXERCISE),
        };

        return { questions: grouped };
    }
}
