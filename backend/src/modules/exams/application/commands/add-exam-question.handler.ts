import { Inject, Injectable } from '@nestjs/common';
import { AddExamQuestionCommand } from './add-exam-question.command';
import { EXAM_REPO, EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import type { InsertPosition } from '../../domain/models/exam-question.models';
import { BadRequestError, NotFoundError, UnauthorizedError } from 'src/shared/handler/errors';
import { QUESTION_KIND, type QuestionKind, ALL_QUESTION_KINDS, isOpenKind,} from '../../domain/constants/question-kind.constants';
import { EXAM_STATUS } from '../../domain/constants/exam.constants';

@Injectable()
export class AddExamQuestionCommandHandler {

  constructor(
    @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
    @Inject(EXAM_QUESTION_REPO) private readonly qRepo: ExamQuestionRepositoryPort,
  ) {}

  async execute(cmd: AddExamQuestionCommand) {
    const { examId, teacherId, position, question } = cmd;

    const exam = await this.examRepo.findByIdOwned(examId, teacherId);
    if (!exam) {
      throw new NotFoundError('No se ha encontrado el examen o no pertenece al docente.');
    }
    if (exam.status === EXAM_STATUS.PUBLICADO) {
      throw new UnauthorizedError('No se pueden modificar exámenes publicados.');
    }

    const pos = position as InsertPosition;
    if (
      pos == null ||
      (typeof pos === 'string' && pos !== 'start' && pos !== 'end') ||
      (typeof pos === 'object' &&
        (!('afterId' in pos) ||
          typeof (pos as { afterId?: unknown }).afterId === 'undefined' ||
          !String((pos as { afterId?: unknown }).afterId).trim()))
    ) {
      throw new BadRequestError(
        'La posición de inserción es inválida. Use "start", "end" o { afterId } válido.',
      );
    }

    if (!String(question.text ?? '').trim()) {
      throw new BadRequestError('El enunciado (text) de la pregunta es obligatorio.');
    }

    const kind = question.kind as QuestionKind;
    if (!ALL_QUESTION_KINDS.includes(kind)) {
      throw new BadRequestError('El tipo de pregunta (kind) es inválido o no está soportado.');
    }

    if (kind === QUESTION_KIND.MULTIPLE_CHOICE) {
      const rawOpts = question.options ?? [];
      const opts = rawOpts.map((o) => String(o ?? '').trim()).filter(Boolean);

      if (opts.length < 2) {
        throw new BadRequestError(
          'Las preguntas de opción múltiple requieren al menos 2 opciones válidas.',
        );
      }
      const unique = new Set(opts);
      if (unique.size < opts.length) {
        throw new BadRequestError('Las opciones no pueden contener duplicados.');
      }

      const idx = question.correctOptionIndex;
      if (idx == null || idx < 0 || idx >= opts.length) {
        throw new BadRequestError(
          'El índice de la opción correcta (correctOptionIndex) está fuera de rango.',
        );
      }
    }

    if (kind === QUESTION_KIND.TRUE_FALSE) {
      if (typeof question.correctBoolean !== 'boolean') {
        throw new BadRequestError(
          'Las preguntas de Verdadero/Falso requieren el campo correctBoolean.',
        );
      }
    }

    if (isOpenKind(kind)) {
      if (!String(question.expectedAnswer ?? '').trim()) {
        throw new BadRequestError(`Las preguntas de tipo ${kind} requieren expectedAnswer.`);
      }
    }

    const created = await this.qRepo.addToExamOwned(examId, teacherId, question, pos);

    return created;
  }
}
