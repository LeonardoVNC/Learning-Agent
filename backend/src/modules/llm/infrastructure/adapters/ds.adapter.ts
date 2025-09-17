import { Injectable } from '@nestjs/common';
import {
  LlmGenOptions,
  LlmMessage,
  LlmPort,
  LlmTextOutput,
} from '../../domain/ports/llm.port';
import OpenAI from 'openai';

@Injectable()
export class DeepseekAdapter implements LlmPort {
  private deepseek: OpenAI;
  constructor() {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || 'your-api-key-here',
      baseURL: 'https://api.deepseek.com/v1',
    });
  }
  embed(
    texts: string[],
    options: Pick<LlmGenOptions, 'model' | 'metadata' | 'vendorOptions'>,
  ): Promise<number[][]> {
    console.log('texts', texts, 'options', options);
    throw new Error('Method not implemented.');
  }
  stream?(
    messages: LlmMessage[] | string,
    options: LlmGenOptions,
    onToken: (chunk: string) => void,
  ): Promise<LlmTextOutput> {
    console.log('messages', messages, 'options', options, 'onToken', onToken);
    throw new Error('Method not implemented.');
  }
  async complete(
    prompt: string,
    options: LlmGenOptions,
  ): Promise<LlmTextOutput> {
    const completion = await this.deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are an academic assistant that always responds in a strict JSON format according to the provided instructions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options.temperature ?? 1.3,
      response_format: {
        type: options.metadata?.response_format || 'json_object ',
      },
      max_tokens: options.maxTokens ?? 500,
    });

    console.log('prompt', prompt, 'options', options);
    return {
      text: completion.choices[0]?.message?.content || '',
    };
  }
  chat(messages: LlmMessage[], options: LlmGenOptions): Promise<LlmTextOutput> {
    console.log('messages', messages, 'options', options);
    return Promise.resolve({
      text: 'Hello world',
      tokens: { total: 0 },
      raw: {},
    });
  }
}
