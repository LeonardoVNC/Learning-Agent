import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import {
  Document,
  DocumentStatus,
} from '../../domain/entities/document.entity';

@Injectable()
export class PrismaDocumentRepositoryAdapter implements DocumentRepositoryPort {
  private readonly logger = new Logger(PrismaDocumentRepositoryAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(document: Document): Promise<Document> {
    try {
      // Log para verificar valores de courseId y classId
      this.logger.log('Guardando documento con values:', {
        documentId: document.id,
        fileName: document.fileName,
        courseId: document.courseId,
        classId: document.classId,
      });

      // Usar upsert para manejar casos donde el documento pueda existir
      const savedDocument = await this.prisma.document.upsert({
        where: { id: document.id },
        update: {
          originalName: document.originalName,
          storedName: document.fileName,
          s3Key: document.s3Key,
          size: document.size,
          contentType: document.mimeType,
          fileHash: document.fileHash,
          textHash: document.textHash,
          extractedText: document.extractedText,
          status: document.status as any,
          uploadedBy: document.uploadedBy,
          pageCount: document.pageCount,
          documentTitle: document.documentTitle,
          documentAuthor: document.documentAuthor,
          language: document.language,
          courseId: document.courseId,
          classId: document.classId,
          updatedAt: new Date(),
        },
        create: {
          id: document.id,
          originalName: document.originalName,
          storedName: document.fileName,
          s3Key: document.s3Key,
          size: document.size,
          contentType: document.mimeType,
          fileHash: document.fileHash,
          textHash: document.textHash,
          extractedText: document.extractedText,
          status: document.status as any,
          uploadedBy: document.uploadedBy,
          pageCount: document.pageCount,
          documentTitle: document.documentTitle,
          documentAuthor: document.documentAuthor,
          language: document.language,
          courseId: document.courseId,
          classId: document.classId,
        },
      });

      return this.mapToDomain(savedDocument);
    } catch (error) {
      this.logger.error(
        `Error saving document ${document.id}: ${error.message}`,
      );
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  async findById(id: string): Promise<Document | undefined> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
      });

      return document ? this.mapToDomain(document) : undefined;
    } catch (error) {
      this.logger.error(`Error finding document by id ${id}: ${error.message}`);
      throw new Error(`Failed to find document: ${error.message}`);
    }
  }

  async findByFileHash(fileHash: string): Promise<Document | undefined> {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          fileHash,
          status: { not: 'DELETED' }, // excluir documentos eliminados
        },
      });

      return document ? this.mapToDomain(document) : undefined;
    } catch (error) {
      this.logger.error(
        `Error finding document by hash ${fileHash}: ${error.message}`,
      );
      throw new Error(`Failed to find document by hash: ${error.message}`);
    }
  }

  async findByTextHash(textHash: string): Promise<Document | undefined> {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          textHash,
          status: { not: 'DELETED' }, // excluir documentos eliminados
        },
      });

      return document ? this.mapToDomain(document) : undefined;
    } catch (error) {
      this.logger.error(
        `Error finding document by text hash ${textHash}: ${error.message}`,
      );
      throw new Error(`Failed to find document by text hash: ${error.message}`);
    }
  }

  async findByS3Key(s3Key: string): Promise<Document | undefined> {
    try {
      const document = await this.prisma.document.findFirst({
        where: { s3Key },
      });

      return document ? this.mapToDomain(document) : undefined;
    } catch (error) {
      this.logger.error(
        `Error finding document by S3 key ${s3Key}: ${error.message}`,
      );
      throw new Error(`Failed to find document by S3 key: ${error.message}`);
    }
  }

  async findByStatus(status: DocumentStatus): Promise<Document[]> {
    try {
      const documents = await this.prisma.document.findMany({
        where: { status: status as any },
        orderBy: { uploadedAt: 'desc' },
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(
        `Error finding documents by status ${status}: ${error.message}`,
      );
      throw new Error(`Failed to find documents by status: ${error.message}`);
    }
  }

  async findByUploadedBy(uploadedBy: string): Promise<Document[]> {
    try {
      const documents = await this.prisma.document.findMany({
        where: { uploadedBy },
        orderBy: { uploadedAt: 'desc' },
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(
        `Error finding documents by user ${uploadedBy}: ${error.message}`,
      );
      throw new Error(`Failed to find documents by user: ${error.message}`);
    }
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
  ): Promise<Document | undefined> {
    try {
      const updatedDocument = await this.prisma.document.update({
        where: { id },
        data: {
          status: status as any,
          updatedAt: new Date(),
        },
      });

      return this.mapToDomain(updatedDocument);
    } catch (error) {
      if (error.code === 'P2025') {
        return undefined; // Document not found
      }
      this.logger.error(
        `Error updating document status ${id}: ${error.message}`,
      );
      throw new Error(`Failed to update document status: ${error.message}`);
    }
  }

  async updateExtractedText(
    id: string,
    extractedText: string,
    pageCount?: number,
    documentTitle?: string,
    documentAuthor?: string,
    language?: string,
  ): Promise<Document | undefined> {
    try {
      const updatedDocument = await this.prisma.document.update({
        where: { id },
        data: {
          extractedText,
          pageCount,
          documentTitle,
          documentAuthor,
          language,
          updatedAt: new Date(),
        },
      });

      return this.mapToDomain(updatedDocument);
    } catch (error) {
      if (error.code === 'P2025') {
        return undefined; // Document not found
      }
      this.logger.error(
        `Error updating extracted text for document ${id}: ${error.message}`,
      );
      throw new Error(`Failed to update extracted text: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.document.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        return false; // Document not found
      }
      this.logger.error(`Error deleting document ${id}: ${error.message}`);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async findAll(offset = 0, limit = 50): Promise<Document[]> {
    try {
      const documents = await this.prisma.document.findMany({
        skip: offset,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(`Error finding all documents: ${error.message}`);
      throw new Error(`Failed to find documents: ${error.message}`);
    }
  }

  async findWithFilters(
    filters?: { courseId?: string; classId?: string },
    offset = 0,
    limit = 50,
  ): Promise<Document[]> {
    try {
      const whereClause: any = {};

      if (filters?.courseId) {
        whereClause.courseId = filters.courseId;
      }

      if (filters?.classId) {
        whereClause.classId = filters.classId;
      }

      const documents = await this.prisma.document.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(`Error finding documents with filters: ${error.message}`);
      throw new Error(`Failed to find documents with filters: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.prisma.document.count();
    } catch (error) {
      this.logger.error(`Error counting documents: ${error.message}`);
      throw new Error(`Failed to count documents: ${error.message}`);
    }
  }

  async countByStatus(status: DocumentStatus): Promise<number> {
    try {
      return await this.prisma.document.count({
        where: { status: status as any },
      });
    } catch (error) {
      this.logger.error(
        `Error counting documents by status ${status}: ${error.message}`,
      );
      throw new Error(`Failed to count documents by status: ${error.message}`);
    }
  }

  /**
   * Convierte un documento de Prisma a entidad de dominio
   */
  private mapToDomain(prismaDocument: any): Document {
    return new Document(
      prismaDocument.id,
      prismaDocument.storedName,
      prismaDocument.originalName,
      prismaDocument.contentType,
      prismaDocument.size,
      this.buildDocumentUrl(prismaDocument.s3Key),
      prismaDocument.s3Key,
      prismaDocument.fileHash,
      prismaDocument.uploadedBy,
      prismaDocument.status as DocumentStatus,
      prismaDocument.extractedText,
      prismaDocument.textHash,
      prismaDocument.pageCount,
      prismaDocument.documentTitle,
      prismaDocument.documentAuthor,
      prismaDocument.language,
      prismaDocument.courseId,
      prismaDocument.classId,
      prismaDocument.uploadedAt,
      prismaDocument.updatedAt,
    );
  }

  async findByCourseId(
    courseId: string,
    offset: number = 0,
    limit: number = 10,
    tipo?: string,
  ): Promise<Document[]> {
    try {
      const where: any = {
        courseId,
        status: {
          not: 'DELETED' as any,
        },
      };

      // Filtrar por tipo si se proporciona
      if (tipo) {
        where.contentType = {
          contains: tipo,
          mode: 'insensitive',
        };
      }

      const documents = await this.prisma.document.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(
        `Error finding documents by courseId ${courseId}: ${error.message}`,
      );
      throw new Error(`Failed to find documents by courseId: ${error.message}`);
    }
  }

  async countByCourseId(courseId: string, tipo?: string): Promise<number> {
    try {
      const where: any = {
        courseId,
        status: {
          not: 'DELETED' as any,
        },
      };

      // Filtrar por tipo si se proporciona
      if (tipo) {
        where.contentType = {
          contains: tipo,
          mode: 'insensitive',
        };
      }

      return await this.prisma.document.count({
        where,
      });
    } catch (error) {
      this.logger.error(
        `Error counting documents by courseId ${courseId}: ${error.message}`,
      );
      throw new Error(`Failed to count documents by courseId: ${error.message}`);
    }
  }

  async associateWithCourse(
    documentId: string,
    courseId: string,
  ): Promise<Document | undefined> {
    try {
      const updatedDocument = await this.prisma.document.update({
        where: { id: documentId },
        data: { courseId },
      });

      return this.mapToDomain(updatedDocument);
    } catch (error) {
      this.logger.error(
        `Error associating document ${documentId} with course ${courseId}: ${error.message}`,
      );
      throw new Error(
        `Failed to associate document with course: ${error.message}`,
      );
    }
  }

  /**
   * Construye la URL del documento basada en la configuración de S3
   */
  private buildDocumentUrl(s3Key: string): string {
    // En un entorno real, esto vendría de la configuración
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const bucketName = process.env.MINIO_BUCKET_NAME || 'documents';
    return `${endpoint}/${bucketName}/${s3Key}`;
  }
}
