import axios from 'axios';
import type { CancelTokenSource } from 'axios';

export interface ChunkedUploadProgress {
  stepKey: string;
  progress: number;
  message: string;
  uploadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  timeRemaining?: number;
}

export interface ChunkedUploadOptions {
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  courseId?: string;
  classId?: string;
}

export interface ChunkedUploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  completed: boolean;
  fileSize: number;
}

export interface ChunkedUploadResult {
  success: boolean;
  document?: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
    uploadedAt: string;
  };
  sessionId: string;
  error?: string;
  status?: 'uploaded' | 'restored' | 'duplicate_found' | 'similar_found';
}

class ChunkedUploadService {
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private uploadSessions: Map<string, ChunkedUploadSession> = new Map();
  private API_URL: string;

  constructor() {
    this.API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  }

  private async getAuthToken(): Promise<string> {
    const authData = localStorage.getItem("auth");
    if (!authData) {
      throw new Error('No authentication data available. Please log in.');
    }

    try {
      const parsedAuth = JSON.parse(authData);
      const token = parsedAuth.accessToken;

      if (!token) {
        throw new Error('Access token not found. Please log in again.');
      }

      return token;
    } catch {
      throw new Error('Session expired. Please log in again.');
    }
  }

  async initializeUploadSession(
    file: File, 
    options: ChunkedUploadOptions = {}
  ): Promise<{ sessionId: string; session: ChunkedUploadSession }> {
    const { chunkSize = Number(import.meta.env.VITE_DEFAULT_CHUNK_SIZE) || 1024 * 1024 } = options;
    
    try {
      const token = await this.getAuthToken();
      const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      const session: ChunkedUploadSession = {
        sessionId,
        fileName: file.name,
        totalChunks,
        chunkSize,
        uploadedChunks: [],
        completed: false,
        fileSize: file.size
      };

      this.uploadSessions.set(sessionId, session);

      const cancelTokenSource = axios.CancelToken.source();
      this.cancelTokens.set(sessionId, cancelTokenSource);

      await axios.post(
        `${this.API_URL}api/documents/upload/init`,
        {
          sessionId,
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          chunkSize,
          mimeType: file.type
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cancelToken: cancelTokenSource.token,
          timeout: Number(import.meta.env.VITE_UPLOAD_TIMEOUT) || 600000 // 10 minutes for upload initialization
        }
      );

      return { sessionId, session };
    } catch (error) {
      console.error('Error initializing upload session:', error);
      throw new Error('Error initializing upload session');
    }
  }

  async uploadFileWithChunks(
    file: File,
    options: ChunkedUploadOptions = {}
  ): Promise<ChunkedUploadResult> {
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!file) {
        throw new Error('No file selected');
      }

      if (file.size === 0) {
        throw new Error('File is empty');
      }

      const { chunkSize = Number(import.meta.env.VITE_DEFAULT_CHUNK_SIZE) || 1024 * 1024 } = options;
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        const uploadedBytes = Math.min((i + 1) * chunkSize, file.size);
        
        options.onProgress?.({
          stepKey: 'upload',
          progress,
          message: `Uploading chunk ${i + 1} of ${totalChunks}`,
          uploadedBytes,
          totalBytes: file.size,
        });
        
        options.onChunkComplete?.(i, totalChunks);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const { documentService } = await import('./documents.service');
      const result = await documentService.uploadDocument(file, {
        courseId: options.courseId,
        classId: options.classId
      });

      if (!result.success) {
        throw new Error('Error uploading document');
      }

      options.onProgress?.({
        stepKey: 'complete',
        progress: 100,
        message: 'Upload completed successfully'
      });

      return {
        success: true,
        document: result.data,
        sessionId,
        status: result.status, // Pass the backend status
      };

    } catch (error) {
      console.error('Error in chunked upload:', error);
      
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error in upload'
      };
    }
  }

  async cancelUpload(sessionId: string): Promise<void> {
    try {
      const cancelTokenSource = this.cancelTokens.get(sessionId);
      if (cancelTokenSource) {
        cancelTokenSource.cancel('Upload cancelled by user');
        this.cancelTokens.delete(sessionId);
      }

      try {
        const token = await this.getAuthToken();
        await axios.post(
          `${this.API_URL}api/documents/upload/cancel`,
          { sessionId },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
      } catch (error) {
        console.warn('Error notifying cancellation to backend:', error);
      }

      this.uploadSessions.delete(sessionId);
    } catch (error) {
      console.error('Error canceling upload:', error);
    }
  }

  getUploadSession(sessionId: string): ChunkedUploadSession | null {
    return this.uploadSessions.get(sessionId) || null;
  }

  isUploadInProgress(sessionId: string): boolean {
    const session = this.uploadSessions.get(sessionId);
    return session ? !session.completed : false;
  }

  cleanupCompletedSessions(): void {
    for (const [sessionId, session] of this.uploadSessions.entries()) {
      if (session.completed) {
        this.uploadSessions.delete(sessionId);
        this.cancelTokens.delete(sessionId);
      }
    }
  }

  getUploadStats(sessionId: string): {
    uploadedChunks: number;
    totalChunks: number;
    uploadedBytes: number;
    totalBytes: number;
    progressPercentage: number;
  } | null {
    const session = this.uploadSessions.get(sessionId);
    if (!session) return null;

    const uploadedBytes = session.uploadedChunks.length * session.chunkSize;
    const progressPercentage = (session.uploadedChunks.length / session.totalChunks) * 100;

    return {
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.totalChunks,
      uploadedBytes,
      totalBytes: session.fileSize,
      progressPercentage: Math.round(progressPercentage)
    };
  }
}

export const chunkedUploadService = new ChunkedUploadService();
