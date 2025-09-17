export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export type LlmMessage = {
  role: LlmRole;
  content: string;
  name?: string;
};

export type LlmModel = {
  provider: 'ollama' | 'openai' | 'gemini' | 'deepseek' |string;
  name: string;
};

export type LlmGenOptions = {
  model: LlmModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  metadata?: Record<string, any>;
  vendorOptions?: Record<string, any>;
};

export type LlmTextOutput = {
  text: string;
  finishReason?: 'stop' | 'length' | 'error';
  tokens?: { prompt?: number; completion?: number; total?: number };
  raw?: unknown;
};

export interface LlmPort {
  complete(prompt: string, options: LlmGenOptions): Promise<LlmTextOutput>;
  chat(messages: LlmMessage[], options: LlmGenOptions): Promise<LlmTextOutput>;
  embed(
    texts: string[],
    options: Pick<LlmGenOptions, 'model' | 'metadata' | 'vendorOptions'>,
  ): Promise<number[][]>;
  stream?(
    messages: LlmMessage[] | string,
    options: LlmGenOptions,
    onToken: (chunk: string) => void,
  ): Promise<LlmTextOutput>;
}
