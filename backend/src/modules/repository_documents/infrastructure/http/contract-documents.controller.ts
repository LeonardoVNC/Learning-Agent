import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContextualLoggerService } from '../services/contextual-logger.service';
import { GetDocumentsBySubjectUseCase } from '../../application/queries/get-documents-by-subject.usecase';
import { GetDocumentContentUseCase } from '../../application/queries/get-document-content.usecase';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import type { DocumentChunkRepositoryPort } from '../../domain/ports/document-chunk-repository.port';
import {
  DOCUMENT_REPOSITORY_PORT,
  DOCUMENT_CHUNK_REPOSITORY_PORT,
} from '../../tokens';
import {
  ContractDocumentListResponseDto,
  ContractDocumentItemDto,
  DocumentContentResponseDto,
  DocumentContentMetadataDto,
  GetDocumentsBySubjectQueryDto,
} from './dtos/contract-documents.dto';
import {
  DocumentIndex,
  IndexChapter,
  IndexSubtopic,
  IndexStatus,
} from '../../domain/entities/document-index.entity';

/**
 * Controller for contract endpoints with the student module
 * Base URL: /api/v1/documents
 */
@Controller('api/v1/documents')
@UseGuards(AuthGuard('jwt'))
export class ContractDocumentsController {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly getDocumentsBySubjectUseCase: GetDocumentsBySubjectUseCase,
    private readonly getDocumentContentUseCase: GetDocumentContentUseCase,
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepository: DocumentRepositoryPort,
    @Inject(DOCUMENT_CHUNK_REPOSITORY_PORT)
    private readonly chunkRepository: DocumentChunkRepositoryPort,
    private readonly configService: ConfigService,
    private readonly logger: ContextualLoggerService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getMaxOutputTokens(): number {
    return this.configService.get<number>('GEMINI_MAX_OUTPUT_TOKENS') || 512;
  }

