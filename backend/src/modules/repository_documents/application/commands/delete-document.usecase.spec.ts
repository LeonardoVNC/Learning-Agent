import { DeleteDocumentUseCase } from './delete-document.usecase';
import { Logger } from '@nestjs/common';
import { DocumentStatus } from '../../domain/entities/document.entity';

describe('DeleteDocumentUseCase', () => {
  let useCase: DeleteDocumentUseCase;
  let storageMock: any;
  let repoMock: any;

  beforeEach(() => {
    storageMock = {
      documentExists: jest.fn(),
      softDeleteDocument: jest.fn(),
    };
    repoMock = {
      findById: jest.fn(),
      updateStatus: jest.fn(), // ¡CORRECCIÓN: Cambiado de delete a updateStatus!
    };

    useCase = new DeleteDocumentUseCase(storageMock, repoMock);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should delete document successfully', async () => {
    const document = { 
      fileName: 'file.pdf', 
      originalName: 'File.pdf',
      status: DocumentStatus.PROCESSED, // Agregar status para logging
      fileHash: 'hash123' // Agregar hash para logging
    };
    repoMock.findById.mockResolvedValue(document);
    storageMock.documentExists.mockResolvedValue(true);
    repoMock.updateStatus.mockResolvedValue(undefined); // Mockear updateStatus

    const result = await useCase.execute('doc-1');

    expect(storageMock.softDeleteDocument).toHaveBeenCalledWith('file.pdf');
    expect(repoMock.updateStatus).toHaveBeenCalledWith('doc-1', DocumentStatus.DELETED); // ¡CORRECCIÓN: Cambiado a updateStatus!
    expect(result.success).toBe(true);
  });

  it('should return error if document not found', async () => {
    repoMock.findById.mockResolvedValue(null);

    const result = await useCase.execute('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DOCUMENT_NOT_FOUND');
  });

  it('should return error if file not found in storage', async () => {
    repoMock.findById.mockResolvedValue({
      fileName: 'file.pdf',
      originalName: 'File.pdf',
      status: DocumentStatus.PROCESSED,
      fileHash: 'hash123'
    });
    storageMock.documentExists.mockResolvedValue(false);

    const result = await useCase.execute('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DOCUMENT_NOT_FOUND');
  });

  // Test adicional para verificar manejo de errores
  it('should handle errors during updateStatus', async () => {
    const document = { 
      fileName: 'file.pdf', 
      originalName: 'File.pdf',
      status: DocumentStatus.PROCESSED,
      fileHash: 'hash123'
    };
    repoMock.findById.mockResolvedValue(document);
    storageMock.documentExists.mockResolvedValue(true);
    storageMock.softDeleteDocument.mockResolvedValue(undefined);
    repoMock.updateStatus.mockRejectedValue(new Error('Database error'));

    const result = await useCase.execute('doc-1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to delete document');
  });
});