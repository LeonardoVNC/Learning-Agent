import { ProcessDocumentTextUseCase } from './process-document-text.usecase';
import { Logger } from '@nestjs/common';
import { DocumentStatus } from '../../domain/entities/document.entity';
import { DocumentService } from '../../domain/services/document.service';

// Mock de DocumentService
jest.mock('../../domain/services/document.service', () => ({
  DocumentService: {
    isReadyForProcessing: jest.fn(),
  },
}));

describe('ProcessDocumentTextUseCase', () => {
  let useCase: ProcessDocumentTextUseCase;
  let repoMock: any;
  let textExtractionMock: any;
  let storageMock: any;

  beforeEach(() => {
    repoMock = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateExtractedText: jest.fn(),
    };
    textExtractionMock = { extractTextFromPdf: jest.fn() };
    storageMock = { downloadFileBuffer: jest.fn() };

    useCase = new ProcessDocumentTextUseCase(
      repoMock,
      textExtractionMock,
      storageMock,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should process text successfully', async () => {
    const doc = {
      id: 'doc-1',
      s3Key: 'file.pdf',
      originalName: 'File.pdf',
      status: DocumentStatus.UPLOADED, // Estado correcto para procesamiento
    };
    
    // Mock de DocumentService para que devuelva true
    (DocumentService.isReadyForProcessing as jest.Mock).mockReturnValue(true);
    
    repoMock.findById.mockResolvedValue(doc);
    storageMock.downloadFileBuffer.mockResolvedValue(Buffer.from('data'));
    textExtractionMock.extractTextFromPdf.mockResolvedValue({
      content: 'extracted text content',
      pageCount: 1,
      documentTitle: 'Title',
      documentAuthor: 'Author',
      language: 'en',
      getContentLength: () => 20,
      getWordCount: () => 3,
    });

    const result = await useCase.execute('doc-1');
    
    expect(result).toBe(true);
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.PROCESSING);
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.PROCESSED);
    expect(repoMock.updateExtractedText).toHaveBeenCalledWith(
      'doc-1',
      'extracted text content',
      1,
      'Title',
      'Author',
      'en'
    );
  });

  it('should return false if document not ready', async () => {
    const doc = {
      id: 'doc-1',
      status: DocumentStatus.PROCESSED, // Estado que no permite procesamiento
    };
    
    // Mock de DocumentService para que devuelva false
    (DocumentService.isReadyForProcessing as jest.Mock).mockReturnValue(false);
    
    repoMock.findById.mockResolvedValue(doc);

    const result = await useCase.execute('doc-1');
    
    expect(result).toBe(false);
    expect(repoMock.updateStatus).not.toHaveBeenCalled();
  });

  it('should return false if document not found', async () => {
    repoMock.findById.mockResolvedValue(null);

    const result = await useCase.execute('doc-1');
    
    expect(result).toBe(false);
    expect(repoMock.updateStatus).not.toHaveBeenCalled();
  });

  it('should handle download errors and mark as ERROR', async () => {
    const doc = {
      id: 'doc-1',
      s3Key: 'file.pdf',
      originalName: 'File.pdf',
      status: DocumentStatus.UPLOADED,
    };
    
    (DocumentService.isReadyForProcessing as jest.Mock).mockReturnValue(true);
    repoMock.findById.mockResolvedValue(doc);
    storageMock.downloadFileBuffer.mockRejectedValue(new Error('Download failed'));

    const result = await useCase.execute('doc-1');
    
    expect(result).toBe(false);
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.PROCESSING);
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.ERROR);
  });

  it('should handle text extraction errors and mark as ERROR', async () => {
    const doc = {
      id: 'doc-1',
      s3Key: 'file.pdf',
      originalName: 'File.pdf',
      status: DocumentStatus.UPLOADED,
    };
    
    (DocumentService.isReadyForProcessing as jest.Mock).mockReturnValue(true);
    repoMock.findById.mockResolvedValue(doc);
    storageMock.downloadFileBuffer.mockResolvedValue(Buffer.from('data'));
    textExtractionMock.extractTextFromPdf.mockRejectedValue(new Error('Extraction failed'));

    const result = await useCase.execute('doc-1');
    
    expect(result).toBe(false);
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.PROCESSING);
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.ERROR);
  });
});