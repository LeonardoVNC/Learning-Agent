import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AiConfigService } from '../../core/ai/ai.config';
import { IdentityModule } from '../identity/identity.module';
import {
  FILE_STORAGE_REPO,
  DOCUMENT_REPOSITORY_PORT,
  TEXT_EXTRACTION_PORT,
  DOCUMENT_STORAGE_PORT,
  CHUNKING_STRATEGY_PORT,
  DOCUMENT_CHUNK_REPOSITORY_PORT,
  EMBEDDING_GENERATOR_PORT,
  VECTOR_SEARCH_PORT,
  DELETED_DOCUMENT_REPOSITORY_PORT,
  DOCUMENT_INDEX_GENERATOR_PORT,
  DOCUMENT_INDEX_REPOSITORY_PORT,
} from './tokens';

// Domain ports
import { EmbeddingGeneratorPort } from './domain/ports/embedding-generator.port';
import { VectorSearchPort } from './domain/ports/vector-search.port';
import { DocumentChunkRepositoryPort } from './domain/ports/document-chunk-repository.port';

// Controllers
import { DocumentsController } from './infrastructure/http/documents.controller';
import { EmbeddingsController } from './infrastructure/http/embeddings.controller';
import { ContractDocumentsController } from './infrastructure/http/contract-documents.controller';

// Infrastructure adapters
import { S3StorageAdapter } from './infrastructure/storage/S3-storage.adapter';
import { PrismaDocumentRepositoryAdapter } from './infrastructure/persistence/prisma-document-repository.adapter';
import { PdfTextExtractionAdapter } from './infrastructure/text-extraction/pdf-text-extraction.adapter';
import { SemanticTextChunkingAdapter } from './infrastructure/chunking/semantic-text-chunking.adapter';
import { PrismaDocumentChunkRepositoryAdapter } from './infrastructure/persistence/prisma-document-chunk-repository.adapter';
import { PrismaDocumentIndexRepositoryAdapter } from './infrastructure/persistence/prisma-document-index-repository.adapter';
import { OpenAIEmbeddingAdapter } from './infrastructure/ai/openai-embedding.adapter';
import { PgVectorSearchAdapter } from './infrastructure/search/pgvector-search.adapter';
import { PrismaDeletedDocumentRepositoryAdapter } from './infrastructure/persistence/prisma-deleted-document-repository.adapter';
import { GeminiIndexGeneratorAdapter } from './infrastructure/ai/gemini-index-generator.adapter';

// Domain services
import { DocumentChunkingService } from './domain/services/document-chunking.service';
import { DocumentEmbeddingService } from './domain/services/document-embedding.service';

// Contract use cases
import { GetDocumentsBySubjectUseCase } from './application/queries/get-documents-by-subject.usecase';
import { GetDocumentContentUseCase } from './application/queries/get-document-content.usecase';

