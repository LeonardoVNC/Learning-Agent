export class Document {
  constructor(
    public readonly id: string,
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly url: string,
    public readonly s3Key: string,
    public readonly fileHash: string,
    public readonly uploadedBy: string,
    public readonly status: DocumentStatus = DocumentStatus.UPLOADED,
    public readonly extractedText?: string,
    public readonly textHash?: string,
    public readonly pageCount?: number,
    public readonly documentTitle?: string,
    public readonly documentAuthor?: string,
    public readonly language?: string,
    public readonly courseId?: string,
    public readonly classId?: string,
    public readonly uploadedAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}
}

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
  DELETED = 'DELETED',
}
