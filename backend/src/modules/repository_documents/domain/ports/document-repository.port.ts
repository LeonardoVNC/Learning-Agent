import { Document, DocumentStatus } from '../entities/document.entity';

export interface DocumentRepositoryPort {
  /**
   * Guarda un documento en la base de datos
   * @param document Documento a guardar
   * @returns Documento guardado
   */
  save(document: Document): Promise<Document>;

  /**
   * Busca un documento por ID
   * @param id ID del documento
   * @returns Documento encontrado o undefined
   */
  findById(id: string): Promise<Document | undefined>;

  /**
   * Busca un documento por hash del archivo
   * @param fileHash Hash SHA-256 del archivo
   * @returns Documento encontrado o undefined
   */
  findByFileHash(fileHash: string): Promise<Document | undefined>;

  /**
   * Busca un documento por su hash de texto normalizado
   * @param textHash Hash SHA-256 del texto normalizado
   * @returns Documento encontrado o undefined
   */
  findByTextHash(textHash: string): Promise<Document | undefined>;

  /**
   * Busca un documento por clave S3
   * @param s3Key Clave del archivo en S3
   * @returns Documento encontrado o undefined
   */
  findByS3Key(s3Key: string): Promise<Document | undefined>;

  /**
   * Lista documentos por estado
   * @param status Estado del documento
   * @returns Lista de documentos con el estado especificado
   */
  findByStatus(status: DocumentStatus): Promise<Document[]>;

  /**
   * Lista documentos subidos por un usuario
   * @param uploadedBy ID del usuario
   * @returns Lista de documentos del usuario
   */
  findByUploadedBy(uploadedBy: string): Promise<Document[]>;

  /**
   * Actualiza el estado de un documento
   * @param id ID del documento
   * @param status Nuevo estado
   * @returns Documento actualizado o undefined si no existe
   */
  updateStatus(
    id: string,
    status: DocumentStatus,
  ): Promise<Document | undefined>;

  /**
   * Actualiza el texto extraído de un documento
   * @param id ID del documento
   * @param extractedText Texto extraído
   * @param pageCount Número de páginas (opcional)
   * @param documentTitle Título del documento (opcional)
   * @param documentAuthor Autor del documento (opcional)
   * @param language Idioma del documento (opcional)
   * @returns Documento actualizado o undefined si no existe
   */
  updateExtractedText(
    id: string,
    extractedText: string,
    pageCount?: number,
    documentTitle?: string,
    documentAuthor?: string,
    language?: string,
  ): Promise<Document | undefined>;

  /**
   * Elimina un documento de la base de datos
   * @param id ID del documento
   * @returns true si se eliminó, false si no existía
   */
  delete(id: string): Promise<boolean>;

  /**
   * Lista todos los documentos con paginación
   * @param offset Número de registros a saltar
   * @param limit Número máximo de registros a retornar
   * @returns Lista de documentos
   */
  findAll(offset?: number, limit?: number): Promise<Document[]>;

  /**
   * Lista documentos con filtros opcionales por course y/o class
   * @param filters Filtros opcionales
   * @param offset Número de registros a saltar
   * @param limit Número máximo de registros a retornar
   * @returns Lista de documentos filtrados
   */
  findWithFilters(
    filters?: { courseId?: string; classId?: string },
    offset?: number,
    limit?: number,
  ): Promise<Document[]>;

  /**
   * Cuenta el total de documentos
   * @returns Número total de documentos
   */
  count(): Promise<number>;

  /**
   * Cuenta documentos por estado
   * @param status Estado del documento
   * @returns Número de documentos con el estado especificado
   */
  countByStatus(status: DocumentStatus): Promise<number>;

  /**
   * Lista documentos por curso/materia con paginación
   * @param courseId ID del curso/materia
   * @param offset Número de registros a saltar
   * @param limit Número máximo de registros a retornar
   * @param tipo Filtro opcional por tipo de archivo
   * @returns Lista de documentos del curso
   */
  findByCourseId(
    courseId: string,
    offset?: number,
    limit?: number,
    tipo?: string,
  ): Promise<Document[]>;

  /**
   * Cuenta documentos por curso/materia
   * @param courseId ID del curso/materia
   * @param tipo Filtro opcional por tipo de archivo
   * @returns Número de documentos del curso
   */
  countByCourseId(courseId: string, tipo?: string): Promise<number>;

  /**
   * Asocia un documento con un curso/materia
   * @param documentId ID del documento
   * @param courseId ID del curso/materia
   * @returns Documento actualizado o undefined si no existe
   */
  associateWithCourse(
    documentId: string,
    courseId: string,
  ): Promise<Document | undefined>;
}