  @Get('subject/:subjectId/documents')
  async getDocumentsBySubject(
    @Param('subjectId') subjectId: string,
    @Query() query: GetDocumentsBySubjectQueryDto,
  ): Promise<ContractDocumentListResponseDto> {
    try {
      this.logger.logDocumentOperation('list', undefined, {
        subjectId,
        query,
      });

      if (!subjectId || !subjectId.trim()) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'ID de materia es requerido',
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.getDocumentsBySubjectUseCase.execute({
        subjectId: subjectId.trim(),
        tipo: query.tipo,
        page: query.page || 1,
        limit: query.limit || 10,
      });

      // Map the domain response to contract DTOs
      const documentos = result.docs.map(
        (doc) =>
          new ContractDocumentItemDto(
            doc.id,
            doc.originalName, // title
            this.extractFileType(doc.mimeType), // type
            doc.downloadUrl, // url
            doc.uploadedAt, // UploadDate
            doc.uploadedBy, // professorId
          ),
      );

      this.logger.log('Documents retrieved successfully for subject', {
        subjectId,
        totalDocuments: result.total,
        documentsReturned: documentos.length,
        page: result.page,
      });

      return new ContractDocumentListResponseDto(
        documentos,
        result.total,
        result.page,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Error retrieving documents by subject',
        error instanceof Error ? error : errorMessage,
        {
          subjectId,
          errorType: 'DOCUMENTS_BY_SUBJECT_ERROR',
        },
      );

      // handle different types of errors
      if (errorMessage.includes('no encontrado')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Materia no encontrada',
            error: 'Not Found',
            details: errorMessage,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('Servicio de almacenamiento')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Servicio de almacenamiento no disponible',
            error: 'Service Unavailable',
            details: errorMessage,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Generic error
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al obtener documentos',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /documents/{docId}/content
   * Obtain the extracted content of a specific document.
   */
  @Get(':docId/content')
  async getDocumentContent(
    @Param('docId') docId: string,
  ): Promise<DocumentContentResponseDto> {
    try {
      this.logger.logDocumentOperation('download', docId);

      if (!docId || !docId.trim()) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'ID de documento es requerido',
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 1. Removed basicResult as it's no longer needed

      // 2. Verificar que el documento existe
      const document = await this.documentRepository.findById(docId.trim());
      if (!document) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Documento no encontrado',
            error: 'Not Found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // 3. Obtener todos los chunks del documento (sin límite)
      const chunksResult = await this.chunkRepository.findByDocumentId(
        docId.trim(),
        { limit: 10000 }, // Límite alto para documentos grandes
      );
      if (
        !chunksResult ||
        !chunksResult.chunks ||
        chunksResult.chunks.length === 0
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'No se encontraron chunks para el documento',
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const chunks = chunksResult.chunks;
      this.logger.log(`Se encontraron ${chunks.length} chunks para procesar`);

      // 4. Generar el índice usando Gemini
      const documentIndex = await this.generateDocumentIndex(
        docId.trim(),
        document.documentTitle || document.originalName,
        chunks,
      );

      // 5. Formatear el índice como string numerado
      const formattedIndex = this.formatIndexAsString(documentIndex);

      // 6. Generar resumen a partir de los chunks
      const summary = this.generateSummaryFromChunks(chunks);

      // 7. Obtener número de páginas del documento
      const pageCount = document.pageCount || Math.ceil(chunks.length / 2) || 1;

      return new DocumentContentResponseDto(
        formattedIndex,
        new DocumentContentMetadataDto(pageCount, summary),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Error generating document index',
        error instanceof Error ? error : errorMessage,
        {
          docId,
          errorType: 'DOCUMENT_INDEX_ERROR',
        },
      );

      // Handle different types of errors
      if (errorMessage.includes('no encontrado')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Documento no encontrado',
            error: 'Not Found',
            details: errorMessage,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('chunks')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'El documento no tiene contenido procesado',
            error: 'Bad Request',
            details: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generic error
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al generar índice',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate the document index using Gemini AI with a fallback option
   */
  private async generateDocumentIndex(
    documentId: string,
    documentTitle: string,
    chunks: any[],
  ): Promise<DocumentIndex> {
    try {
  this.logger.log(`Generating index for document: ${documentTitle}`);
  this.logger.log(`Processing all ${chunks.length} chunks in batches`);

      // Process all chunks in small batches
      const batchSize = 50; // Batch size to avoid token limits
      const allChapters: IndexChapter[] = [];

      // Sort chunks by index
      const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

      // Process in batches
      for (let i = 0; i < sortedChunks.length; i += batchSize) {
        const batch = sortedChunks.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(sortedChunks.length / batchSize);

        this.logger.log(
          `Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`,
        );

        try {
          const batchChapters = await this.processBatch(
            batch,
            documentTitle,
            batchNumber,
            totalBatches,
          );

          allChapters.push(...batchChapters);

          // Short pause between batches to avoid rate limits
          if (i + batchSize < sortedChunks.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (batchError) {
          this.logger.warn(`Error in batch ${batchNumber}, using fallback:`, {
            error:
              batchError instanceof Error
                ? batchError.message
                : String(batchError),
            batchNumber,
          });

          // Generate basic chapters for this batch
          const fallbackChapters = this.generateFallbackChaptersForBatch(
            batch,
            batchNumber,
          );
          allChapters.push(...fallbackChapters);
        }
      }

      // Create the final index
      const documentIndex = new DocumentIndex(
        this.generateId(),
        documentId,
        documentTitle,
        allChapters,
        new Date(),
        IndexStatus.GENERATED,
      );

      this.logger.log(
        `Index generated with ${documentIndex.chapters.length} chapters from ${chunks.length} chunks`,
      );

      return documentIndex;
    } catch (error) {
      this.logger.error(
        'Error generating index with Gemini:',
        error instanceof Error ? error : String(error),
      );

      // Fallback: generar índice básico sin AI
      return this.generateFallbackIndex(documentId, documentTitle, chunks);
    }
  }

  /**
   * Procesa un lote de chunks con Gemini AI
   */
  private async processBatch(
    batch: any[],
    documentTitle: string,
    batchNumber: number,
    totalBatches: number,
  ): Promise<IndexChapter[]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: this.getMaxOutputTokens(), // Made configurable via GEMINI_MAX_OUTPUT_TOKENS env var
      },
    });

    // Combinar chunks del lote en texto
    const batchText = batch.map((chunk) => chunk.content).join('\n\n');

    const prompt = this.buildBatchPrompt(
      documentTitle,
      batchText,
      batchNumber,
      totalBatches,
    );

    // explicit timeout
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Timeout: El modelo tomó demasiado tiempo')),
        45000,
      ),
    );

    const generation = model.generateContent(prompt);
    
    try {
      const result = await Promise.race([generation, timeout]);
      const response = result.response;
      const text = response.text();

      // Validate response is not too long
      if (text.length > 25000) {
        this.logger.warn(
          `Response too long (${text.length} chars), truncating...`,
        );
        const truncatedText = text.substring(0, 25000);
        // Ensure valid JSON ending
        const lastBrace = truncatedText.lastIndexOf('}');
        if (lastBrace > 0) {
          const validJson = truncatedText.substring(0, lastBrace + 1);
          const batchData: any = this.parseGeminiResponse(validJson);
          return (
            batchData.chapters?.map((chapter: any) => this.mapChapter(chapter)) || []
          );
        }
      }

      // Parse batch JSON response
      const batchData: any = this.parseGeminiResponse(text);
      return (
        batchData.chapters?.map((chapter: any) => this.mapChapter(chapter)) || []
      );
    } catch (error) {
      this.logger.error(
        'Error in contract generation:',
        error instanceof Error ? error : String(error),
      );
      // Return empty array on error
      return [];
    }
  }

  /**
   * Generates basic chapters for a batch when the AI ​​fails.
   */
  private generateFallbackChaptersForBatch(
    batch: any[],
    batchNumber: number,
  ): IndexChapter[] {
    const chapters: IndexChapter[] = [];
    const chunksPerChapter = 10;

    for (let i = 0; i < batch.length; i += chunksPerChapter) {
      const chapterChunks = batch.slice(i, i + chunksPerChapter);
      const chapterNumber = Math.floor(i / chunksPerChapter) + 1;

      // Extract keywords from the first chunk
      const firstChunkContent: string = chapterChunks[0]?.content || '';
      const words: string[] = firstChunkContent
        .split(' ')
        .filter((w) => w.length > 5)
        .slice(0, 3);

      const chapterTitle: string =
        words.length > 0
          ? `Lote ${batchNumber} - Sección ${chapterNumber}: ${words.join(', ')}`
          : `Lote ${batchNumber} - Sección ${chapterNumber}`;

      // Create basic subtopics
      const subtopics: IndexSubtopic[] = chapterChunks
        .slice(0, 3)
        .map((chunk, idx) => {
          const content: string = chunk.content || '';
          const firstWords: string = content.split(' ').slice(0, 4).join(' ');
          return new IndexSubtopic(
            `${batchNumber}.${chapterNumber}.${idx + 1} ${firstWords || 'Contenido'}`,
            '',
            [],
          );
        });

      chapters.push(new IndexChapter(chapterTitle, '', subtopics, []));
    }

    return chapters;
  }

  /**
   * Generates a basic index when AI is not available
   */
  private generateFallbackIndex(
    documentId: string,
    documentTitle: string,
    chunks: any[],
  ): DocumentIndex {
  this.logger.log('Generating fallback index without AI');

    // Create basic chapters based on the content
    const chapters: IndexChapter[] = [];
    const chunkGroups = Math.ceil(chunks.length / 10);

    for (let i = 0; i < chunkGroups; i++) {
      const startChunk = i * 10;
      const endChunk = Math.min((i + 1) * 10, chunks.length);
      const groupChunks = chunks.slice(startChunk, endChunk);

      // Extract keywords from the first chunk of the group
      const firstChunkContent: string = groupChunks[0]?.content || '';
      const words: string[] = firstChunkContent
        .split(' ')
        .filter((w) => w.length > 5)
        .slice(0, 3);
      const chapterTitle: string =
        words.length > 0
          ? `Sección ${i + 1}: ${words.join(', ')}`
          : `Sección ${i + 1}`;

      // Create basic subtopics
      const subtopics: IndexSubtopic[] = groupChunks
        .slice(0, 3)
        .map((chunk, idx) => {
          const content: string = chunk.content || '';
          const firstWords: string = content.split(' ').slice(0, 4).join(' ');
          return new IndexSubtopic(
            `${i + 1}.${idx + 1} ${firstWords || 'Contenido'}`,
            '',
            [],
          );
        });

      chapters.push(new IndexChapter(chapterTitle, '', subtopics, []));
    }

    return new DocumentIndex(
      this.generateId(),
      documentId,
      documentTitle,
      chapters,
      new Date(),
      IndexStatus.GENERATED,
    );
  }

  /**
   * Create the prompt for a specific batch
   */
  private buildBatchPrompt(
    documentTitle: string,
    batchText: string,
    batchNumber: number,
    totalBatches: number,
  ): string {
    return `
Analiza el contenido y genera UN ÍNDICE MUY SIMPLE.

DOCUMENTO: "${documentTitle}"
LOTE: ${batchNumber} de ${totalBatches}

CONTENIDO:
${batchText}

REGLAS ESTRICTAS:
1. MÁXIMO 1 capítulo por lote
2. MÁXIMO 1 subtema por capítulo
3. Títulos MUY breves (máximo 20 caracteres)
4. SIN descripciones largas
5. JSON máximo 10 líneas TOTAL
6. SI el documento es grande, crear índice MUY básico
7. NUNCA exceder 10 líneas de JSON

Responde SOLO con este JSON compacto:
{
  "title": "Breve",
  "chapters": [
    {
      "title": "Cap1",
      "description": "",
      "subtopics": [
        {"title": "Sub1", "description": ""}
      ]
    }
  ]
}
`;
  }

  /**
   * create the prompt for Gemini
   */
  private buildPrompt(documentTitle: string, fullText: string): string {
    return `
DOCUMENTO: "${documentTitle}"

CONTENIDO:
${fullText}

REGLAS ESTRICTAS:
1. MÁXIMO 2 capítulos total
2. MÁXIMO 1 subtema por capítulo
3. Títulos MUY breves (máximo 15 caracteres)
4. SIN descripciones largas
5. JSON máximo 15 líneas TOTAL
6. Para documentos grandes: crear índice MUY básico
7. NUNCA exceder 15 líneas de JSON

Responde SOLO con este JSON compacto:
{
  "title": "Breve",
  "chapters": [
    {
      "title": "Cap1",
      "description": "",
      "subtopics": [
        {"title": "Sub1", "description": ""}
      ]
    },
    {
      "title": "Cap2", 
      "description": "",
      "subtopics": [
        {"title": "Sub2", "description": ""}
      ]
    }
  ]
}
`;
  }

  /**
   * Parse Gemini's response
   */
  private parseGeminiResponse(response: string): any {
    try {
      // Clean the response of any extra characters.
      let cleanResponse = response.trim();

      // Find the JSON in the response
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }

      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);

      return JSON.parse(cleanResponse);
    } catch (error) {
  this.logger.error('Error parsing Gemini response:', error instanceof Error ? error.message : String(error));
  this.logger.error('Response received:', response);
      throw new Error('La respuesta de Gemini no es un JSON válido');
    }
  }

  /**
   * Map a chapter based on Gemini's response
   */
  private mapChapter(chapterData: any): IndexChapter {
    const subtopics = (chapterData.subtopics || []).map((subtopic: any) =>
      this.mapSubtopic(subtopic),
    );

    return new IndexChapter(chapterData.title, '', subtopics, []);
  }

  /**
   * Map a subtopic from Gemini's response
   */
  private mapSubtopic(subtopicData: any): IndexSubtopic {
    return new IndexSubtopic(
      subtopicData.title || 'Contenido específico',
      '',
      [],
    );
  }

  /**
   * Generate a short summary based on the document chunks
   */
  private generateSummaryFromChunks(chunks: any[]): string {
    try {
      // Take the first few sections for the summary (maximum 3)
      const firstChunks = chunks.slice(0, 3);
      const combinedContent = firstChunks
        .map((chunk) => (chunk.content || chunk.text || '') as string)
        .join(' ')
        .substring(0, 1000); // Limit to 1000 characters

      if (!combinedContent.trim()) {
        return 'Documento técnico especializado';
      }

      // Create a more complete summary based on the content
      const sentences = combinedContent
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 20);
      const words = combinedContent
        .split(' ')
        .filter((word) => word.length > 4);

      // Try to create a summary using the first 2-3 sentences.
      if (sentences.length >= 2) {
        const summary = sentences.slice(0, 2).join('. ').trim();
        if (summary.length > 50 && summary.length < 300) {
          return summary + (summary.endsWith('.') ? '' : '.');
        }
      }

      // Fallback: use the first sentence if it is descriptive
      if (sentences.length >= 1) {
        const firstSentence = sentences[0].trim();
        if (firstSentence.length > 30 && firstSentence.length < 200) {
          return firstSentence + (firstSentence.endsWith('.') ? '' : '.');
        }
      }

      // Last fallback option using keywords
      const keyWords = words.slice(0, 3).join(', ');
      return `Documento técnico especializado que aborda temas relacionados con ${keyWords || 'metodologías avanzadas'}.`;
    } catch (error) {
      this.logger.warn('Error generating summary from chunks', {
        error: String(error),
      });
      return 'Documento técnico especializado';
    }
  }

  /**
   * Format the index as a numbered string (1.1, 1.2, 2.1, etc.)
   */
  private formatIndexAsString(documentIndex: DocumentIndex): string {
    let result = `ÍNDICE DEL DOCUMENTO: ${documentIndex.title}\n\n`;

    documentIndex.chapters.forEach((chapter, chapterIndex) => {
      const chapterNumber = chapterIndex + 1;

      // Chapter title
      result += `${chapterNumber}. ${chapter.title}\n\n`;

      // Subtopics of the chapter
      chapter.subtopics.forEach((subtopic, subtopicIndex) => {
        const subtopicNumber = subtopicIndex + 1;
        result += `${chapterNumber}.${subtopicNumber} ${subtopic.title}\n`;
      });

      result += `\n`;
    });

    return result;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extracts the file type from the mimeType to comply with the contract

   */
  private extractFileType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word')) return 'documento';
    if (mimeType.includes('text')) return 'texto';
    return 'documento';
  }
}
