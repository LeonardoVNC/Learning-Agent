/**
 * Respuesta unificada del endpoint upload que incluye toda la funcionalidad
 */
export class UnifiedUploadResponseDto {
  constructor(
    public readonly status: 'uploaded' | 'restored' | 'duplicate_found' | 'similar_found',
    public readonly message: string,
    public readonly document?: {
      id: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      downloadUrl: string;
      uploadedAt: Date;
    },
    public readonly duplicateDocument?: {
      id: string;
      originalName: string;
      documentTitle: string | null;
      documentAuthor: string | null;
      uploadedAt: Date;
      uploadedBy: string;
      matchType: 'binary_hash' | 'text_hash';
    },
    public readonly similarDocuments?: Array<{
      id: string;
      originalName: string;
      documentTitle: string | null;
      documentAuthor: string | null;
      uploadedAt: Date;
      uploadedBy: string;
      similarityScore: number;
      details: {
        avgSimilarity: number;
        coverage: number;
        matchedChunks: number;
        totalChunks: number;
      };
    }>,
    public readonly wasRestored?: boolean,
    public readonly originalDeletedAt?: Date,
  ) {}
}

/**
 * DTO para opciones del endpoint upload unificado
 */
export class UnifiedUploadRequestDto {
  skipSimilarityCheck?: boolean | string;
  forceUpload?: boolean | string;
  similarityThreshold?: number;
  maxSimilarCandidates?: number;
  autoRestoreDeleted?: boolean | string;
  courseId?: string;
  classId?: string;
}
