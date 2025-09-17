import apiClient from "../api/apiClient";
import axios from "axios";
import { useUserStore } from "../store/userStore";
import type { 
  Document, 
  DocumentListResponse, 
  UploadResponse 
} from "../interfaces/documentInterface";

// Interface for HTTP errors
interface HttpError {
  response?: {
    status: number;
    data?: unknown;
  };
  message?: string;
}

// Function to get user data from Zustand store
const getUserFromStore = () => {
  return useUserStore.getState().user;
};

// Function to get authentication token
const getAuthToken = async (): Promise<string> => {
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
  } catch (_error) {
    throw new Error('Error parsing authentication data. Please log in again.');
  }
};

// Interfaces for backend responses
interface DocumentBackendResponse {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  uploadedAt: string;
  courseId?: string;
  classId?: string;
}

interface DocumentListBackendResponse {
  success: boolean;
  message: string;
  documents: DocumentBackendResponse[];
  total: number;
}

interface UploadBackendResponse {
  status: 'uploaded' | 'restored' | 'duplicate_found' | 'similar_found';
  message: string;
  document?: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
    uploadedAt: string;
  };
}

interface DeleteBackendResponse {
  success: boolean;
  message: string;
  fileName: string;
  deletedAt: string;
}

interface ProcessChunksBackendResponse {
  success: boolean;
  message: string;
  data?: {
    totalChunks: number;
    processingTimeMs: number;
    statistics: {
      averageChunkSize: number;
      minChunkSize: number;
      maxChunkSize: number;
      actualOverlapPercentage: number;
    };
  };
}

interface DocumentChunksBackendResponse {
  success: boolean;
  message: string;
  data: {
    chunks: Array<{
      id: string;
      content: string;
      chunkIndex: number;
      type: string;
      contentLength: number;
      metadata?: Record<string, unknown>;
      createdAt: string;
    }>;
    total: number;
    statistics: {
      totalChunks: number;
      averageChunkSize: number;
      minChunkSize: number;
      maxChunkSize: number;
      totalContentLength: number;
    };
  };
}

