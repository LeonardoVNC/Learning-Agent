import { Inject, Injectable } from '@nestjs/common';
import { CreateExamCommand } from './create-exam.command';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { ExamFactory } from '../../infrastructure/utils/exam.factory';
import { BadRequestError, NotFoundError, UnauthorizedError } from 'src/shared/handler/errors';
import { EXAM_STATUS, ALL_EXAM_STATUS, ALL_EXAM_DIFFICULTY } from '../../domain/constants/exam.constants';

@Injectable()
export class CreateExamCommandHandler {

    constructor(
        @Inject(EXAM_REPO) private readonly repo: ExamRepositoryPort,
    ) { }

    async execute(cmd: CreateExamCommand) {

        const title = String(cmd.title ?? '').trim();
        if (!title) throw new BadRequestError('El título del examen es obligatorio.');
        if (!String(cmd.classId ?? '').trim()) throw new BadRequestError('classId es obligatorio.');
        if (!Number.isFinite(cmd.attempts) || cmd.attempts <= 0) {
            throw new BadRequestError('attempts debe ser un entero mayor a 0.');
        }
        if (!Number.isFinite(cmd.timeMinutes) || cmd.timeMinutes <= 0) {
            throw new BadRequestError('timeMinutes debe ser un entero mayor a 0.');
        }
        if (!ALL_EXAM_DIFFICULTY.includes(cmd.difficulty as any)) {
            throw new BadRequestError('difficulty debe ser uno de: "fácil" | "medio" | "difícil".');
        }
        if (cmd.status && !ALL_EXAM_STATUS.includes(cmd.status as any)) {
            throw new BadRequestError('status inválido. Use "Guardado" o "Publicado".');
        }

        const owns = await this.repo.teacherOwnsClass(cmd.classId, cmd.teacherId);
        if (!owns) {
            throw new UnauthorizedError('Acceso no autorizado: la clase no pertenece a este docente');
        }

        const exam = ExamFactory.create({
            title,
            status: (cmd.status as any) ?? EXAM_STATUS.GUARDADO,
            classId: cmd.classId,
            difficulty: cmd.difficulty,
            attempts: cmd.attempts,
            timeMinutes: cmd.timeMinutes,
            reference: cmd.reference,
        });

        return this.repo.create(exam);
    }
}
