import { Inject, Injectable } from '@nestjs/common';
import { LLM_PORT } from '../../../llm/tokens';
import type { LlmPort } from '../../../llm/domain/ports/llm.port';
import type { PromptTemplatePort } from '../../../prompt-template/domain/ports/prompt-template.port';
import { PROMPT_TEMPLATE_PORT } from '../../../prompt-template/tokens';
import { GenerateExamInput, GeneratedExamResult } from '../../infrastructure/http/dtos/exam.types';
import { BadRequestError, NotFoundError } from 'src/shared/handler/errors';
import { LLM_DEFAULTS } from '../../domain/constants/exam.constants';

@Injectable()
export class GenerateExamUseCase {

  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    @Inject(PROMPT_TEMPLATE_PORT)
    private readonly templates: PromptTemplatePort,
  ) {}

  async execute(input: GenerateExamInput): Promise<GeneratedExamResult> {
    const teacherId = String(input?.extra?.teacherId ?? '').trim();

    if (!teacherId) {
      throw new BadRequestError(
        'teacherId es obligatorio en extra.teacherId para generar el examen',
      );
    }

    if (!input.subject?.trim() || !input.level?.trim()) {
      throw new BadRequestError(
        'El subject y el level son obligatorios para generar un examen',
      );
    }
    if (!input.numQuestions || input.numQuestions <= 0) {
      throw new BadRequestError('El número de preguntas debe ser mayor a 0');
    }

    let prompt: string | undefined;
    try {
      prompt = await this.templates.render(input.templateId, {
        subject: input.subject,
        level: input.level,
        numQuestions: input.numQuestions,
        format: input.format ?? LLM_DEFAULTS.FORMAT,
        ...input.extra,
      });
    } catch (err: any) {
      throw new NotFoundError(
        'No se ha encontrado la plantilla de examen solicitada',
      );
    }

    if (!prompt || !String(prompt).trim()) {
      throw new NotFoundError(
        'No se ha encontrado la plantilla de examen solicitada',
      );
    }

    const model = input.model ?? {
      provider: LLM_DEFAULTS.PROVIDER,
      name: LLM_DEFAULTS.MODEL,
    };
    
    const out = await this.llm.complete(prompt, {
      model,
      temperature: 0.2,
      maxTokens: 2048,
      vendorOptions: {
        response_format: input.format === LLM_DEFAULTS.FORMAT ? 'json' : undefined,
      },
    });

    return { output: out.text, provider: model.provider, model: model.name };
  }
}
