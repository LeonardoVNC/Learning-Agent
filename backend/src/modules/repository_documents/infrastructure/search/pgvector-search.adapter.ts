import type { PrismaService } from '../../../../core/prisma/prisma.service';
import type {
  VectorSearchPort,
  VectorSearchOptions,
  VectorSearchResult,
  SemanticSearchResult,
  SimilarDocument,
} from '../../domain/ports/vector-search.port';
import type { EmbeddingGeneratorPort } from '../../domain/ports/embedding-generator.port';

/**
 * opciones de configuración para pgvector
 */
export interface PgVectorConfig {
  /** Función de distancia a utilizar */
  distanceFunction: 'cosine' | 'euclidean' | 'inner_product';

  /** Configuración del índice HNSW */
  indexConfig?: {
    /** Número de conexiones por nodo */
    m?: number;

    /** Tamaño del buffer de construcción */
    efConstruction?: number;

    /** Factor de búsqueda */
    ef?: number;
  };
}

/**
 * adaptador para búsqueda vectorial usando pgvector
 *
 * implementa búsquedas por similaridad semántica con pgvector
 */
export class PgVectorSearchAdapter implements VectorSearchPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingGenerator: EmbeddingGeneratorPort,
    private readonly config: PgVectorConfig = {
      distanceFunction: 'cosine',
    },
  ) {}

  /**
   * busca chunks similares usando un vector de embedding
   */
  async searchByVector(
    queryVector: number[],
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult> {
    try {
      // validar entrada
      this.validateVector(queryVector);
      const finalOptions = this.normalizeOptions(options);

      // construir consulta según si hay umbral o no
      let query: string;
      let params: any[];

      if (finalOptions.similarityThreshold) {
        query = `
          SELECT 
            dc.id,
            dc."documentId",
            dc."chunkIndex",
            dc.content,
            dc.type,
            dc."wordCount",
            dc."charCount",
            dc."startPosition",
            dc."endPosition",
            dc.metadata,
            dc."createdAt",
            d."documentTitle" as document_title,
            d."originalName" as document_file_name,
            d.size as document_file_size,
            d."contentType" as document_content_type,
            (1 - (dc.embedding <=> $1::vector)) as similarity_score
          FROM document_chunks dc
          INNER JOIN "Document" d ON dc."documentId" = d.id
          WHERE dc.embedding IS NOT NULL
          AND (1 - (dc.embedding <=> $1::vector)) >= $2
          ORDER BY dc.embedding <=> $1::vector ASC
          LIMIT $3
        `;
        params = [
          `[${queryVector.join(',')}]`,
          finalOptions.similarityThreshold,
          finalOptions.limit,
        ];
      } else {
        query = `
          SELECT 
            dc.id,
            dc."documentId",
            dc."chunkIndex",
            dc.content,
            dc.type,
            dc."wordCount",
            dc."charCount",
            dc."startPosition",
            dc."endPosition",
            dc.metadata,
            dc."createdAt",
            d."documentTitle" as document_title,
            d."originalName" as document_file_name,
            d.size as document_file_size,
            d."contentType" as document_content_type,
            (1 - (dc.embedding <=> $1::vector)) as similarity_score
          FROM document_chunks dc
          INNER JOIN "Document" d ON dc."documentId" = d.id
          WHERE dc.embedding IS NOT NULL
          ORDER BY dc.embedding <=> $1::vector ASC
          LIMIT $2
        `;
        params = [`[${queryVector.join(',')}]`, finalOptions.limit];
      }

      // ejecutar consulta de búsqueda vectorial
      console.log(`🔍 PgVector DEBUG: Ejecutando consulta con params:`, {
        queryVectorLength: queryVector.length,
        similarityThreshold: finalOptions.similarityThreshold,
        limit: finalOptions.limit,
        hasThreshold: !!finalOptions.similarityThreshold
      });
      
      const results = await this.prisma.$queryRawUnsafe(query, ...params);
      
      console.log(`PgVector DEBUG: Resultados obtenidos: ${(results as any[]).length}`);
      if ((results as any[]).length > 0) {
        console.log(`🔍 PgVector DEBUG: Primer resultado:`, {
          documentId: (results as any[])[0].documentId,
          similarity: (results as any[])[0].similarity_score,
          chunkId: (results as any[])[0].id
        });
      }

      // mapear resultados a la interfaz esperada
      const mappedResults = (results as any[]).map((row) => ({
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        type: row.type,
        chunkIndex: row.chunkIndex,
        wordCount: row.wordCount,
        charCount: row.charCount,
        startPosition: row.startPosition,
        endPosition: row.endPosition,
        similarityScore: parseFloat(row.similarity_score),
        documentTitle: row.document_title,
        documentFileName: row.document_file_name,
        documentFileSize: row.document_file_size,
        documentContentType: row.document_content_type,
        metadata: row.metadata,
        createdAt: row.createdAt,
      }));

      return {
        chunks: mappedResults,
        totalResults: mappedResults.length,
        searchOptions: finalOptions,
        processingTimeMs: 0, // calcular tiempo real
      };
    } catch (error) {
      console.error('Error en búsqueda vectorial:', error);
      throw this.handleSearchError(error, 'searchByVector');
    }
  }

  /**
   * busca chunks similares convirtiendo texto a vector primero
   */
  async searchByText(
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<SemanticSearchResult> {
    try {
      // validar entrada
      if (!query || typeof query !== 'string') {
        throw new Error('El query de búsqueda debe ser una cadena válida');
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length === 0) {
        throw new Error('El query de búsqueda no puede estar vacío');
      }

      // 1. generar embedding del texto de consulta
      const embeddingResult =
        await this.embeddingGenerator.generateEmbedding(trimmedQuery);

      // 2. buscar usando el vector
      const vectorResult = await this.searchByVector(
        embeddingResult.embedding,
        options,
      );

      return {
        query: trimmedQuery,
        queryEmbedding: embeddingResult,
        searchResult: vectorResult,
        totalResults: vectorResult.totalResults,
        processingTimeMs: vectorResult.processingTimeMs,
      };
    } catch (error) {
      console.error('Error en búsqueda por texto:', error);
      throw this.handleSearchError(error, 'searchByText');
    }
  }

  /**
   * encuentra chunks similares a uno específico
   */
  async findSimilarChunks(
    chunkId: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult> {
    try {
      // 1. obtener el chunk de referencia
      const referenceChunk = await this.getChunkEmbedding(chunkId);
      if (!referenceChunk) {
        throw new Error(`No se encontró el chunk con ID: ${chunkId}`);
      }

      // 2. buscar chunks similares excluyendo el mismo
      const finalOptions = {
        ...options,
        excludeChunkIds: [...(options.excludeChunkIds || []), chunkId],
      };

      return this.searchByVector(referenceChunk.embedding, finalOptions);
    } catch (error) {
      console.error('Error encontrando chunks similares:', error);
      throw this.handleSearchError(error, 'findSimilarChunks');
    }
  }

  /**
   * encuentra documentos similares a uno específico
   */
  async findSimilarDocuments(
    documentId: string,
    options: VectorSearchOptions = {},
  ): Promise<SimilarDocument[]> {
    try {
      // 1. obtener embeddings promedio del documento
      const documentEmbedding =
        await this.getDocumentAverageEmbedding(documentId);
      if (!documentEmbedding) {
        throw new Error(
          `No se encontraron embeddings para el documento: ${documentId}`,
        );
      }

      // 2. buscar documentos similares
      const finalOptions = {
        ...options,
        excludeDocumentIds: [...(options.excludeDocumentIds || []), documentId],
        groupByDocument: true,
      };

      const searchResult = await this.searchByVector(
        documentEmbedding,
        finalOptions,
      );

      // 3. agrupar por documento y calcular similaridad promedio
      const documentMap = new Map<
        string,
        {
          chunks: typeof searchResult.chunks;
          totalSimilarity: number;
          maxSimilarity: number;
        }
      >();

      searchResult.chunks.forEach((chunk) => {
        const docId = chunk.documentId;
        if (!documentMap.has(docId)) {
          documentMap.set(docId, {
            chunks: [],
            totalSimilarity: 0,
            maxSimilarity: 0,
          });
        }

        const docData = documentMap.get(docId)!;
        docData.chunks.push(chunk);
        docData.totalSimilarity += chunk.similarityScore;
        docData.maxSimilarity = Math.max(
          docData.maxSimilarity,
          chunk.similarityScore,
        );
      });

      // 4. convertir a similardocument[]
      const similarDocuments: SimilarDocument[] = [];
      for (const [docId, data] of documentMap) {
        const firstChunk = data.chunks[0];
        similarDocuments.push({
          documentId: docId,
          title: firstChunk.documentTitle,
          fileName: firstChunk.documentFileName,
          averageSimilarity: data.totalSimilarity / data.chunks.length,
          maxSimilarity: data.maxSimilarity,
          relevantChunks: data.chunks.slice(0, 3), // 3 chunks más relevantes
          totalChunks: data.chunks.length,
        });
      }

      // 5. ordenar por similaridad promedio
      similarDocuments.sort(
        (a, b) => b.averageSimilarity - a.averageSimilarity,
      );

      return similarDocuments.slice(0, options.limit || 10);
    } catch (error) {
      console.error('Error encontrando documentos similares:', error);
      throw this.handleSearchError(error, 'findSimilarDocuments');
    }
  }

  // ============ métodos privados ============

  /**
   * valida que el vector sea válido
   */
  private validateVector(vector: number[]): void {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('El vector debe ser un array no vacío de números');
    }

    if (vector.some((val) => typeof val !== 'number' || !isFinite(val))) {
      throw new Error(
        'Todos los elementos del vector deben ser números finitos',
      );
    }

    // verificar dimensiones típicas
    if (![256, 512, 1024, 1536, 3072].includes(vector.length)) {
      console.warn(`Dimensiones inusuales del vector: ${vector.length}`);
    }
  }

  /**
   * normaliza las opciones de búsqueda
   */
  private normalizeOptions(
    options: VectorSearchOptions,
  ): Required<VectorSearchOptions> {
    return {
      limit: options.limit || 10,
      similarityThreshold: options.similarityThreshold || 0.7,
      includeMetadata: options.includeMetadata ?? true,
      includeContent: options.includeContent ?? true,
      documentIds: options.documentIds || [],
      chunkTypes: options.chunkTypes || [],
      excludeChunkIds: options.excludeChunkIds || [],
      excludeDocumentIds: options.excludeDocumentIds || [],
      groupByDocument: options.groupByDocument ?? false,
      additionalFilters: options.additionalFilters || {},
    };
  }

  /**
   * valida que el vector de entrada sea válido
   */
  private getDistanceOperator(): string {
    switch (this.config.distanceFunction) {
      case 'cosine':
        return '<->';
      case 'euclidean':
        return '<->';
      case 'inner_product':
        return '<#>';
      default:
        return '<->';
    }
  }

  /**
   * obtiene la dirección de ordenamiento
   */
  private getOrderDirection(): string {
    return this.config.distanceFunction === 'inner_product' ? 'DESC' : 'ASC';
  }

  /**
   * obtiene el operador de umbral
   */
  private getThresholdOperator(): string {
    return this.config.distanceFunction === 'inner_product' ? '>=' : '<=';
  }

  /**
   * construye condiciones where para filtros
   */
  private buildWhereConditions(
    options: Required<VectorSearchOptions>,
  ): string[] {
    const conditions: string[] = [];

    if (options.documentIds && options.documentIds.length > 0) {
      conditions.push(`dc.document_id = ANY($${conditions.length + 2})`);
    }

    if (options.chunkTypes && options.chunkTypes.length > 0) {
      conditions.push(`dc.type = ANY($${conditions.length + 2})`);
    }

    if (options.excludeChunkIds && options.excludeChunkIds.length > 0) {
      conditions.push(`dc.id NOT IN ($${conditions.length + 2})`);
    }

    if (options.excludeDocumentIds && options.excludeDocumentIds.length > 0) {
      conditions.push(`dc.document_id NOT IN ($${conditions.length + 2})`);
    }

    // Asegurar que tiene embedding
    conditions.push('dc.embedding IS NOT NULL');

    return conditions;
  }

  /**
   * obtiene el embedding de un chunk específico
   */
  private async getChunkEmbedding(
    chunkId: string,
  ): Promise<{ embedding: number[] } | null> {
    // por ahora simulado - en implementación real:
    // const result = await this.prisma.documentChunk.findUnique({
    //   where: { id: chunkId },
    //   select: { embedding: true }
    // });
    // return result?.embedding ? { embedding: JSON.parse(result.embedding) } : null;

    console.log('🔍 Obteniendo embedding para chunk:', chunkId);
    return null; // Simular por ahora
  }

  /**
   * calcula el embedding promedio de un documento
   */
  private async getDocumentAverageEmbedding(
    documentId: string,
  ): Promise<number[] | null> {
    // implementación real pendiente
    console.log('🔍 Calculando embedding promedio para documento:', documentId);
    return null; // Simular por ahora
  }

  /**
   * simula resultados de búsqueda vectorial para desarrollo
   */
  private async simulateVectorSearch(
    queryVector: number[],
    options: Required<VectorSearchOptions>,
  ): Promise<any[]> {
    // simulación para desarrollo - reemplazar con consulta real
    return [];
  }

  /**
   * maneja errores de búsqueda
   */
  private handleSearchError(error: unknown, operation: string): Error {
    if (error instanceof Error) {
      return new Error(`Error en ${operation}: ${error.message}`);
    }
    return new Error(`Error desconocido en ${operation}`);
  }
}
