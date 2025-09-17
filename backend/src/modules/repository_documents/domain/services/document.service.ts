import { Document, DocumentStatus } from '../entities/document.entity';

export class DocumentService {
  /**
   * Crea un nuevo documento
   */
  static create(
    id: string,
    fileName: string,
    originalName: string,
    mimeType: string,
    size: number,
    url: string,
    s3Key: string,
    fileHash: string,
    uploadedBy: string,
    courseId?: string,
    classId?: string,
  ): Document {
    return new Document(
      id,
      fileName,
      originalName,
      mimeType,
      size,
      url,
      s3Key,
      fileHash,
      uploadedBy,
      DocumentStatus.UPLOADED,
      undefined, // extractedText
      undefined, // textHash
      undefined, // pageCount
      undefined, // documentTitle
      undefined, // documentAuthor
      undefined, // language
      courseId,
      classId,
    );
  }

  /**
   * Actualiza el texto extraído del documento
   */
  static withExtractedText(
    document: Document,
    extractedText: string,
    textHash?: string,
    pageCount?: number,
    documentTitle?: string,
    documentAuthor?: string,
    language?: string,
  ): Document {
    return new Document(
      document.id,
      document.fileName,
      document.originalName,
      document.mimeType,
      document.size,
      document.url,
      document.s3Key,
      document.fileHash,
      document.uploadedBy,
      document.status,
      extractedText,
      textHash,
      pageCount,
      documentTitle,
      documentAuthor,
      language,
      document.courseId,
      document.classId,
      document.uploadedAt,
      new Date(),
    );
  }

  /**
   * Actualiza el estado del documento
   */
  static withStatus(document: Document, status: DocumentStatus): Document {
    return new Document(
      document.id,
      document.fileName,
      document.originalName,
      document.mimeType,
      document.size,
      document.url,
      document.s3Key,
      document.fileHash,
      document.uploadedBy,
      status,
      document.extractedText,
      document.textHash,
      document.pageCount,
      document.documentTitle,
      document.documentAuthor,
      document.language,
      document.courseId,
      document.classId,
      document.uploadedAt,
      new Date(),
    );
  }

  /**
   * Actualiza el hash del texto del documento
   */
  static withTextHash(document: Document, textHash: string): Document {
    return new Document(
      document.id,
      document.fileName,
      document.originalName,
      document.mimeType,
      document.size,
      document.url,
      document.s3Key,
      document.fileHash,
      document.uploadedBy,
      document.status,
      document.extractedText,
      textHash,
      document.pageCount,
      document.documentTitle,
      document.documentAuthor,
      document.language,
      document.courseId,
      document.classId,
      document.uploadedAt,
      new Date(),
    );
  }

  /**
   * Verifica si el documento está listo para procesamiento
   */
  static isReadyForProcessing(document: Document): boolean {
    return document.status === DocumentStatus.UPLOADED;
  }

  /**
   * Verifica si el documento ha sido procesado completamente
   */
  static isProcessed(document: Document): boolean {
    return document.status === DocumentStatus.PROCESSED;
  }

  /**
   * Verifica si el documento tiene texto extraído
   */
  static hasExtractedText(document: Document): boolean {
    return Boolean(document.extractedText && document.extractedText.trim().length > 0);
  }

  /**
   * Valida que el documento pueda cambiar de estado
   */
  static canChangeStatus(document: Document, newStatus: DocumentStatus): boolean {
    const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      [DocumentStatus.UPLOADED]: [DocumentStatus.PROCESSING, DocumentStatus.ERROR, DocumentStatus.DELETED],
      [DocumentStatus.PROCESSING]: [DocumentStatus.PROCESSED, DocumentStatus.ERROR, DocumentStatus.DELETED],
      [DocumentStatus.PROCESSED]: [DocumentStatus.PROCESSING, DocumentStatus.DELETED],
      [DocumentStatus.ERROR]: [DocumentStatus.PROCESSING, DocumentStatus.DELETED],
      [DocumentStatus.DELETED]: [],
    };

    return validTransitions[document.status]?.includes(newStatus) ?? false;
  }

  /**
   * Valida los datos básicos del documento
   */
  static validateDocumentData(
    fileName: string,
    originalName: string,
    mimeType: string,
    size: number,
    uploadedBy: string,
  ): void {
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('File name is required');
    }
    if (!originalName || originalName.trim().length === 0) {
      throw new Error('Original name is required');
    }
    if (!mimeType || mimeType.trim().length === 0) {
      throw new Error('MIME type is required');
    }
    if (size <= 0) {
      throw new Error('File size must be greater than 0');
    }
    if (!uploadedBy || uploadedBy.trim().length === 0) {
      throw new Error('Uploaded by is required');
    }
  }
}