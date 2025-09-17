import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AiConfigService } from '../../core/ai/ai.config';
import { LlmModule } from '../llm/llm.module';
import { ChatController } from './infrastructure/http/chat.controller';
import { DeepseekAdapter } from '../llm/infrastructure/adapters/ds.adapter';
import { LLM_PORT } from '../llm/tokens';
import { DsService } from './infrastructure/ds.service';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';

@Module({
  imports: [PrismaModule, LlmModule, PromptTemplateModule],
  controllers: [ChatController],
  providers: [
    DeepseekAdapter,
    DsService,
    { provide: LLM_PORT, useExisting: DeepseekAdapter },
    // persistencia
    //{ provide: EXAM_REPO, useClass: ExamPrismaRepository },
    // adaptador IA
    AiConfigService,
    //CreateExamCommandHandler,
  ],
  exports: [DsService],
})
export class ReinforcementModule {}
