import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import type {
  EmbeddingGeneratorPort,
  EmbeddingConfig,
  EmbeddingResult,
  BatchEmbeddingResult,
} from '../../domain/ports/embedding-generator.port';

/**
 * Configuración específica para OpenAI
 */
export interface OpenAIConfig {
  /** Clave API de OpenAI */
  apiKey: string;

  /** URL base de la API (opcional) */
  baseURL?: string;

  /** Organization (optional) */
  organization?: string;

  /** Project (optional) */
  project?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Maximum number of retries */
  maxRetries?: number;
}

/**
 * Modelos de embeddings disponibles en OpenAI
 */
export enum OpenAIEmbeddingModel {
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
}

/**
 * Dimensiones soportadas por cada modelo
 */
export const MODEL_DIMENSIONS = {
  [OpenAIEmbeddingModel.TEXT_EMBEDDING_3_SMALL]: [512, 1536], // Default: 1536
  [OpenAIEmbeddingModel.TEXT_EMBEDDING_3_LARGE]: [256, 1024, 3072], // Default: 3072
  [OpenAIEmbeddingModel.TEXT_EMBEDDING_ADA_002]: [1536], // Fixed: 1536
} as const;

/**
 * Límites de tokens por modelo
 */
export const MODEL_TOKEN_LIMITS = {
  [OpenAIEmbeddingModel.TEXT_EMBEDDING_3_SMALL]: 8191,
  [OpenAIEmbeddingModel.TEXT_EMBEDDING_3_LARGE]: 8191,
  [OpenAIEmbeddingModel.TEXT_EMBEDDING_ADA_002]: 8191,
} as const;

/**
 * Constantes de configuración para el procesamiento de embeddings
 */
const EMBEDDING_PROCESSING_CONFIG = {
  /** Tamaño máximo de lote para OpenAI (inputs por request) */
  MAX_BATCH_SIZE: 2048,

  /** Límite conservador de tokens para procesamiento por lotes */
  MAX_TOKENS_PER_BATCH: 250000,

  /** Delay entre lotes para evitar rate limiting (ms) */
  BATCH_DELAY_MS: 150,

  /** Caracteres por token para estimación aproximada */
  CHARS_PER_TOKEN: 4,

  /** Límite máximo de caracteres antes de tokenización */
  MAX_TEXT_LENGTH: 50000,
} as const;

/**
 * Adaptador para generación de embeddings usando OpenAI
 *
 * Implementa la interfaz EmbeddingGeneratorPort utilizando
 * los modelos de embeddings de OpenAI
 */
