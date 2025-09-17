import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  DocumentIndexGeneratorPort,
  IndexGenerationConfig,
} from '../../domain/ports/document-index-generator.port';
import {
  DocumentIndex,
  IndexChapter,
  IndexSubtopic,
  Exercise,
  ExerciseType,
  ExerciseDifficulty,
  IndexStatus,
} from '../../domain/entities/document-index.entity';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';

@Injectable()
export class GeminiIndexGeneratorAdapter implements DocumentIndexGeneratorPort {
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiIndexGeneratorAdapter.name);
  private readonly defaultConfig: IndexGenerationConfig = {
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 8192,
    language: 'es',
    detailLevel: 'intermediate',
    exerciseTypes: [
      'CONCEPTUAL',
      'PRACTICAL',
      'ANALYSIS',
      'APPLICATION',
      'PROBLEM_SOLVING',
    ],
  };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getMaxOutputTokens(): number {
    return this.configService.get<number>('GEMINI_MAX_OUTPUT_TOKENS') || 256;
  }

  async generateDocumentIndex(
    documentId: string,
    documentTitle: string,
    chunks: DocumentChunk[],
    config?: Partial<IndexGenerationConfig>,
  ): Promise<DocumentIndex> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };

      this.logger.log(`Generating index for document: ${documentTitle}`);
      this.logger.log(`Processing all ${chunks.length} chunks in batches`);

      // for large documents
      const totalContentSize = chunks.reduce(
        (total, chunk) => total + chunk.content.length,
        0,
      );
      const isLargeDocument = totalContentSize > 50000 || chunks.length > 50;

      if (isLargeDocument) {
        this.logger.warn(
          `Large document detected (${totalContentSize} chars, ${chunks.length} chunks). Using ultra-conservative processing.`,
        );
      }

      // ULTRA conservative batch processing for quota limits
      let batchSize = isLargeDocument ? 3 : 5; // Start with very small batches
      const maxChaptersPerBatch = 1;
      const allChapters: IndexChapter[] = [];

      // Sort chunks by index first
      const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

      // Check if we have too many chunks for free tier (50 requests/day)
      const estimatedBatches = Math.ceil(sortedChunks.length / batchSize);
      if (estimatedBatches > 40) {
        this.logger.warn(
          `Document requires ${estimatedBatches} batches, reducing to minimal processing to stay within quota`,
        );
        batchSize = Math.ceil(sortedChunks.length / 35); // Limit to 35 requests max
      }

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
            finalConfig,
            maxChaptersPerBatch,
          );

          allChapters.push(...batchChapters);

          // Much longer pause between batches to prevent API quota issues
          const delayTime = isLargeDocument ? 20000 : 15000; // Very long delays for quota
          if (i + batchSize < sortedChunks.length) {
            this.logger.log(
              `Waiting ${delayTime / 1000}s before next batch to respect rate limits...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayTime));
          }
        } catch (batchError) {
          this.logger.warn(
            `Error in batch ${batchNumber}:`,
            batchError instanceof Error
              ? batchError.message
              : String(batchError),
          );

          // Check if it's a quota/rate limit error
          const errorMessage =
            batchError instanceof Error
              ? batchError.message
              : String(batchError);
          const isQuotaError =
            errorMessage.includes('quota') ||
            errorMessage.includes('Too Many Requests') ||
            errorMessage.includes('429');

          if (isQuotaError) {
            this.logger.error(
              `QUOTA EXCEEDED: Gemini API quota reached. Switching to fallback mode for remaining batches.`,
            );

            // Generate fallback chapters for this batch and all remaining batches
            const fallbackChapters = this.generateFallbackChaptersForBatch(
              batch,
              batchNumber,
            );
            allChapters.push(...fallbackChapters);

            // Generate fallback for all remaining batches
            for (
              let j = i + batchSize;
              j < sortedChunks.length;
              j += batchSize
            ) {
              const remainingBatch = sortedChunks.slice(j, j + batchSize);
              const remainingBatchNumber = Math.floor(j / batchSize) + 1;
              const remainingFallback = this.generateFallbackChaptersForBatch(
                remainingBatch,
                remainingBatchNumber,
              );
              allChapters.push(...remainingFallback);
            }

            this.logger.warn(
              `Generated fallback content for ${Math.ceil((sortedChunks.length - i) / batchSize)} remaining batches due to quota limits.`,
            );
            break; // Exit the loop since we've handled all remaining batches
          } else {
            // Generate basic chapters for this batch only
            const fallbackChapters = this.generateFallbackChaptersForBatch(
              batch,
              batchNumber,
            );
            allChapters.push(...fallbackChapters);
          }
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
      this.logger.error('Error generating index with Gemini:', error);

      // Fallback: generate basic index without AI
      return this.generateFallbackIndex(documentId, documentTitle, chunks);
    }
  }

  /**
   * Process a batch of chunks with Gemini AI
   */
  private async processBatch(
    batch: DocumentChunk[],
    documentTitle: string,
    batchNumber: number,
    totalBatches: number,
    config: IndexGenerationConfig,
    maxChaptersPerBatch: number = 2,
  ): Promise<IndexChapter[]> {
    const model = this.genAI.getGenerativeModel({
      model: config.model!,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: this.getMaxOutputTokens(), // Made configurable via GEMINI_MAX_OUTPUT_TOKENS env var
      },
    });

    // Combine batch chunks into text
    const batchText = batch.map((chunk) => chunk.content).join('\n\n');

    const prompt = this.buildBatchPrompt(
      documentTitle,
      batchText,
      batchNumber,
      totalBatches,
      config,
      maxChaptersPerBatch,
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
          const batchData = this.parseGeminiResponse(validJson);
          const chapters =
            batchData.chapters?.map((chapter: any) =>
              this.mapChapter(chapter),
            ) || [];
          return chapters;
        }
      }

      // Parse batch JSON response
      const batchData = this.parseGeminiResponse(text);
      const chapters =
        batchData.chapters?.map((chapter: any) => this.mapChapter(chapter)) ||
        [];

      return chapters;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check for quota/rate limit errors and provide specific error details
      if (
        errorMessage.includes('quota') ||
        errorMessage.includes('Too Many Requests') ||
        errorMessage.includes('429')
      ) {
        this.logger.error(
          `QUOTA ERROR in batch ${batchNumber}: Gemini API quota exceeded`,
        );
        throw error; // Re-throw quota errors to be handled by the main loop
      }

      this.logger.error(`General error in batch ${batchNumber}:`, errorMessage);
      // Return empty array for non-quota errors
      return [];
    }
  }

  /**
   * Generate basic chapters for a batch when AI fails
   */
  private generateFallbackChaptersForBatch(
    batch: DocumentChunk[],
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
          ? `Batch ${batchNumber} - Section ${chapterNumber}: ${words.join(', ')}`
          : `Batch ${batchNumber} - Section ${chapterNumber}`;

      // Create basic subtopics with exercises
      const subtopics: IndexSubtopic[] = chapterChunks
        .slice(0, 3)
        .map((chunk, idx) => {
          const content: string = chunk.content || '';
          const firstWords: string = content.split(' ').slice(0, 4).join(' ');

          // Create basic exercise for the subtopic
          const exercise = new Exercise(
            ExerciseType.CONCEPTUAL,
            `Analyze: ${firstWords || 'Content'}`,
            `Explain the main concepts presented in this section.`,
            ExerciseDifficulty.INTERMEDIATE,
            '15 minutes',
            words.slice(0, 2),
          );

          return new IndexSubtopic(
            `${batchNumber}.${chapterNumber}.${idx + 1} ${firstWords || 'Content'}`,
            'Automatically generated section',
            [exercise],
          );
        });

      // Create exercise for the chapter
      const chapterExercise = new Exercise(
        ExerciseType.ANALYSIS,
        `Analysis of Batch ${batchNumber} - Section ${chapterNumber}`,
        `Perform a comprehensive analysis of the topics covered in this section.`,
        ExerciseDifficulty.INTERMEDIATE,
        '30 minutes',
        words,
      );

      chapters.push(
        new IndexChapter(
          chapterTitle,
          'Automatically generated chapter',
          subtopics,
          [chapterExercise],
        ),
      );
    }

    return chapters;
  }

  /**
   * Generate a basic index when AI is not available
   */
  private generateFallbackIndex(
    documentId: string,
    documentTitle: string,
    chunks: DocumentChunk[],
  ): DocumentIndex {
    this.logger.log('Generating fallback index without AI');

    // Create basic chapters based on content
    const chapters: IndexChapter[] = [];
    const chunkGroups = Math.ceil(chunks.length / 10); // Group every 10 chunks

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
          ? `Section ${i + 1}: ${words.join(', ')}`
          : `Section ${i + 1}`;

      // Create basic subtopics with exercises
      const subtopics: IndexSubtopic[] = groupChunks
        .slice(0, 3)
        .map((chunk, idx) => {
          const content: string = chunk.content || '';
          const firstWords: string = content.split(' ').slice(0, 4).join(' ');

          // Create basic exercise
          const exercise = new Exercise(
            ExerciseType.CONCEPTUAL,
            `Review: ${firstWords || 'Content'}`,
            `Review and explain the key concepts of this section.`,
            ExerciseDifficulty.BASIC,
            '10 minutes',
            words.slice(0, 2),
          );

          return new IndexSubtopic(
            `${i + 1}.${idx + 1} ${firstWords || 'Content'}`,
            'Automatically generated subtopic',
            [exercise],
          );
        });

      // Create exercise for the chapter
      const chapterExercise = new Exercise(
        ExerciseType.APPLICATION,
        `Practical application - ${chapterTitle}`,
        `Apply the concepts learned in this section to a practical case.`,
        ExerciseDifficulty.INTERMEDIATE,
        '25 minutes',
        words,
      );

      chapters.push(
        new IndexChapter(
          chapterTitle,
          'Automatically generated chapter',
          subtopics,
          [chapterExercise],
        ),
      );
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
    config: IndexGenerationConfig,
    maxChaptersPerBatch: number = 2,
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
5. JSON máximo 12 líneas TOTAL
6. SI el documento es grande, crear índice MUY básico
7. NUNCA exceder 12 líneas de JSON

Responde SOLO con este JSON compacto:
{
  "title": "Breve",
  "chapters": [
    {
      "title": "Cap1",
      "description": "",
      "subtopics": [
        {"title": "Sub1", "description": "", "exercises": []}
      ],
      "exercises": []
    }
  ]
}
`;
  }

  private buildPrompt(
    documentTitle: string,
    fullText: string,
    config: IndexGenerationConfig,
  ): string {
    return `
Eres un experto en análisis de documentos académicos y generación de contenido educativo. 

TAREA: Analiza el siguiente documento y genera un índice estructurado con ejercicios educativos.

DOCUMENTO: "${documentTitle}"

CONTENIDO:
${fullText}

INSTRUCCIONES:
1. Analiza todo el contenido del documento
2. Identifica los temas principales y subtemas
3. Para cada tema, crea ejercicios educativos relevantes
4. Los ejercicios NO deben ser de opción múltiple
5. Incluye diferentes tipos: conceptuales, prácticos, de análisis, aplicación, resolución de problemas
6. Asigna dificultad: BASIC, INTERMEDIATE, ADVANCED
7. Estima tiempo de resolución cuando sea apropiado

FORMATO DE RESPUESTA (JSON estricto):
{
  "title": "Título del documento",
  "chapters": [
    {
      "title": "Nombre del capítulo",
      "description": "Descripción breve del capítulo",
      "subtopics": [
        {
          "title": "Nombre del subtema",
          "description": "Descripción del subtema",
          "exercises": [
            {
              "type": "CONCEPTUAL|PRACTICAL|ANALYSIS|APPLICATION|PROBLEM_SOLVING",
              "title": "Título del ejercicio",
              "description": "Descripción detallada del ejercicio o problema a resolver",
              "difficulty": "BASIC|INTERMEDIATE|ADVANCED",
              "estimatedTime": "15 minutos",
              "keywords": ["palabra1", "palabra2"]
            }
          ]
        }
      ],
      "exercises": [
        {
          "type": "CONCEPTUAL|PRACTICAL|ANALYSIS|APPLICATION|PROBLEM_SOLVING",
          "title": "Título del ejercicio",
          "description": "Descripción detallada del ejercicio",
          "difficulty": "BASIC|INTERMEDIATE|ADVANCED",
          "estimatedTime": "30 minutos",
          "keywords": ["palabra1", "palabra2"]
        }
      ]
    }
  ]
}

IMPORTANTE: 
- Responde ÚNICAMENTE con el JSON válido
- No incluyas texto adicional antes o después del JSON
- Asegúrate de que el JSON sea válido y parseable
- Incluye al menos 2-3 ejercicios por tema principal
- Los ejercicios deben ser específicos y aplicables al contenido
`;
  }

  private parseGeminiResponse(response: string): any {
    try {
      // Clean the response of possible extra characters
      let cleanResponse = response.trim();

      // Remove markdown code blocks if they exist
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '');
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.replace(/\s*```$/, '');
      }

      // Remove other types of markdown
      cleanResponse = cleanResponse
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');

      // Find the JSON in the response
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No valid JSON found in response');
      }

      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);

      // Try to fix common JSON errors
      cleanResponse = this.fixCommonJsonErrors(cleanResponse);

      return JSON.parse(cleanResponse);
    } catch (error) {
      this.logger.error('Error parsing Gemini response:', error);
      this.logger.error(
        'Response received:',
        response.substring(0, 1000) + '...',
      );
      throw new Error('Gemini response is not valid JSON');
    }
  }

  /**
   * Fix common errors in JSON generated by Gemini
   */
  private fixCommonJsonErrors(jsonString: string): string {
    let fixed = jsonString;

    // Remove HTML tags that break JSON
    fixed = fixed.replace(/<[^>]*>/g, '');

    // Fix missing commas between array objects
    fixed = fixed.replace(/}\s*\n\s*{/g, '},\n  {');

    // Fix malformed arrays
    fixed = fixed.replace(/]\s*,\s*{/g, '],\n  {');

    // Ensure arrays are properly closed
    fixed = fixed.replace(/}\s*\n\s*]/g, '}\n  ]');

    // Fix properties without quotes
    fixed = fixed.replace(/(\w+):/g, '"$1":');

    // Fix single quotes to double quotes
    fixed = fixed.replace(/'/g, '"');

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    return fixed;
  }

  private mapChapter(chapterData: any): IndexChapter {
    const subtopics = (chapterData.subtopics || []).map((subtopic: any) =>
      this.mapSubtopic(subtopic),
    );

    const exercises = (chapterData.exercises || []).map((exercise: any) =>
      this.mapExercise(exercise),
    );

    return new IndexChapter(
      chapterData.title,
      chapterData.description,
      subtopics,
      exercises,
    );
  }

  private mapSubtopic(subtopicData: any): IndexSubtopic {
    const exercises = (subtopicData.exercises || []).map((exercise: any) =>
      this.mapExercise(exercise),
    );

    return new IndexSubtopic(
      subtopicData.title,
      subtopicData.description,
      exercises,
    );
  }

  private mapExercise(exerciseData: any): Exercise {
    return new Exercise(
      this.mapExerciseType(exerciseData.type),
      exerciseData.title,
      exerciseData.description,
      this.mapExerciseDifficulty(exerciseData.difficulty),
      exerciseData.estimatedTime,
      exerciseData.keywords || [],
    );
  }

  private mapExerciseType(type: string): ExerciseType {
    switch (type?.toUpperCase()) {
      case 'CONCEPTUAL':
        return ExerciseType.CONCEPTUAL;
      case 'PRACTICAL':
        return ExerciseType.PRACTICAL;
      case 'ANALYSIS':
        return ExerciseType.ANALYSIS;
      case 'SYNTHESIS':
        return ExerciseType.SYNTHESIS;
      case 'APPLICATION':
        return ExerciseType.APPLICATION;
      case 'PROBLEM_SOLVING':
        return ExerciseType.PROBLEM_SOLVING;
      default:
        return ExerciseType.CONCEPTUAL;
    }
  }

  private mapExerciseDifficulty(difficulty: string): ExerciseDifficulty {
    switch (difficulty?.toUpperCase()) {
      case 'BASIC':
        return ExerciseDifficulty.BASIC;
      case 'INTERMEDIATE':
        return ExerciseDifficulty.INTERMEDIATE;
      case 'ADVANCED':
        return ExerciseDifficulty.ADVANCED;
      default:
        return ExerciseDifficulty.INTERMEDIATE;
    }
  }

  /**
   * Limit the content of the chapters to optimize the size of the JSON file.
   */
  private limitChapterContent(
    chapters: IndexChapter[],
    maxChapters: number,
  ): IndexChapter[] {
    // Limit the number of chapters more strictly
    const limitedChapters = chapters.slice(0, maxChapters);

    return limitedChapters.map((chapter) => {
      // Limit subtopics to a maximum of 1 for optimization
      const limitedSubtopics = chapter.subtopics
        .slice(0, 1)
        .map((subtopic) => ({
          ...subtopic,
          // No exercises for optimization
          exercises: [],
        }));

      // No chapter exercises for optimization
      const limitedChapterExercises: Exercise[] = [];

      return new IndexChapter(
        chapter.title.length > 40
          ? chapter.title.substring(0, 37) + '...'
          : chapter.title,
        '', // Empty description for optimization
        limitedSubtopics,
        limitedChapterExercises,
      );
    });
  }

  private generateId(): string {
    return `idx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
