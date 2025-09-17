import { DocumentIndex } from '../entities/document-index.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';

export interface DocumentIndexGeneratorPort {
  /**
   * Genera un índice con ejercicios a partir de los chunks de un documento
   */
  generateDocumentIndex(
    documentId: string,
    documentTitle: string,
    chunks: DocumentChunk[],
    config?: Partial<IndexGenerationConfig>,
  ): Promise<DocumentIndex>;
}

export interface IndexGenerationConfig {
  /** Modelo de LLM a utilizar */
  model?: string;

  /** Temperatura para la generación */
  temperature?: number;

  /** Número máximo de tokens por respuesta */
  maxTokens?: number;

  /** Idioma del contenido */
  language?: string;

  /** Nivel de detalle deseado */
  detailLevel?: 'basic' | 'intermediate' | 'advanced';

  /** Tipos de ejercicios a incluir */
  exerciseTypes?: string[];
}
