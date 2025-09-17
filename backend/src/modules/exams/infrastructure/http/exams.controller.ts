import {
  Body,
  Controller,
  Get,
  Delete,
  HttpCode,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { responseSuccess } from 'src/shared/handler/http.handler';
import { BadRequestError, UnauthorizedError } from 'src/shared/handler/errors';
import { ExamsErrorFilter } from './filters/exams-error.filter';
import { CreateExamDto } from './dtos/create-exam.dto';
import { GenerateQuestionsDto } from './dtos/generate-questions.dto';
import { AddExamQuestionDto } from './dtos/add-exam-question.dto';
import { UpdateExamQuestionDto } from './dtos/update-exam-question.dto';
import { CreateExamCommand } from '../../application/commands/create-exam.command';
import { CreateExamCommandHandler } from '../../application/commands/create-exam.handler';
import { AddExamQuestionCommand } from '../../application/commands/add-exam-question.command';
import { AddExamQuestionCommandHandler } from '../../application/commands/add-exam-question.handler';
import { UpdateExamQuestionCommand } from '../../application/commands/update-exam-question.command';
import { UpdateExamQuestionCommandHandler } from '../../application/commands/update-exam-question.handler';
import { DeleteExamCommand } from '../../application/commands/delete-exam.command';
import { DeleteExamCommandHandler } from '../../application/commands/delete-exam.handler';
import { GenerateQuestionsUseCase } from '../../application/commands/generate-questions.usecase';
import { ListClassExamsUseCase } from '../../application/queries/list-class-exams.usecase';
import { GetExamByIdUseCase } from '../../application/queries/get-exam-by-id.usecase';
import { EXAM_STATUS } from '../../domain/constants/exam.constants';
import { QUESTION_KIND } from '../../domain/constants/question-kind.constants';
import { QUESTION_TYPE } from '../../domain/constants/exam.constants'; // si lo dejaste junto a DIFFICULTY/QUESTION_TYPE
import type { InsertPosition } from '../../domain/models/exam-question.models';

const cid = (req: Request) => req.header('x-correlation-id') ?? randomUUID();
const pathOf = (req: Request) => (req as any).originalUrl || req.url || '';

type Lang = 'es' | 'en';
const readLanguage = (raw: unknown, fallback: Lang = 'es'): Lang =>
  raw === 'es' || raw === 'en' ? raw : fallback;

const readStrict = (raw: unknown, fallback = true): boolean =>
  typeof raw === 'boolean' ? raw : fallback;

function normalizeFromCorrectAnswerForCreate(dto: {
  kind:
    | typeof QUESTION_KIND.MULTIPLE_CHOICE
    | typeof QUESTION_KIND.TRUE_FALSE
    | typeof QUESTION_KIND.OPEN_ANALYSIS
    | typeof QUESTION_KIND.OPEN_EXERCISE;
  options?: string[];
  correctAnswer?: number | boolean | null;
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  expectedAnswer?: string;
}) {
  if ('correctAnswer' in dto && dto.correctAnswer !== undefined) {
    switch (dto.kind) {
      case QUESTION_KIND.MULTIPLE_CHOICE:
        return {
          options: dto.options,
          correctOptionIndex: dto.correctAnswer as number,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
      case QUESTION_KIND.TRUE_FALSE:
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: dto.correctAnswer as boolean,
          expectedAnswer: undefined,
        };
      default:
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
    }
  }
  return {
    options: dto.options,
    correctOptionIndex: dto.correctOptionIndex,
    correctBoolean: dto.correctBoolean,
    expectedAnswer: dto.expectedAnswer,
  };
}

type AiQuestion = {
  type:
    | typeof QUESTION_TYPE.MULTIPLE_CHOICE
    | typeof QUESTION_TYPE.TRUE_FALSE
    | typeof QUESTION_TYPE.OPEN_ANALYSIS
    | typeof QUESTION_TYPE.OPEN_EXERCISE;
  text: string;
  options?: string[] | null;

  expectedAnswer?: string | null;
  answer?: number | boolean | string | null;
  correct?: number | boolean | null;
  correctOptionIndex?: number | null;
  correctBoolean?: boolean | null;
};

function readExpectedFrom(q: AiQuestion): string {
  const raw =
    ((q.expectedAnswer ??
      (q as any).expected_answer ??
      (q as any).expected ??
      '') as string) + '';
  const val = raw.trim();
  return val || 'Completar en corrección';
}

function toNewExamQuestionFromAi(q: AiQuestion) {
  switch (q.type) {
    case QUESTION_TYPE.MULTIPLE_CHOICE: {
      const opts = Array.isArray(q.options) ? q.options : [];
      let idx =
        typeof q.correctOptionIndex === 'number'
          ? q.correctOptionIndex
          : typeof q.answer === 'number'
          ? (q.answer as number)
          : typeof (q as any).correct === 'number'
          ? ((q as any).correct as number)
          : 0;
      if (idx < 0 || idx >= opts.length) idx = 0;
      return {
        kind: QUESTION_KIND.MULTIPLE_CHOICE,
        text: q.text,
        options: opts,
        correctOptionIndex: idx,
      };
    }
    case QUESTION_TYPE.TRUE_FALSE: {
      const tf =
        typeof q.correctBoolean === 'boolean'
          ? q.correctBoolean
          : typeof q.answer === 'boolean'
          ? (q.answer as boolean)
          : typeof (q as any).correct === 'boolean'
          ? ((q as any).correct as boolean)
          : false;
      return {
        kind: QUESTION_KIND.TRUE_FALSE,
        text: q.text,
        correctBoolean: tf,
      };
    }
    case QUESTION_TYPE.OPEN_ANALYSIS:
      return {
        kind: QUESTION_KIND.OPEN_ANALYSIS,
        text: q.text,
        expectedAnswer: readExpectedFrom(q),
      };
    case QUESTION_TYPE.OPEN_EXERCISE:
      return {
        kind: QUESTION_KIND.OPEN_EXERCISE,
        text: q.text,
        expectedAnswer: readExpectedFrom(q),
      };
  }
}

function normalizeFromCorrectAnswerForUpdate(dto: {
  kind:
    | typeof QUESTION_KIND.MULTIPLE_CHOICE
    | typeof QUESTION_KIND.TRUE_FALSE
    | typeof QUESTION_KIND.OPEN_ANALYSIS
    | typeof QUESTION_KIND.OPEN_EXERCISE;
  options?: string[];
  correctAnswer?: number | boolean | null;
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  expectedAnswer?: string;
}) {
  if ('correctAnswer' in dto && dto.correctAnswer !== undefined) {
    switch (dto.kind) {
      case QUESTION_KIND.MULTIPLE_CHOICE:
        return {
          options: dto.options,
          correctOptionIndex: dto.correctAnswer as number,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
      case QUESTION_KIND.TRUE_FALSE:
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: dto.correctAnswer as boolean,
          expectedAnswer: undefined,
        };
      default:
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
    }
  }
  return {
    options: dto.options,
    correctOptionIndex: dto.correctOptionIndex,
    correctBoolean: dto.correctBoolean,
    expectedAnswer: dto.expectedAnswer,
  };
}

@UseGuards(JwtAuthGuard)
@UseFilters(ExamsErrorFilter)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('api')
export class ExamsController {
  private readonly logger = new Logger(ExamsController.name);

  constructor(
    private readonly createExamHandler: CreateExamCommandHandler,
    private readonly addExamQuestionHandler: AddExamQuestionCommandHandler,
    private readonly updateExamQuestionHandler: UpdateExamQuestionCommandHandler,
    private readonly deleteExamHandler: DeleteExamCommandHandler,
    private readonly listClassExams: ListClassExamsUseCase,
    private readonly getByIdUseCase: GetExamByIdUseCase,
    private readonly generateQuestionsUseCase: GenerateQuestionsUseCase,
  ) {}

  @Post('exams')
  @HttpCode(201)
  async create(@Body() dto: CreateExamDto, @Req() req: Request) {
    this.logger?.log?.(
      `[${cid(req)}] createExam -> title=${dto.title}, classId=${dto.classId}, difficulty=${dto.difficulty}, attempts=${dto.attempts}, time=${dto.timeMinutes}`,
    );

    if (!dto.title?.trim()) throw new BadRequestError('El campo "title" es obligatorio.');
    if (!dto.classId?.trim()) throw new BadRequestError('El campo "classId" es obligatorio.');

    const userId = (req as any).user?.sub as string | undefined;
    if (!userId) throw new UnauthorizedError('Acceso no autorizado');

    const cmd = new CreateExamCommand(
      dto.title,
      dto.classId,
      dto.difficulty,
      dto.attempts,
      dto.timeMinutes,
      userId,
      dto.reference || '',
      dto.status ?? EXAM_STATUS.GUARDADO,
    );

    const exam = await this.createExamHandler.execute(cmd);

    const shouldGenerate = Number(dto.totalQuestions ?? 0) > 0 || !!dto.distribution;
    if (shouldGenerate) {
      const language = readLanguage((dto as unknown as { language?: unknown })?.language, 'es');
      const strict = readStrict((dto as unknown as { strict?: unknown })?.strict, true);

      const output: any = await this.generateQuestionsUseCase.execute({
        teacherId: userId,
        subject: (dto as any).subject, 
        difficulty: dto.difficulty as any,
        totalQuestions: dto.totalQuestions,
        distribution: dto.distribution ?? undefined,
        reference: dto.reference ?? null,
        examId: exam.id,
        classId: dto.classId,
        language,
        strict,
      });

      let flat: AiQuestion[] = [];
      if (output?.questions) {
        flat = [
          ...(output.questions.multiple_choice ?? []),
          ...(output.questions.true_false ?? []),
          ...(output.questions.open_analysis ?? []),
          ...(output.questions.open_exercise ?? []),
        ];
      } else if (Array.isArray(output)) {
        flat = output as AiQuestion[];
      } else if (Array.isArray(output?.flat)) {
        flat = output.flat as AiQuestion[];
      }

      let added = 0;
      for (const q of flat) {
        const mapped = toNewExamQuestionFromAi(q);
        await this.addExamQuestionHandler.execute(
          new AddExamQuestionCommand(exam.id, userId, 'end', mapped as any),
        );
        added++;
      }

      this.logger?.log?.(
        `[${cid(req)}] createExam+generate <- exam id=${exam.id}, persistedQuestions=${added}`,
      );

      return responseSuccess(
        cid(req),
        { exam, persistedQuestions: added },
        'Examen creado y preguntas persistidas.',
        pathOf(req),
      );
    }

    this.logger?.log?.(`[${cid(req)}] createExam <- created exam id=${exam.id}`);
    return responseSuccess(cid(req), exam, 'Examen creado exitosamente.', pathOf(req));
  }

  @Post('exams/questions')
  @HttpCode(200)
  async generate(@Body() dto: GenerateQuestionsDto, @Req() req: Request) {
    this.logger.log(
      `[${cid(req)}] generateQuestions -> subject=${dto.subject}, difficulty=${dto.difficulty}, total=${dto.totalQuestions}`,
    );

    if (!dto.subject?.trim()) throw new BadRequestError('El campo "subject" es obligatorio.');
    if (dto.totalQuestions == null || dto.totalQuestions <= 0) {
      throw new BadRequestError('El campo "totalQuestions" debe ser mayor a 0.');
    }

    const teacherId = (req as any).user?.sub as string | undefined;
    if (!teacherId) throw new UnauthorizedError('Acceso no autorizado');

    const language = readLanguage((dto as unknown as { language?: unknown })?.language, 'es');
    const strict = readStrict((dto as unknown as { strict?: unknown })?.strict, true);

    const output = await this.generateQuestionsUseCase.execute({
      teacherId,
      subject: dto.subject,
      difficulty: dto.difficulty as any,
      totalQuestions: dto.totalQuestions,
      distribution: dto.distribution ?? undefined,
      reference: dto.reference ?? null,
      examId: dto.examId,
      classId: dto.classId,
      language,
      strict,
    });

    return responseSuccess(cid(req), output, 'Preguntas generadas.', pathOf(req));
  }

  @Post('exams/:examId/questions')
  @HttpCode(200)
  async addQuestion(
    @Param('examId') examId: string,
    @Body() dto: AddExamQuestionDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      `[${cid(req)}] addQuestion -> examId=${examId}, kind=${dto.kind}, position=${dto.position}`,
    );

    const userId = (req as any).user?.sub as string | undefined;
    if (!userId) throw new UnauthorizedError('Acceso no autorizado');

    const validPositions: InsertPosition[] = ['start', 'middle', 'end'];
    if (!dto.text?.trim()) throw new BadRequestError('El campo "text" es obligatorio.');
    if (!validPositions.includes(dto.position as InsertPosition)) {
      throw new BadRequestError(`El campo "position" debe ser uno de: ${validPositions.join(' | ')}.`);
    }

    const norm = normalizeFromCorrectAnswerForCreate(dto as any);

    const cmd = new AddExamQuestionCommand(examId, userId, dto.position, {
      kind: dto.kind,
      text: dto.text,
      options:
        dto.kind === QUESTION_KIND.MULTIPLE_CHOICE
          ? ((norm.options ?? dto.options) as string[])
          : undefined,
      correctOptionIndex: norm.correctOptionIndex,
      correctBoolean: norm.correctBoolean,
      expectedAnswer: norm.expectedAnswer,
    });

    const created = await this.addExamQuestionHandler.execute(cmd);
    this.logger.log(
      `[${cid(req)}] addQuestion <- created question id=${created.id} order=${created.order}`,
    );
    return responseSuccess(cid(req), created, 'Pregunta añadida con éxito.', pathOf(req));
  }

  @Put('exams/questions/:questionId')
  @HttpCode(200)
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamQuestionDto,
    @Req() req: Request,
  ) {
    this.logger.log(`[${cid(req)}] updateQuestion -> questionId=${questionId}`);

    if (
      dto.text === undefined &&
      dto.options === undefined &&
      dto.correctOptionIndex === undefined &&
      dto.correctBoolean === undefined &&
      dto.expectedAnswer === undefined &&
      (dto as any).correctAnswer === undefined
    ) {
      throw new BadRequestError('Debe enviar al menos un campo para actualizar.');
    }

    const teacherId = (req as any).user?.sub as string | undefined;
    if (!teacherId) throw new UnauthorizedError('Acceso no autorizado');

    const norm = normalizeFromCorrectAnswerForUpdate(dto as any);

    const cmd = new UpdateExamQuestionCommand(questionId, teacherId, {
      text: dto.text,
      options: dto.options !== undefined ? dto.options : (norm.options as string[] | undefined),
      correctOptionIndex: norm.correctOptionIndex ?? undefined,
      correctBoolean: norm.correctBoolean ?? undefined,
      expectedAnswer: norm.expectedAnswer ?? undefined,
    });

    const updated = await this.updateExamQuestionHandler.execute(cmd);
    this.logger.log(`[${cid(req)}] updateQuestion <- id=${updated.id}`);
    return responseSuccess(cid(req), updated, 'Pregunta editada correctamente.', pathOf(req));
  }

  @Get('exams/:examId')
  @HttpCode(200)
  async getExamById(@Param('examId') examId: string, @Req() req: Request) {
    this.logger.log(`[${cid(req)}] getExamById -> examId=${examId}`);

    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) throw new UnauthorizedError('Acceso no autorizado');
    if (!examId?.trim()) throw new BadRequestError('El campo "examId" es obligatorio.');

    const data = await this.getByIdUseCase.execute({ examId, teacherId: user.sub });
    this.logger.log(`[${cid(req)}] getExamById <- id=${data.exam.id}`);
    return responseSuccess(cid(req), data, 'Examen recuperado.', pathOf(req));
  }

  @Get('classes/:classId/exams')
  @HttpCode(200)
  async byClass(@Param('classId') classId: string, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) throw new UnauthorizedError('Acceso no autorizado');
    if (!classId?.trim()) throw new BadRequestError('El campo "classId" es obligatorio.');

    const data = await this.listClassExams.execute({ classId, teacherId: user.sub });
    return responseSuccess(cid(req), data, 'Exámenes de la clase.', pathOf(req));
  }

  @Delete('exams/:examId')
  @HttpCode(204)
  async deleteExam(@Param('examId') examId: string, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) throw new UnauthorizedError('Acceso no autorizado');
    if (!examId?.trim()) throw new BadRequestError('El campo "examId" es obligatorio.');

    const cmd = new DeleteExamCommand(examId, user.sub);
    await this.deleteExamHandler.execute(cmd);
    return;
  }
}
