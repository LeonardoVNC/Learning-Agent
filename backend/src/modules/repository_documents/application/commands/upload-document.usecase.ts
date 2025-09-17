import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import { Document, DocumentStatus } from '../../domain/entities/document.entity';
import { UploadDocumentRequest } from '../../domain/value-objects/upload-document.vo';
import { DocumentChunkingService } from '../../domain/services/document-chunking.service';
import { DocumentService } from '../../domain/services/document.service';
import { DocumentChunkService } from '../../domain/services/document-chunk.service';

/**
 * Options for reusing pre-generated data during upload
 */
export interface UploadWithPreGeneratedDataOptions {
  preGeneratedChunks?: Array<{
    content: string;
    metadata?: Record<string, any>;
  }>;
  preGeneratedEmbeddings?: number[][];
  extractedText?: string;
  reuseGeneratedData?: boolean;
  courseId?: string;
  classId?: string;
}

@Injectable()
export class UploadDocumentUseCase {
  constructor(
    private readonly storageAdapter: DocumentStoragePort,
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly chunkingService: DocumentChunkingService,
  ) {}

  async execute(
    file: Express.Multer.File,
    uploadedBy: string,
    options?: UploadWithPreGeneratedDataOptions,
  ): Promise<Document> {
    console.log(' Starting upload use case:', {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy,
      hasBuffer: !!file.buffer,
      bufferLength: file.buffer?.length,
      reusingData: options?.reuseGeneratedData || false,
      preGeneratedChunks: options?.preGeneratedChunks?.length || 0,
      preGeneratedEmbeddings: options?.preGeneratedEmbeddings?.length || 0,
    });

    // Validar que sea un PDF
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    const maxSize = 100 * 1024 * 1024; // 100MB en bytes
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo no puede ser mayor a 100MB');
    }

    // Generar hash SHA-256 del archivo
    const fileHash = this.generateFileHash(file.buffer);
    // Verificar si ya existe un archivo con el mismo hash
    const existingDocument =
      await this.documentRepository.findByFileHash(fileHash);
    if (existingDocument) {
      throw new BadRequestException('Este archivo ya existe en el sistema');
    }

    // Generar ID único para el documento
    const documentId = uuidv4();

    // Subir archivo a storage
    const uploadRequest = new UploadDocumentRequest(
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
    );

    try {
      const storageResult =
        await this.storageAdapter.uploadDocument(uploadRequest);

      // Crear entidad de documento para base de datos
      console.log(' Creating document entity...');
      const document = DocumentService.create(
        documentId,
        storageResult.fileName, // storedName
        file.originalname, // originalName
        file.mimetype,
        file.size,
        storageResult.url,
        storageResult.fileName, // s3Key (mismo que fileName en este caso)
        fileHash,
        uploadedBy,
        options?.courseId,
        options?.classId,
      );

      // Guardar en base de datos
      const savedDocument = await this.documentRepository.save(document);

      console.log(' Document saved successfully:', savedDocument.id);

      // Si tenemos datos pre-generados, guardarlos para evitar regeneración
      if (
        options?.reuseGeneratedData &&
        options.preGeneratedChunks &&
        options.preGeneratedEmbeddings
      ) {
        console.log(' Saving pre-generated data:', {
          chunks: options.preGeneratedChunks.length,
          embeddings: options.preGeneratedEmbeddings.length,
        });

        try {
          // Convertir chunks pre-generados a entidades DocumentChunk
          const documentChunks = options.preGeneratedChunks.map(
            (chunk, index) =>
              DocumentChunkService.create(
                uuidv4(), // Nuevo ID único para cada chunk
                documentId, // ID del documento
                chunk.content, // Contenido del chunk
                index, // Índice del chunk
                'text', // Tipo por defecto
                chunk.metadata || {}, // Metadata del chunk
              ),
          );

          // Usar el servicio de chunking para guardar los chunks
          const savedChunks =
            await this.chunkingService['chunkRepository'].saveMany(
              documentChunks,
            );

          console.log(
            ` Pre-generated chunks saved successfully: ${savedChunks.length} chunks`,
          );

          // NUEVO: Guardar los embeddings para cada chunk
          if (options.preGeneratedEmbeddings && options.preGeneratedEmbeddings.length === savedChunks.length) {
            console.log(' 🔄 Saving pre-generated embeddings...');
            
            const embeddingUpdates = savedChunks.map((chunk, index) => ({
              chunkId: chunk.id,
              embedding: options.preGeneratedEmbeddings![index]
            }));
            
            await this.chunkingService['chunkRepository'].updateBatchEmbeddings(embeddingUpdates);
            
            console.log(` ✅ Pre-generated embeddings saved successfully: ${embeddingUpdates.length} embeddings`);
          } else {
            console.log(` ⚠️ Warning: Embeddings count (${options.preGeneratedEmbeddings?.length || 0}) doesn't match chunks count (${savedChunks.length})`);
          }

          // Actualizar el documento para marcar que tiene texto extraído
          if (options.extractedText) {
            let updatedDocument = DocumentService.withExtractedText(
              savedDocument,
              options.extractedText
            );
            updatedDocument = DocumentService.withStatus(updatedDocument, DocumentStatus.PROCESSED);

            await this.documentRepository.save(updatedDocument);

            console.log('Document marked as processed with extracted text');
          }
        } catch (error) {
          console.log('Error saving pre-generated chunks:', error);
          // No fallar la subida completa por esto, solo loggearlo
        }
      }

      return savedDocument;
    } catch (error) {
      console.log(' Upload failed:', error);
      throw error;
    }
  }

  /**
   * Genera hash SHA-256 del archivo
   */
  private generateFileHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex');
  }
}
