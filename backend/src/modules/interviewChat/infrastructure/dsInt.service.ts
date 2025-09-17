import { PROMPT_TEMPLATE_PORT } from 'src/modules/prompt-template/tokens';
import type { PromptTemplatePort } from 'src/modules/prompt-template/domain/ports/prompt-template.port';
import { Inject, Injectable } from '@nestjs/common';
import type { LlmPort } from 'src/modules/llm/domain/ports/llm.port';
import { LLM_PORT } from 'src/modules/llm/tokens';
import {
  MultipleSelectionResponse,
  DoubleOptionResponse,
  AdviceResponse,
} from 'src/modules/reinforcement/infrastructure/http/dto/response';
import { ChatResponse } from 'src/modules/reinforcement/infrastructure/http/dto/chat-response';
import { QuestionResponse } from './http/dto/question-response';

@Injectable()
export class DsIntService {
  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    @Inject(PROMPT_TEMPLATE_PORT)
    private readonly promptTemplatePort: PromptTemplatePort,
  ) {}
  async generateQuestion(topico: string): Promise<QuestionResponse> {
    try {
      const vars: Record<string, string> = {
        topico: topico,
      };
      const prompt = await this.promptTemplatePort.render('interview.v1', vars);
      const resp = await this.llm.complete(prompt, {
        model: { provider: 'deepseek', name: 'deepseek-chat' },
        temperature: 1.3,
        metadata: {
          response_format: 'json_object',
        },
        maxTokens: 500,
      });
      const responseContent = resp.text;
      console.log('responseContent:', responseContent);
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const response = JSON.parse(responseContent) as QuestionResponse;
      return response;
    } catch (error) {
      console.error('OpenAI Error in generateQuestion:', error);
      throw new Error('Error generating question');
    }
  }
  async generateAdvise(
    question: string,
    answer: string,
    topic: string,
  ): Promise<AdviceResponse> {
    try {
      const vars: Record<string, string> = {
        user_question: question,
        user_answer: answer,
        topic: topic,
      };

      const prompt = await this.promptTemplatePort.render(
        'interview-advice.v1',
        vars,
      );
      const resp = await this.llm.complete(prompt, {
        model: { provider: 'deepseek', name: 'deepseek-chat' },
        temperature: 1.3,
        metadata: {
          response_format: 'json_object',
        },
        maxTokens: 500,
      });

      const responseContent = resp.text;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const coachingResponse: AdviceResponse = JSON.parse(
        responseContent,
      ) as AdviceResponse;
      return coachingResponse;
    } catch (error) {
      console.error('OpenAI Error in generateAdvise:', error);
      throw new Error('Error generating AI response');
    }
  }

  async generateMultipleSelection(
    topico: string,
  ): Promise<MultipleSelectionResponse> {
    try {
      const vars: Record<string, string> = {
        topico: topico,
      };
      const prompt = await this.promptTemplatePort.render(
        'interview.multipleSelection.v1',
        vars,
      );
      const resp = await this.llm.complete(prompt, {
        model: { provider: 'deepseek', name: 'deepseek-chat' },
        temperature: 0.7,
        metadata: {
          response_format: 'json_object',
        },
        maxTokens: 1000,
      });
      const responseContent = resp.text;
      console.log('responseContent:', responseContent);
      if (!responseContent) {
        throw new Error('No response from AI');
      }
      const response = JSON.parse(responseContent) as MultipleSelectionResponse;
      return response;
    } catch (error) {
      console.error('OpenAI Error in generateMultipleSelection:', error);
      throw new Error('Error generating multiple selection and question');
    }
  }
  async generatedoubleOption(topico: string): Promise<DoubleOptionResponse> {
    try {
      const vars: Record<string, string> = {
        topico: topico,
      };
      const prompt = await this.promptTemplatePort.render(
        'interview.doubleOption.v1',
        vars,
      );
      const resp = await this.llm.complete(prompt, {
        model: { provider: 'deepseek', name: 'deepseek-chat' },
        temperature: 0.7,
        metadata: {
          response_format: 'json_object',
        },
        maxTokens: 1000,
      });
      const responseContent = resp.text;
      console.log('responseContent:', responseContent);
      if (!responseContent) {
        throw new Error('No response from AI');
      }
      const responseDO = JSON.parse(responseContent) as DoubleOptionResponse;
      return responseDO;
    } catch (error) {
      console.error('OpenAI Error in generateMultipleSelection:', error);
      throw new Error('Error generating multiple selection and question');
    }
  }
  async generateResponse(question: string): Promise<ChatResponse> {
    try {
      const vars: Record<string, string> = {
        user_question: question,
      };
      const prompt = await this.promptTemplatePort.render(
        'singleQuestion.v1',
        vars,
      );
      const resp = await this.llm.complete(prompt, {
        model: { provider: 'deepseek', name: 'deepseek-chat' },
        temperature: 1.3,
        metadata: {
          response_format: 'json_object',
        },
        maxTokens: 500,
      });
      return JSON.parse(
        resp.text || '{"answer":"No response from AI"}',
      ) as ChatResponse;
    } catch (error) {
      console.error('OpenAI Error:', error);
      throw new Error('Error generating AI response');
    }
  }
}
