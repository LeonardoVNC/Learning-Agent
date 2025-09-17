import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module'

import { EXAM_REPO, EXAM_QUESTION_REPO, EXAM_AI_GENERATOR } from './tokens';

import { PrismaExamRepository } from './infrastructure/persistence/exam.prisma.repository';
import { PrismaExamQuestionRepository } from './infrastructure/persistence/exam-question.prisma.repository';

import { ExamsController } from './infrastructure/http/exams.controller';

import { CreateExamCommandHandler } from './application/commands/create-exam.handler';
import { AddExamQuestionCommandHandler } from './application/commands/add-exam-question.handler';
import { UpdateExamQuestionCommandHandler } from './application/commands/update-exam-question.handler';
import { GenerateExamUseCase } from './application/commands/generate-exam.usecase';
import { DeleteExamCommandHandler } from './application/commands/delete-exam.handler';

import { GenerateQuestionsUseCase } from './application/commands/generate-questions.usecase';
import { ListClassExamsUseCase } from './application/queries/list-class-exams.usecase';
import { GetExamByIdUseCase } from './application/queries/get-exam-by-id.usecase';

import { LlmAiQuestionGenerator } from './infrastructure/ai/llm-ai-question.generator';
import { LLM_PORT } from '../llm/tokens';
import { GeminiAdapter } from '../llm/infrastructure/adapters/gemini.adapter';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';

import { ExamsStartupCheck } from './infrastructure/startup/exams-startup.check';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => IdentityModule),
    PromptTemplateModule,
  ],
  providers: [
    { provide: EXAM_REPO, useClass: PrismaExamRepository },
    { provide: EXAM_QUESTION_REPO, useClass: PrismaExamQuestionRepository },

    GeminiAdapter,
    { provide: LLM_PORT, useExisting: GeminiAdapter },
    { provide: EXAM_AI_GENERATOR, useClass: LlmAiQuestionGenerator },

    GenerateExamUseCase,
    CreateExamCommandHandler,
    AddExamQuestionCommandHandler,
    UpdateExamQuestionCommandHandler,
    GenerateQuestionsUseCase,
    DeleteExamCommandHandler, 
    ListClassExamsUseCase,
    GetExamByIdUseCase,

    ExamsStartupCheck,

    
  ],
  controllers: [ExamsController],
})
export class ExamsModule {}