export const documentService = {
  /**
   * Get list of documents with optional filters
   */
  async getDocuments(filters?: { courseId?: string; classId?: string }): Promise<DocumentListResponse> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.courseId) {
        params.append('courseId', filters.courseId);
      }
      if (filters?.classId) {
        params.append('classId', filters.classId);
      }
      
      const url = `/api/documents${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<DocumentListBackendResponse>(url);
      
      // Map the backend response to our interface
      const documents: Document[] = response.data.documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        downloadUrl: doc.downloadUrl,
        uploadedAt: doc.uploadedAt,
        courseId: doc.courseId,
        classId: doc.classId,
      }));

      return {
        success: true,
        data: {
          documents,
          totalCount: response.data.total,
        },
      };
    } catch (error) {
      console.error('Error loading documents:', error);
      throw new Error('Error loading documents');
    }
  },

  /**
   * Upload a document with optional course and class association
   */
  async uploadDocument(
    file: File, 
    options?: { courseId?: string; classId?: string }
  ): Promise<UploadResponse> {
    try {
      // Get user data from Zustand store
      const user = getUserFromStore();
      const userId = user?.id;

      // Get authentication token
      const token = await getAuthToken();
      
      // Log user info for debugging
      console.log('Uploading document for user:', userId);

      const formData = new FormData();
      formData.append('file', file);
      
      // Add courseId and classId if provided
      if (options?.courseId) {
        formData.append('courseId', options.courseId);
      }
      if (options?.classId) {
        formData.append('classId', options.classId);
      }

      // Prepare headers (DO NOT include Content-Type for multipart/form-data)
      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      // Use axios directly to avoid conflicts with interceptors
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/";
      
      const response = await axios.post<UploadBackendResponse>(
        `${API_URL}api/documents/upload`, 
        formData,
        { 
          headers,
          timeout: Number(import.meta.env.VITE_UPLOAD_TIMEOUT) || 600000 // 10 minutes timeout for large file uploads
        }
      );

      // Verify document exists in response
      if (!response.data.document) {
        throw new Error('Server did not return document information');
      }

      // Map backend response to our interface
      const document: Document = {
        id: response.data.document.id,
        fileName: response.data.document.fileName,
        originalName: response.data.document.originalName,
        mimeType: response.data.document.mimeType,
        size: response.data.document.size,
        downloadUrl: response.data.document.downloadUrl,
        uploadedAt: response.data.document.uploadedAt,
        courseId: options?.courseId,
        classId: options?.classId,
      };

      return {
        success: true,
        data: document,
        status: response.data.status, // Add the backend status.
      };
    } catch (error: unknown) {
      console.error('Error uploading document:', error);
      
      const httpError = error as HttpError;
      
      // Handling specific duplicate error codes (409)
      if (httpError.response?.status === 409) {
        const errorData = httpError.response.data as { message?: string };
        throw new Error(errorData?.message || 'Duplicate document detected');
      }
      
      // Handle specific authentication errors
      if (httpError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      
      if (httpError.response?.status === 403) {
        throw new Error('No permissions to upload documents.');
      }
      
      // If error from getAuthToken function, keep original message
      if ((error as Error).message?.includes('authentication') || 
          (error as Error).message?.includes('session')) {
        throw error;
      }
      
      throw new Error('Error uploading document. Please try again.');
    }
  },

  /**
   * Download a document using its ID
   */
  async getDownloadUrl(documentId: string): Promise<string> {
    try {
      const response = await apiClient.get(`/api/documents/download/${documentId}`);
      return response.data.downloadUrl || response.data.url;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error('Error al obtener URL de descarga');
    }
  },

  /**
   * Download and save document using its ID
   */
  async downloadAndSaveDocument(documentId: string, originalName: string): Promise<void> {
    try {
      // Get the download URL using axios (our backend)
      const downloadUrlResponse = await apiClient.get(`/api/documents/download/${documentId}`);
      const downloadUrl = downloadUrlResponse.data.downloadUrl;

      // Use fetch() for MinIO since axios may interfere with signed URLs
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download error: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary link for forced download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = originalName.endsWith('.pdf') ? originalName : `${originalName}.pdf`;

      // Force download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL to free memory
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw new Error('Error downloading document');
    }
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await apiClient.delete<DeleteBackendResponse>(`/api/documents/${documentId}`);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Error deleting document');
    }
  },

  /**
   * Process document chunks
   */
  async processDocumentChunks(
    documentId: string,
    options?: {
      chunkSize?: number;
      overlapSize?: number;
      maxChunkSize?: number;
      strategy?: string;
      minChunkSize?: number;
      preserveFormatting?: boolean;
      splitBy?: string;
    }
  ): Promise<ProcessChunksBackendResponse> {
    try {
      const response = await apiClient.post<ProcessChunksBackendResponse>(
        `/api/documents/${documentId}/process-chunks`,
        options || {}
      );
      return response.data;
    } catch (error) {
      console.error('Error processing document chunks:', error);
      throw new Error('Error processing document chunks');
    }
  },

  /**
   * Get chunks from a document
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunksBackendResponse> {
    try {
      const response = await apiClient.get<DocumentChunksBackendResponse>(`/api/documents/${documentId}/chunks`);
      return response.data;
    } catch (error) {
      console.error('Error getting document chunks:', error);
      throw new Error('Error getting document chunks');
    }
  },

  /**
   * Generate embeddings for a document
   */
  async generateDocumentEmbeddings(
    documentId: string,
    options?: {
      embeddingConfig?: {
        model?: string;
        dimensions?: number;
        additionalConfig?: Record<string, unknown>;
      };
      replaceExisting?: boolean;
      batchSize?: number;
      chunkFilters?: {
        chunkTypes?: string[];
        chunkIndices?: number[];
        minContentLength?: number;
      };
    }
  ): Promise<{
    success: boolean;
    result?: {
      documentId: string;
      totalChunksProcessed: number;
      chunksSkipped: number;
      chunksWithErrors: number;
      totalProcessingTimeMs: number;
      estimatedCost?: {
        totalTokens: number;
        totalCost: number;
      };
    };
    metadata?: {
      processingTimeMs: number;
      timestamp: string;
    };
  }> {
    try {
      const response = await apiClient.post(
        `/api/repository-documents/embeddings/generate/${documentId}`,
        options || {}
      );
      return response.data;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Error generating embeddings');
    }
  },

  /**
   * Process document text
   */
  async processDocumentText(documentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/api/documents/${documentId}/process-text`);
      return response.data;
    } catch (error) {
      console.error('Error processing document text:', error);
      throw new Error('Error processing document text');
    }
  },

  /**
   * Complete processing of a document (upload + process + chunks)
   */
  async processDocumentComplete(
    file: File,
    onProgress?: (step: string, progress: number, message: string) => void
  ): Promise<{
    success: boolean;
    document: Document;
    processing: {
      textProcessed: boolean;
      chunksProcessed: boolean;
      totalChunks: number;
    };
  }> {
    try {
      // Step 1: Upload
      onProgress?.('upload', 25, 'Uploading document...');
      const uploadResult = await this.uploadDocument(file);
      
      if (!uploadResult.data.id) {
        throw new Error('Document ID not obtained from upload');
      }

      // Step 2: Process text
      onProgress?.('text', 50, 'Processing text...');
      await this.processDocumentText(uploadResult.data.id);

      // Step 3: Process chunks
      onProgress?.('chunks', 75, 'Generating chunks...');
      const chunksResult = await this.processDocumentChunks(uploadResult.data.id);

      onProgress?.('complete', 100, 'Process completed');

      return {
        success: true,
        document: uploadResult.data,
        processing: {
          textProcessed: true,
          chunksProcessed: true,
          totalChunks: chunksResult.data?.totalChunks || 0,
        },
      };
    } catch (error) {
      console.error('Error in complete document processing:', error);
      throw new Error('Error en el procesamiento completo del documento');
    }
  },

  /**
   * Get the index of a document
   */
  async getDocumentIndex(documentId: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      index: Array<{
        id: string;
        title: string;
        level: number;
        page?: number;
        content?: string;
        chunkId?: string;
        createdAt: string;
      }>;
      total: number;
      metadata: {
        documentId: string;
        generatedAt: string;
        structure: {
          totalSections: number;
          maxDepth: number;
          averageSectionLength: number;
        };
      };
    };
  }> {
    try {
      const response = await apiClient.get(`/api/documents/${documentId}/index`);
      return response.data;
    } catch (error) {
      console.error('Error getting document index:', error);
      throw new Error('Error al obtener el índice del documento');
    }
  },

  /**
   * Generate an index for a document
   */
  async generateDocumentIndex(documentId: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      totalSections: number;
      processingTimeMs: number;
      structure: {
        maxDepth: number;
        averageSectionLength: number;
      };
    };
  }> {
    try {
      const response = await apiClient.post(`/api/documents/${documentId}/generate-index`);
      return response.data;
    } catch (error) {
      console.error('Error generating document index:', error);
      throw new Error('Error generating document index');
    }
  },
};
