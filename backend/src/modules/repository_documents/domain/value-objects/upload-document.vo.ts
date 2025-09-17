export class UploadDocumentRequest {
  constructor(
    public readonly file: Buffer,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
  ) {}
}

export class UploadDocumentResponse {
  constructor(
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly downloadUrl: string,
    public readonly uploadedAt: Date,
  ) {}
}

export class DocumentListItem {
  constructor(
    public readonly id: string,
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly downloadUrl: string,
    public readonly uploadedAt: Date,
    public readonly courseId?: string,
    public readonly classId?: string,
  ) {}
}

export class DocumentListResponse {
  constructor(
    public readonly docs: DocumentListItem[],
    public readonly total: number,
  ) {}
}