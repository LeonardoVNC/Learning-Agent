import { Inject, Injectable } from '@nestjs/common';
import { DeleteExamCommand } from './delete-exam.command';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { NotFoundError, BadRequestError } from 'src/shared/handler/errors';
import { EXAM_STATUS } from '../../domain/constants/exam.constants';

@Injectable()
export class DeleteExamCommandHandler {

    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
    ) { }

    async execute(cmd: DeleteExamCommand): Promise<void> {
        const { examId, teacherId } = cmd;

        const exam = await this.examRepo.findByIdOwned(examId, teacherId);
        if (!exam) {
            throw new NotFoundError(
                'No se ha encontrado el examen o no pertenece al docente.',
            );
        }

        if (exam.status !== EXAM_STATUS.PUBLICADO) {
            throw new BadRequestError(
                'Solo se pueden eliminar exámenes aprobados/publicados.',
            );
        }

        await this.examRepo.deleteOwned(examId, teacherId);
    }
}
