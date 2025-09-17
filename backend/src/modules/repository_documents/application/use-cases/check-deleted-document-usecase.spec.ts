import { CheckDeletedDocumentUseCase } from './check-deleted-document.usecase';
import { DeletedDocumentCheckResult } from '../../domain/value-objects/deleted-document-check.vo';
import { DocumentStatus } from '../../domain/entities/document.entity';

describe('CheckDeletedDocumentUseCase', () => {
  let useCase: CheckDeletedDocumentUseCase;
  let mockDocumentRepository: any;
  let mockDeletedDocumentRepository: any;
  let mockTextExtraction: any;
  let mockDocumentStorage: any;

  const fakeRequest = {
    file: Buffer.from('pdf file'),
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    uploadedBy: 'user1',
  };

  beforeEach(() => {
    mockDocumentRepository = {
      findById: jest.fn(),
    };
    mockDeletedDocumentRepository = {
      findDeletedByFileHash: jest.fn(),
      findDeletedByTextHash: jest.fn(),
      restoreDocument: jest.fn(),
    };
    mockTextExtraction = {
      extractTextFromPdf: jest.fn(),
    };
    mockDocumentStorage = {
      exists: jest.fn(),
      moveFile: jest.fn(),
    };

    useCase = new CheckDeletedDocumentUseCase(
      mockDocumentRepository,
      mockDeletedDocumentRepository,
      mockTextExtraction,
      mockDocumentStorage,
    );
  });

  it('retorna exactMatch si encuentra documento eliminado por hash binario', async () => {
    mockDeletedDocumentRepository.findDeletedByFileHash.mockResolvedValue({
      id: 'doc1',
      fileName: 'test.pdf',
      s3Key: 'test.pdf',
      status: DocumentStatus.DELETED,
    });

    const result = await useCase.execute(fakeRequest);

    expect(result.status).toBe('exact_match');
    expect(result.deletedDocument?.id).toBe('doc1');
  });

  it('retorna textMatch si encuentra documento eliminado por hash de texto', async () => {
    mockDeletedDocumentRepository.findDeletedByFileHash.mockResolvedValue(null);
    mockTextExtraction.extractTextFromPdf.mockResolvedValue({ content: 'contenido' });
    mockDeletedDocumentRepository.findDeletedByTextHash.mockResolvedValue({
      id: 'doc2',
      fileName: 'test2.pdf',
      s3Key: 'test2.pdf',
      status: DocumentStatus.DELETED,
    });

    const result = await useCase.execute(fakeRequest);

    expect(result.status).toBe('text_match');
    expect(result.deletedDocument?.id).toBe('doc2');
  });

  it('retorna noMatch si no encuentra documentos eliminados', async () => {
    mockDeletedDocumentRepository.findDeletedByFileHash.mockResolvedValue(null);
    mockTextExtraction.extractTextFromPdf.mockResolvedValue({ content: 'contenido' });
    mockDeletedDocumentRepository.findDeletedByTextHash.mockResolvedValue(null);

    const result = await useCase.execute(fakeRequest);

    expect(result.status).toBe('no_match');
  });

  it('restaura documento automáticamente si autoRestore está habilitado', async () => {
    const deletedDoc = {
      id: 'doc1',
      fileName: 'test.pdf',
      s3Key: 'test.pdf',
      status: DocumentStatus.DELETED,
    };
    
    mockDeletedDocumentRepository.findDeletedByFileHash.mockResolvedValue(deletedDoc);
    mockDocumentStorage.exists.mockResolvedValue(true);
    mockDocumentStorage.moveFile.mockResolvedValue(undefined);
    mockDeletedDocumentRepository.restoreDocument.mockResolvedValue({
      id: 'doc1',
      fileName: 'test.pdf',
      status: DocumentStatus.UPLOADED,
    });

    const result = await useCase.execute({
      ...fakeRequest,
      options: { autoRestore: true },
    });

    expect(result.status).toBe('restored');
    expect(result.restoredDocument?.status).toBe(DocumentStatus.UPLOADED);
  });

  it('maneja error cuando archivo eliminado no existe en storage', async () => {
    const deletedDoc = {
      id: 'doc1',
      fileName: 'test.pdf',
      s3Key: 'test.pdf',
      status: DocumentStatus.DELETED,
    };
    
    mockDeletedDocumentRepository.findDeletedByFileHash.mockResolvedValue(deletedDoc);
    mockDocumentStorage.exists.mockResolvedValue(false);

    await expect(useCase.execute({
      ...fakeRequest,
      options: { autoRestore: true },
    })).rejects.toThrow('archivo eliminado no encontrado en storage');
  });

  it('restaura documento por ID correctamente', async () => {
    const deletedDoc = {
      id: 'doc1',
      fileName: 'test.pdf',
      s3Key: 'test.pdf',
      status: DocumentStatus.DELETED,
    };
    
    mockDocumentRepository.findById.mockResolvedValue(deletedDoc);
    mockDocumentStorage.exists.mockResolvedValue(true);
    mockDocumentStorage.moveFile.mockResolvedValue(undefined);
    mockDeletedDocumentRepository.restoreDocument.mockResolvedValue({
      id: 'doc1',
      fileName: 'test.pdf',
      status: DocumentStatus.UPLOADED,
    });

    const result = await useCase.restoreDocumentById('doc1', 'user1');

    expect(result.success).toBe(true);
    expect(result.document?.status).toBe(DocumentStatus.UPLOADED);
  });

  it('falla al restaurar documento que no existe', async () => {
    mockDocumentRepository.findById.mockResolvedValue(null);

    const result = await useCase.restoreDocumentById('nonexistent', 'user1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('no encontrado');
  });

  it('falla al restaurar documento que no está eliminado', async () => {
    mockDocumentRepository.findById.mockResolvedValue({
      id: 'doc1',
      status: DocumentStatus.UPLOADED,
    });

    const result = await useCase.restoreDocumentById('doc1', 'user1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('no está eliminado');
  });
});