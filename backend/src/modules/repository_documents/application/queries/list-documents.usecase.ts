import { Injectable } from '@nestjs/common';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import { DocumentListResponse, DocumentListItem } from '../../domain/value-objects/upload-document.vo';

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    private readonly documentStorage: DocumentStoragePort,
    private readonly documentRepository: DocumentRepositoryPort,
  ) {}

  /**
   * Ejecuta el caso de uso para listar documentos
   * @param filters - Filtros opcionales para course y class
   * @returns Lista de documentos disponibles, excluyendo los eliminados
   */
  async execute(filters?: { courseId?: string; classId?: string }): Promise<DocumentListResponse> {
    try {
      // Obtener documentos de la base de datos con filtros
      const dbDocuments = filters?.courseId || filters?.classId 
        ? await this.documentRepository.findWithFilters(filters)
        : await this.documentRepository.findAll();

      // Crear DocumentListItem con datos correctos
      const documents: DocumentListItem[] = [];

      for (const doc of dbDocuments) {
        try {
          // Verificar que el archivo existe en el storage
          const exists = await this.documentStorage.documentExists(
            doc.fileName,
          );
          if (!exists) continue;

          // Generar URL de descarga
          const downloadUrl = await this.documentStorage.generateDownloadUrl(
            doc.fileName,
          );

          documents.push(
            new DocumentListItem(
              doc.id, // ID real del documento
              doc.fileName,
              doc.originalName,
              doc.mimeType,
              doc.size,
              downloadUrl,
              doc.uploadedAt,
              doc.courseId,
              doc.classId,
            ),
          );
        } catch (error) {
          console.error(`Error processing document ${doc.id}:`, error);
          // Continuar con el siguiente documento
        }
      }

      return new DocumentListResponse(documents, documents.length);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Manejar errores específicos de conexión o bucket vacío
      if (
        errorMessage.includes('NoSuchBucket') ||
        errorMessage.includes('bucket does not exist')
      ) {
        throw new Error(
          'Bucket de documentos no encontrado. Verifique la configuración de MinIO.',
        );
      }

      if (
        errorMessage.includes('connection') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        throw new Error(
          'Error de conexión con MinIO. Verifique que el servicio esté disponible.',
        );
      }
      throw new Error(`Error al listar documentos: ${errorMessage}`);
    }
  }
}
