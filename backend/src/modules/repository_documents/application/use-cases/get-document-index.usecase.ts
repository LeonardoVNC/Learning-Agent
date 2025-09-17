import { Injectable, Logger } from '@nestjs/common';
import type { DocumentIndexRepositoryPort } from '../../domain/ports/document-index-repository.port';
import { DocumentIndex } from '../../domain/entities/document-index.entity';

export interface GetDocumentIndexCommand {
  documentId: string;
}

@Injectable()
export class GetDocumentIndexUseCase {
  private readonly logger = new Logger(GetDocumentIndexUseCase.name);

  constructor(
    private readonly documentIndexRepository: DocumentIndexRepositoryPort,
  ) {}

  async execute(
    command: GetDocumentIndexCommand,
  ): Promise<DocumentIndex | null> {
    const { documentId } = command;

    try {
      this.logger.log(
        `Obteniendo índice guardado para documento: ${documentId}`,
      );

      const documentIndex =
        await this.documentIndexRepository.findByDocumentId(documentId);

      if (!documentIndex) {
        this.logger.warn(
          `No se encontró índice para el documento: ${documentId}`,
        );
        return null;
      }

      this.logger.log(
        `Índice encontrado para documento ${documentId}: ${documentIndex.title} (${documentIndex.chapters.length} capítulos)`,
      );

      return documentIndex;
    } catch (error) {
      this.logger.error(
        `Error obteniendo índice para documento ${documentId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw new Error(
        `Error obteniendo índice del documento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }
}