export class OpenAIEmbeddingAdapter implements EmbeddingGeneratorPort {
  private readonly client: OpenAI;
  private readonly defaultConfig: Required<EmbeddingConfig>;
  private readonly logger = new Logger(OpenAIEmbeddingAdapter.name);

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      project: config.project,
      timeout: config.timeout || 60000, // 60 segundos
      maxRetries: config.maxRetries || 3,
    });

    // Default configuration
    this.defaultConfig = {
      model: OpenAIEmbeddingModel.TEXT_EMBEDDING_3_SMALL,
      dimensions: 1536,
      additionalConfig: {},
    };
  }

  /**
   * Genera embedding para un texto individual
   */
  async generateEmbedding(
    text: string,
    config?: Partial<EmbeddingConfig>,
  ): Promise<EmbeddingResult> {
    try {
      // 1. Validar entrada
      this.validateText(text);

      // 2. Prepare configuration
      const finalConfig = this.mergeConfig(config);

      // 3. Llamar a OpenAI
      const response = await this.client.embeddings.create({
        model: finalConfig.model,
        input: text,
        dimensions: this.shouldIncludeDimensions(finalConfig.model)
          ? finalConfig.dimensions
          : undefined,
        encoding_format: 'float',
        ...finalConfig.additionalConfig,
      });

      // 4. Procesar respuesta
      const embedding = response.data[0];
      if (!embedding || !embedding.embedding) {
        throw new Error('No se recibió embedding válido de OpenAI');
      }

      return {
        embedding: embedding.embedding,
        dimensions: embedding.embedding.length,
        tokensUsed: response.usage.total_tokens,
        model: finalConfig.model,
      };
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw this.handleOpenAIError(error, 'generateEmbedding');
    }
  }

  /**
   * Genera embeddings para múltiples textos en lote
   */
  async generateBatchEmbeddings(
    texts: string[],
    config?: Partial<EmbeddingConfig>,
  ): Promise<BatchEmbeddingResult> {
    try {
      // 1. Validar entrada
      if (!texts || texts.length === 0) {
        throw new Error('Se requiere al menos un texto para procesar');
      }

      // 2. Si hay demasiados textos, procesarlos en lotes
      if (texts.length > 2048) {
        this.logger.log(
          `Processing ${texts.length} texts in batches (maximum 2048 per batch)`,
        );
        return await this.processBatchesSequentially(texts, config);
      }

      // 3. Estimate tokens to avoid exceeding the limit
      const estimatedTokens = this.estimateTokens(texts);

      if (estimatedTokens > EMBEDDING_PROCESSING_CONFIG.MAX_TOKENS_PER_BATCH) {
        this.logger.log(
          `Tokens estimados (${estimatedTokens}) exceden límite (${EMBEDDING_PROCESSING_CONFIG.MAX_TOKENS_PER_BATCH}). Processing in smaller batches.`,
        );
        return await this.processBatchesByTokenLimit(
          texts,
          EMBEDDING_PROCESSING_CONFIG.MAX_TOKENS_PER_BATCH,
          config,
        );
      }

      // Validar cada texto
      texts.forEach((text, index) => {
        try {
          this.validateText(text);
        } catch (error) {
          throw new Error(
            `Texto inválido en índice ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      });

      // 4. Prepare configuration

      const finalConfig = this.mergeConfig(config);

      // 5. Llamar a OpenAI
      const response = await this.client.embeddings.create({
        model: finalConfig.model,
        input: texts,
        dimensions: this.shouldIncludeDimensions(finalConfig.model)
          ? finalConfig.dimensions
          : undefined,
        encoding_format: 'float',
        ...finalConfig.additionalConfig,
      });

      // 4. Procesar respuesta
      if (!response.data || response.data.length !== texts.length) {
        throw new Error(
          `Número de embeddings recibidos (${response.data?.length || 0}) no coincide con textos enviados (${texts.length})`,
        );
      }

      const embeddings = response.data.map((item) => ({
        embedding: item.embedding,
        dimensions: item.embedding.length,
        index: item.index,
      }));

      // Sort by index to maintain correspondence
      embeddings.sort((a, b) => a.index - b.index);

      return {
        embeddings: embeddings.map((item) => item.embedding),
        totalEmbeddings: embeddings.length,
        dimensions: embeddings[0]?.dimensions || 0,
        totalTokensUsed: response.usage.total_tokens,
        model: finalConfig.model,
        successfulCount: embeddings.length,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      this.logger.error('Error generating batch embeddings:', error);
      throw this.handleOpenAIError(error, 'generateBatchEmbeddings');
    }
  }

  /**
   * Valida si un texto es apto para generar embeddings
   */
  validateText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      throw new Error('El texto debe ser una cadena válida no vacía');
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error('El texto no puede estar vacío');
    }

    if (trimmed.length > EMBEDDING_PROCESSING_CONFIG.MAX_TEXT_LENGTH) {
      // Approximate limit before tokenization
      throw new Error('Text is too long to process');
    }

    return true;
  }

  /**
   * Obtiene información sobre los modelos disponibles
   */
  getAvailableModels(): string[] {
    return Object.values(OpenAIEmbeddingModel);
  }

  /**
   * Obtiene las dimensiones soportadas por un modelo
   */
  getModelDimensions(model: string): number[] {
    if (model in MODEL_DIMENSIONS) {
      return [...MODEL_DIMENSIONS[model as OpenAIEmbeddingModel]];
    }
    return [1536]; // Default dimension
  }

  /**
   * Obtiene el límite de tokens para un modelo
   */
  getModelTokenLimit(model: string): number {
    if (model in MODEL_TOKEN_LIMITS) {
      return MODEL_TOKEN_LIMITS[model as OpenAIEmbeddingModel];
    }
    return 8191; // Default limit
  }

  /**
   * Obtiene configuración por defecto
   */
  getDefaultConfig(): EmbeddingConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Obtiene información sobre el modelo utilizado
   */
  getModelInfo() {
    return {
      name: this.defaultConfig.model,
      dimensions: this.defaultConfig.dimensions,
      maxTokens: this.getModelTokenLimit(this.defaultConfig.model),
      costPerToken: 0.00002, // Precio aproximado de text-embedding-3-small
    };
  }

  // ============ PRIVATE METHODS ============

  /**
   * Combina la configuración por defecto con la proporcionada
   */
  private mergeConfig(
    config?: Partial<EmbeddingConfig>,
  ): Required<EmbeddingConfig> {
    const merged = {
      ...this.defaultConfig,
      ...config,
    };

    // Validar modelo
    if (!this.getAvailableModels().includes(merged.model)) {
      throw new Error(`Modelo no soportado: ${merged.model}`);
    }

    // Validar dimensiones
    const supportedDimensions = this.getModelDimensions(merged.model);
    if (!supportedDimensions.includes(merged.dimensions)) {
      throw new Error(
        `Dimensiones ${merged.dimensions} no soportadas para modelo ${merged.model}. Soportadas: ${supportedDimensions.join(', ')}`,
      );
    }

    return merged;
  }

  /**
   * Determina si se debe incluir el parámetro dimensions
   */
  private shouldIncludeDimensions(model: string): boolean {
    // text-embedding-ada-002 does not support the dimensions parameter
    return (
      (model as OpenAIEmbeddingModel) !==
      OpenAIEmbeddingModel.TEXT_EMBEDDING_ADA_002
    );
  }

  /**
   * Maneja errores de OpenAI y los convierte a errores descriptivos
   */
  private handleOpenAIError(error: unknown, operation: string): Error {
    if (error instanceof OpenAI.APIError) {
      const message = `Error de API OpenAI en ${operation}: ${error.message}`;

      switch (error.status) {
        case 401:
          return new Error(`${message} - Clave API inválida o sin permisos`);
        case 429:
          return new Error(
            `${message} - Límite de rate excedido, intenta más tarde`,
          );
        case 400:
          return new Error(
            `${message} - Solicitud inválida, verifica los parámetros`,
          );
        case 500:
        case 502:
        case 503:
          return new Error(
            `${message} - Error del servidor OpenAI, intenta más tarde`,
          );
        default:
          return new Error(message);
      }
    }

    if (error instanceof OpenAI.APIConnectionError) {
      return new Error(
        `Error de conexión con OpenAI en ${operation}: ${error.message}`,
      );
    }

    if (error instanceof OpenAI.RateLimitError) {
      return new Error(
        `Límite de rate excedido en ${operation}: ${error.message}`,
      );
    }

    if (error instanceof Error) {
      return new Error(`Error en ${operation}: ${error.message}`);
    }

    return new Error(`Error desconocido en ${operation}: ${String(error)}`);
  }

  /**
   * Estima el número de tokens para un array de textos
   *
   * Nota: Esta es una estimación aproximada. Para conteo preciso
   * se recomendaría usar tiktoken u otra librería de tokenización.
   */
  private estimateTokens(texts: string[]): number {
    const totalChars = texts.reduce((sum, text) => {
      const trimmedText = text.trim();

      const spaceRatio = (text.match(/\s/g) || []).length / text.length;
      const spaceFactor = 1 + spaceRatio * 0.5;

      const punctuationRatio =
        (text.match(/[.,;:!?()[\]{}"'-]/g) || []).length / text.length;
      const punctuationFactor = 1 + punctuationRatio * 0.3;

      const adjustedLength =
        trimmedText.length * spaceFactor * punctuationFactor;

      return sum + adjustedLength;
    }, 0);

    return Math.ceil(totalChars / EMBEDDING_PROCESSING_CONFIG.CHARS_PER_TOKEN);
  }

  /**
   * Procesa textos en lotes secuenciales respetando el límite de MAX_BATCH_SIZE inputs
   */
  private async processBatchesSequentially(
    texts: string[],
    config?: Partial<EmbeddingConfig>,
  ): Promise<BatchEmbeddingResult> {
    const batchSize = EMBEDDING_PROCESSING_CONFIG.MAX_BATCH_SIZE;
    const batches: string[][] = [];

    // Dividir en lotes
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    this.logger.log(
      `Processing ${batches.length} batches of maximum ${batchSize} texts each`,
    );

    const allEmbeddings: number[][] = [];
    let totalTokensUsed = 0;
    let successfulCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Procesar cada lote
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(
        `Processing batch ${i + 1}/${batches.length} (${batch.length} texts)`,
      );

      try {
        // Recursive call but with smaller batch
        const batchResult = await this.generateBatchEmbeddings(batch, config);

        allEmbeddings.push(...batchResult.embeddings);
        totalTokensUsed += batchResult.totalTokensUsed;
        successfulCount += batchResult.successfulCount;
        failedCount += batchResult.failedCount;
        errors.push(...batchResult.errors);

        // Small pause between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        this.logger.error(`Error in batch ${i + 1}:`, error);
        failedCount += batch.length;
        errors.push(
          `Batch ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      embeddings: allEmbeddings,
      totalEmbeddings: allEmbeddings.length,
      dimensions: allEmbeddings[0]?.length || 0,
      totalTokensUsed,
      model: this.mergeConfig(config).model,
      successfulCount,
      failedCount,
      errors,
    };
  }

  /**
   * Procesa textos en lotes respetando el límite de tokens
   */
  private async processBatchesByTokenLimit(
    texts: string[],
    maxTokens: number,
    config?: Partial<EmbeddingConfig>,
  ): Promise<BatchEmbeddingResult> {
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentTokens = 0;

    // Split into batches by token limit
    for (const text of texts) {
      const textTokens = this.estimateTokens([text]);

      if (currentTokens + textTokens > maxTokens && currentBatch.length > 0) {
        batches.push([...currentBatch]);
        currentBatch = [text];
        currentTokens = textTokens;
      } else {
        currentBatch.push(text);
        currentTokens += textTokens;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    this.logger.log(
      `Processing ${batches.length} batches by token limit (maximum ${maxTokens} tokens per batch)`,
    );

    const allEmbeddings: number[][] = [];
    let totalTokensUsed = 0;
    let successfulCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Procesar cada lote
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const estimatedTokens = this.estimateTokens(batch);
      this.logger.debug(
        `Processing batch ${i + 1}/${batches.length} (${batch.length} texts, ~${estimatedTokens} tokens)`,
      );

      try {
        // Recursive call but with smaller batch
        const batchResult = await this.generateBatchEmbeddings(batch, config);

        allEmbeddings.push(...batchResult.embeddings);
        totalTokensUsed += batchResult.totalTokensUsed;
        successfulCount += batchResult.successfulCount;
        failedCount += batchResult.failedCount;
        errors.push(...batchResult.errors);

        // Small pause between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        this.logger.error(`Error in batch ${i + 1}:`, error);
        failedCount += batch.length;
        errors.push(
          `Batch ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      embeddings: allEmbeddings,
      totalEmbeddings: allEmbeddings.length,
      dimensions: allEmbeddings[0]?.length || 0,
      totalTokensUsed,
      model: this.mergeConfig(config).model,
      successfulCount,
      failedCount,
      errors,
    };
  }
}
