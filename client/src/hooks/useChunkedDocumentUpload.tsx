import { useCallback } from 'react';
import { chunkedUploadService } from '../services/chunkedUpload.service';
import { documentService } from '../services/documents.service';
import { useUser } from '../context/UserContext';
import type { 
  ChunkedUploadResult, 
  ChunkedUploadOptions 
} from '../services/chunkedUpload.service';
import type { Document } from '../interfaces/documentInterface';

export const useChunkedDocumentUpload = () => {
  const { id: _userId } = useUser();
  
  const processDocumentComplete = useCallback(async (
    document: ChunkedUploadResult['document'],
    onProgress?: (step: string, progress: number, message: string) => void,
    uploadStatus?: string // Add parameter for upload status
  ): Promise<{
    success: boolean;
    document: Document;
    processing: {
      textProcessed: boolean;
      chunksProcessed: boolean;
      totalChunks: number;
    };
  }> => {
    if (!document) {
      throw new Error('Document not available for processing');
    }

    try {
      const documentForProcessing: Document = {
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        downloadUrl: document.downloadUrl,
        uploadedAt: document.uploadedAt,
      };

      // If the document was uploaded with optimization (status 'uploaded') or restored (status 'restored'),
      // it's likely already fully processed
      if (uploadStatus === 'uploaded' || uploadStatus === 'restored') {
        // Check if it already has chunks to determine if it needs processing
        try {
          const chunksInfo = await documentService.getDocumentChunks(document.id);
          if (chunksInfo.data && chunksInfo.data.total > 0) {
            // The document already has chunks, no post-processing needed
            onProgress?.('complete', 100, uploadStatus === 'restored' 
              ? 'Documento restaurado y ya procesado' 
              : 'Documento ya procesado');
            return {
              success: true,
              document: documentForProcessing,
              processing: {
                textProcessed: true,
                chunksProcessed: true,
                totalChunks: chunksInfo.data.total,
              },
            };
          }
        } catch {
          // If can't get chunks, proceed with normal processing
          console.log('Could not get chunks, proceeding with processing...');
        }
      }

      // Normal processing for documents that need post-processing
      onProgress?.('text', 33, 'Processing document text...');
      try {
        await documentService.processDocumentText(document.id);
      } catch (textError: unknown) {
        // If document is already processed, ignore 400 error
        if (textError && typeof textError === 'object' && 'response' in textError) {
          const errorResponse = textError as { response?: { status?: number } };
          if (errorResponse.response?.status === 400) {
            console.log('Document already processed, continuing...');
          } else {
            throw textError;
          }
        } else {
          throw textError;
        }
      }

      onProgress?.('chunks', 66, 'Generando chunks del documento...');
      const chunksResult = await documentService.processDocumentChunks(document.id);

      onProgress?.('complete', 100, 'Procesamiento completado');

      return {
        success: true,
        document: documentForProcessing,
        processing: {
          textProcessed: true,
          chunksProcessed: true,
          totalChunks: chunksResult.data?.totalChunks || 0,
        },
      };
    } catch (error) {
      console.error('Error in post-upload processing:', error);
      throw new Error('Error en el procesamiento posterior del documento');
    }
  }, []);

  const uploadAndProcessDocument = useCallback(async (
    file: File,
    options: ChunkedUploadOptions = {}
  ): Promise<{
    success: boolean;
    document: Document;
    processing: {
      textProcessed: boolean;
      chunksProcessed: boolean;
      totalChunks: number;
    };
  }> => {
    try {
      const uploadResult = await chunkedUploadService.uploadFileWithChunks(file, options);
      
      if (!uploadResult.success || !uploadResult.document) {
        throw new Error(uploadResult.error || 'Error in chunked upload');
      }

      const processingResult = await processDocumentComplete(
        uploadResult.document, 
        undefined, 
        uploadResult.status
      );
      
      return processingResult;
    } catch (error) {
      console.error('Error in complete chunked upload and processing:', error);
      throw error;
    }
  }, [processDocumentComplete]);

  const cancelUpload = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await chunkedUploadService.cancelUpload(sessionId);
    } catch (error) {
      console.error('Error canceling upload:', error);
      throw error;
    }
  }, []);

  const getUploadStats = useCallback((sessionId: string) => {
    return chunkedUploadService.getUploadStats(sessionId);
  }, []);

  const isUploadInProgress = useCallback((sessionId: string): boolean => {
    return chunkedUploadService.isUploadInProgress(sessionId);
  }, []);

  const cleanupCompletedSessions = useCallback((): void => {
    chunkedUploadService.cleanupCompletedSessions();
  }, []);

  return {
    // Main function to use with ChunkedUploadButton
    processDocumentComplete,
    
    // Complete upload and processing function
    uploadAndProcessDocument,
    
    // Control functions
    cancelUpload,
    getUploadStats,
    isUploadInProgress,
    cleanupCompletedSessions,
    
    // Underlying service for direct access if needed
    chunkedUploadService,
  };
};