// Use cases
import { ListDocumentsUseCase } from './application/queries/list-documents.usecase';
import { DeleteDocumentUseCase } from './application/commands/delete-document.usecase';
import { UploadDocumentUseCase } from './application/commands/upload-document.usecase';
import { DownloadDocumentUseCase } from './application/commands/download-document.usecase';
import { ProcessDocumentTextUseCase } from './application/commands/process-document-text.usecase';
import { ProcessDocumentChunksUseCase } from './application/commands/process-document-chunks.usecase';
import { GenerateDocumentEmbeddingsUseCase } from './application/use-cases/generate-document-embeddings.use-case';
import { SearchDocumentsUseCase } from './application/use-cases/search-documents.use-case';
import { CheckDocumentSimilarityUseCase } from './application/use-cases/check-document-similarity.usecase';
import { CheckDeletedDocumentUseCase } from './application/use-cases/check-deleted-document.usecase';
import { GenerateDocumentIndexUseCase } from './application/use-cases/generate-document-index.usecase';
import { GetDocumentIndexUseCase } from './application/use-cases/get-document-index.usecase';
import { NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from './infrastructure/http/middleware/auth.middleware';
import { LoggingMiddleware } from './infrastructure/http/middleware/logging.middleware';
import { ContextualLoggerService } from './infrastructure/services/contextual-logger.service';
@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [
    DocumentsController,
    EmbeddingsController,
    ContractDocumentsController,
  ],
  providers: [
    // servicios de configuración
    AiConfigService,

    // Servicios de logging
    ContextualLoggerService,

    // adaptadores de infraestructura
    { provide: DOCUMENT_STORAGE_PORT, useClass: S3StorageAdapter },
    {
      provide: DOCUMENT_REPOSITORY_PORT,
      useClass: PrismaDocumentRepositoryAdapter,
    },
    { provide: TEXT_EXTRACTION_PORT, useClass: PdfTextExtractionAdapter },
    { provide: CHUNKING_STRATEGY_PORT, useClass: SemanticTextChunkingAdapter },
    {
      provide: DOCUMENT_CHUNK_REPOSITORY_PORT,
      useClass: PrismaDocumentChunkRepositoryAdapter,
    },
    {
      provide: DOCUMENT_INDEX_REPOSITORY_PORT,
      useClass: PrismaDocumentIndexRepositoryAdapter,
    },
    {
      provide: DELETED_DOCUMENT_REPOSITORY_PORT,
      useClass: PrismaDeletedDocumentRepositoryAdapter,
    },

    // nuevos adaptadores para fase 3
    {
      provide: EMBEDDING_GENERATOR_PORT,
      useFactory: (aiConfig: AiConfigService) => {
        return new OpenAIEmbeddingAdapter(aiConfig.getOpenAIConfig());
      },
      inject: [AiConfigService],
    },
    {
      provide: VECTOR_SEARCH_PORT,
      useFactory: (
        prisma: PrismaService,
        embeddingGenerator: EmbeddingGeneratorPort,
      ) => {
        return new PgVectorSearchAdapter(prisma, embeddingGenerator);
      },
      inject: [PrismaService, EMBEDDING_GENERATOR_PORT],
    },

    { provide: FILE_STORAGE_REPO, useClass: S3StorageAdapter },

    // servicios de dominio
    {
      provide: DocumentChunkingService,
      useFactory: (
        chunkingStrategy: SemanticTextChunkingAdapter,
        chunkRepository: PrismaDocumentChunkRepositoryAdapter,
      ) => {
        return new DocumentChunkingService(chunkingStrategy, chunkRepository);
      },
      inject: [CHUNKING_STRATEGY_PORT, DOCUMENT_CHUNK_REPOSITORY_PORT],
    },
    {
      provide: DocumentEmbeddingService,
      useFactory: (
        embeddingGenerator: EmbeddingGeneratorPort,
        vectorSearch: VectorSearchPort,
        chunkRepository: DocumentChunkRepositoryPort,
      ) => {
        return new DocumentEmbeddingService(
          embeddingGenerator,
          vectorSearch,
          chunkRepository,
        );
      },
      inject: [
        EMBEDDING_GENERATOR_PORT,
        VECTOR_SEARCH_PORT,
        DOCUMENT_CHUNK_REPOSITORY_PORT,
      ],
    },

    // casos de uso
    {
      provide: ListDocumentsUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
      ) => {
        return new ListDocumentsUseCase(storageAdapter, documentRepository);
      },
      inject: [DOCUMENT_STORAGE_PORT, DOCUMENT_REPOSITORY_PORT],
    },
    {
      provide: DeleteDocumentUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
        chunkRepository: PrismaDocumentChunkRepositoryAdapter,
      ) => {
        return new DeleteDocumentUseCase(
          storageAdapter,
          documentRepository,
          chunkRepository,
        );
      },
      inject: [
        DOCUMENT_STORAGE_PORT,
        DOCUMENT_REPOSITORY_PORT,
        DOCUMENT_CHUNK_REPOSITORY_PORT,
      ],
    },
    {
      provide: UploadDocumentUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
        chunkingService: DocumentChunkingService,
      ) => {
        return new UploadDocumentUseCase(
          storageAdapter,
          documentRepository,
          chunkingService,
        );
      },
      inject: [
        DOCUMENT_STORAGE_PORT,
        DOCUMENT_REPOSITORY_PORT,
        DocumentChunkingService,
      ],
    },
    {
      provide: DownloadDocumentUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
      ) => {
        return new DownloadDocumentUseCase(storageAdapter, documentRepository);
      },
      inject: [DOCUMENT_STORAGE_PORT, DOCUMENT_REPOSITORY_PORT],
    },
    {
      provide: ProcessDocumentTextUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        textExtraction: PdfTextExtractionAdapter,
        storageAdapter: S3StorageAdapter,
      ) => {
        return new ProcessDocumentTextUseCase(
          documentRepository,
          textExtraction,
          storageAdapter,
        );
      },
      inject: [
        DOCUMENT_REPOSITORY_PORT,
        TEXT_EXTRACTION_PORT,
        DOCUMENT_STORAGE_PORT,
      ],
    },
    {
      provide: ProcessDocumentChunksUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        chunkingService: DocumentChunkingService,
      ) => {
        return new ProcessDocumentChunksUseCase(
          documentRepository,
          chunkingService,
        );
      },
      inject: [DOCUMENT_REPOSITORY_PORT, DocumentChunkingService],
    },
    {
      provide: GenerateDocumentEmbeddingsUseCase,
      useFactory: (embeddingService: DocumentEmbeddingService) => {
        return new GenerateDocumentEmbeddingsUseCase(embeddingService);
      },
      inject: [DocumentEmbeddingService],
    },
    {
      provide: SearchDocumentsUseCase,
      useFactory: (embeddingService: DocumentEmbeddingService) => {
        return new SearchDocumentsUseCase(embeddingService);
      },
      inject: [DocumentEmbeddingService],
    },
    {
      provide: CheckDocumentSimilarityUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        textExtraction: PdfTextExtractionAdapter,
        chunkingStrategy: SemanticTextChunkingAdapter,
        embeddingGenerator: EmbeddingGeneratorPort,
        vectorSearch: VectorSearchPort,
        chunkRepository: PrismaDocumentChunkRepositoryAdapter,
      ) => {
        return new CheckDocumentSimilarityUseCase(
          documentRepository,
          textExtraction,
          chunkingStrategy,
          embeddingGenerator,
          vectorSearch,
          chunkRepository,
        );
      },
      inject: [
        DOCUMENT_REPOSITORY_PORT,
        TEXT_EXTRACTION_PORT,
        CHUNKING_STRATEGY_PORT,
        EMBEDDING_GENERATOR_PORT,
        VECTOR_SEARCH_PORT,
        DOCUMENT_CHUNK_REPOSITORY_PORT,
      ],
    },
    {
      provide: CheckDeletedDocumentUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        deletedDocumentRepository: PrismaDeletedDocumentRepositoryAdapter,
        textExtraction: PdfTextExtractionAdapter,
        documentStorage: S3StorageAdapter,
        chunkRepository: PrismaDocumentChunkRepositoryAdapter,
      ) => {
        return new CheckDeletedDocumentUseCase(
          documentRepository,
          deletedDocumentRepository,
          textExtraction,
          documentStorage,
          chunkRepository,
        );
      },
      inject: [
        DOCUMENT_REPOSITORY_PORT,
        DELETED_DOCUMENT_REPOSITORY_PORT,
        TEXT_EXTRACTION_PORT,
        DOCUMENT_STORAGE_PORT,
        DOCUMENT_CHUNK_REPOSITORY_PORT,
      ],
    },

    // Index generation adapter
    {
      provide: DOCUMENT_INDEX_GENERATOR_PORT,
      useClass: GeminiIndexGeneratorAdapter,
    },

    // Generate document index use case
    {
      provide: GenerateDocumentIndexUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        chunkRepository: PrismaDocumentChunkRepositoryAdapter,
        indexGenerator: GeminiIndexGeneratorAdapter,
        indexRepository: PrismaDocumentIndexRepositoryAdapter,
      ) => {
        return new GenerateDocumentIndexUseCase(
          documentRepository,
          chunkRepository,
          indexGenerator,
          indexRepository,
        );
      },
      inject: [
        DOCUMENT_REPOSITORY_PORT,
        DOCUMENT_CHUNK_REPOSITORY_PORT,
        DOCUMENT_INDEX_GENERATOR_PORT,
        DOCUMENT_INDEX_REPOSITORY_PORT,
      ],
    },

    // Get document index use case
    {
      provide: GetDocumentIndexUseCase,
      useFactory: (indexRepository: PrismaDocumentIndexRepositoryAdapter) => {
        return new GetDocumentIndexUseCase(indexRepository);
      },
      inject: [DOCUMENT_INDEX_REPOSITORY_PORT],
    },
    // Contract use cases
    {
      provide: GetDocumentsBySubjectUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        storageAdapter: S3StorageAdapter,
      ) => {
        return new GetDocumentsBySubjectUseCase(
          documentRepository,
          storageAdapter,
        );
      },
      inject: [DOCUMENT_REPOSITORY_PORT, DOCUMENT_STORAGE_PORT],
    },
    {
      provide: GetDocumentContentUseCase,
      useFactory: (documentRepository: PrismaDocumentRepositoryAdapter) => {
        return new GetDocumentContentUseCase(documentRepository);
      },
      inject: [DOCUMENT_REPOSITORY_PORT],
    },
  ],
  exports: [
    // casos de uso originales
    ListDocumentsUseCase,
    DeleteDocumentUseCase,
    UploadDocumentUseCase,
    DownloadDocumentUseCase,
    ProcessDocumentTextUseCase,
    ProcessDocumentChunksUseCase,

    // Casos de uso para el contrato
    GetDocumentsBySubjectUseCase,
    GetDocumentContentUseCase,

    // nuevos casos de uso para embeddings
    GenerateDocumentEmbeddingsUseCase,
    SearchDocumentsUseCase,
    CheckDocumentSimilarityUseCase,
    CheckDeletedDocumentUseCase,
    GenerateDocumentIndexUseCase,
    GetDocumentIndexUseCase,

    // servicios de dominio
    DocumentChunkingService,
    DocumentEmbeddingService,

    // tokens de puertos (para testing o extensión)
    DOCUMENT_REPOSITORY_PORT,
    TEXT_EXTRACTION_PORT,
    DOCUMENT_STORAGE_PORT,
    CHUNKING_STRATEGY_PORT,
    DOCUMENT_CHUNK_REPOSITORY_PORT,
    EMBEDDING_GENERATOR_PORT,
    VECTOR_SEARCH_PORT,
    DELETED_DOCUMENT_REPOSITORY_PORT,
  ],
})
export class DocumentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer;

    consumer
      .apply(LoggingMiddleware)
      .forRoutes(
        'api/documents',
        'api/repository-documents/embeddings',
        'api/v1/documentos',
      );

    consumer.apply(AuthMiddleware).forRoutes(
      { path: 'api/documents/upload', method: RequestMethod.POST },
      { path: 'api/documents/:id', method: RequestMethod.DELETE },
      { path: 'api/documents/download/:id', method: RequestMethod.GET },
      {
        path: 'api/v1/documentos/materias/*/documentos',
        method: RequestMethod.GET,
      },
      { path: 'api/v1/documentos/*/contenido', method: RequestMethod.GET },
      {
        path: 'api/documents/:documentId/process-text',
        method: RequestMethod.POST,
      },
      {
        path: 'api/documents/:documentId/process-chunks',
        method: RequestMethod.POST,
      },
      { path: 'api/documents/:documentId/chunks', method: RequestMethod.GET },
    );
  }
}
