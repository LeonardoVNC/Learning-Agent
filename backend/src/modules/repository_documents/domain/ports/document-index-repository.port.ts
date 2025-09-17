import { DocumentIndex } from '../entities/document-index.entity';

export interface DocumentIndexRepositoryPort {
  /**
   * Guarda un nuevo índice de documento en la base de datos
   */
  save(documentIndex: DocumentIndex): Promise<DocumentIndex>;

  /**
   * Busca un índice por ID de documento
   */
  findByDocumentId(documentId: string): Promise<DocumentIndex | null>;

  /**
   * Busca un índice por su ID
   */
  findById(id: string): Promise<DocumentIndex | null>;

  /**
   * Actualiza un índice existente
   */
  update(
    id: string,
    documentIndex: Partial<DocumentIndex>,
  ): Promise<DocumentIndex>;

  /**
   * Elimina un índice por ID de documento
   */
  deleteByDocumentId(documentId: string): Promise<void>;

  /**
   * Lista todos los índices con paginación
   */
  findAll(options?: {
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<{
    items: DocumentIndex[];
    total: number;
  }>;
}
