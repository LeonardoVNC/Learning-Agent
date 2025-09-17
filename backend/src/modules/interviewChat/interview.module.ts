import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AiConfigService } from '../../core/ai/ai.config';
import { LlmModule } from '../llm/llm.module';
import { ChatIntController } from './infrastructure/http/chatInt.controller';
import { DeepseekAdapter } from '../llm/infrastructure/adapters/ds.adapter';
import { LLM_PORT } from '../llm/tokens';
import { DsIntService } from './infrastructure/dsInt.service';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';

@Module({
  imports: [PrismaModule, LlmModule, PromptTemplateModule],
  controllers: [ChatIntController],
  providers: [
    AiConfigService,
    DsIntService,
    DeepseekAdapter,
    { provide: LLM_PORT, useExisting: DeepseekAdapter },
  ],
})
export class InterviewModule {}
