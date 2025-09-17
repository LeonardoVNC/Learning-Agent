import { Inject, Injectable} from '@nestjs/common';
import { UpdateExamQuestionCommand } from './update-exam-question.command';
import { EXAM_QUESTION_REPO, EXAM_REPO } from '../../tokens';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { BadRequestError, NotFoundError, UnauthorizedError } from 'src/shared/handler/errors';
import { EXAM_STATUS } from '../../domain/constants/exam.constants';
import { QUESTION_KIND, isOpenKind } from '../../domain/constants/question-kind.constants';

@Injectable()
export class UpdateExamQuestionCommandHandler {

    constructor(
        @Inject(EXAM_QUESTION_REPO)
        private readonly qRepo: ExamQuestionRepositoryPort,
        @Inject(EXAM_REPO)
        private readonly examRepo: ExamRepositoryPort,
    ) { }

    async execute(cmd: UpdateExamQuestionCommand) {
        const { questionId, teacherId, patch } = cmd;
        const current = await this.qRepo.findByIdOwned(questionId, teacherId);
        if (!current) {
            throw new NotFoundError('No se ha encontrado la pregunta o no pertenece al docente.');
        }

        const parentExamId: string | undefined =
            (current as any).examId || (current as any).exam?.id;
        if (parentExamId) {
            const exam = await this.examRepo.findByIdOwned(parentExamId, teacherId);
            if (!exam) {
                throw new NotFoundError('No se ha encontrado el examen de la pregunta.');
            }
            if (exam.status === EXAM_STATUS.PUBLICADO) {
                throw new UnauthorizedError('No se pueden modificar exámenes publicados.');
            }
        } 

        if ((patch as any).kind && (patch as any).kind !== current.kind) {
            throw new BadRequestError('No se permite cambiar el tipo (kind) de la pregunta.');
        }
        const kind = current.kind as string;

        if (patch.text !== undefined && !String(patch.text).trim()) {
            throw new BadRequestError('El enunciado (text) no puede ser vacío cuando se proporciona.');
        }

        if (kind === QUESTION_KIND.MULTIPLE_CHOICE) {
            if (patch.options) {
                const opts = (patch.options ?? [])
                    .map((o) => String(o ?? '').trim())
                    .filter(Boolean);
                if (opts.length < 2) {
                    throw new BadRequestError('MCQ requiere al menos dos opciones válidas.');
                }
                const unique = new Set(opts);
                if (unique.size < opts.length) {
                    throw new BadRequestError('Las opciones no pueden contener duplicados.');
                }

                if (patch.correctOptionIndex != null) {
                    const idx = patch.correctOptionIndex;
                    if (idx < 0 || idx >= opts.length) {
                        throw new BadRequestError('correctOptionIndex fuera de rango para las nuevas opciones.');
                    }
                }
            } else if (patch.correctOptionIndex != null) {
                const currentOpts: string[] =
                    (current.options as any[])?.map((o: any) => String(o ?? '').trim()).filter(Boolean) ??
                    [];
                const len = currentOpts.length;
                if (len < 2) {
                    throw new BadRequestError(
                        'Las opciones actuales no son suficientes; envía opciones en el patch para ajustar correctOptionIndex.',
                    );
                }
                const idx = patch.correctOptionIndex;
                if (idx < 0 || idx >= len) {
                    throw new BadRequestError('correctOptionIndex fuera de rango para las opciones actuales.');
                }
            }
        }

        if (kind === QUESTION_KIND.TRUE_FALSE) {
            if (patch.correctBoolean != null && typeof patch.correctBoolean !== 'boolean') {
                throw new BadRequestError('correctBoolean debe ser boolean.');
            }
        }

        if (isOpenKind(kind)) {
            if (patch.expectedAnswer !== undefined && !String(patch.expectedAnswer).trim()) {
                throw new BadRequestError('expectedAnswer no puede estar vacío cuando se proporciona.');
            }
        }

        // 4) Actualizar
        const updated = await this.qRepo.updateOwned(questionId, teacherId, patch);
        return updated;
    }
}
