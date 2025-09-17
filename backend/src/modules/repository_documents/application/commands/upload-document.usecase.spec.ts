import { UploadDocumentUseCase } from './upload-document.usecase';
import { Logger, BadRequestException } from '@nestjs/common';

describe('UploadDocumentUseCase', () => {
  let useCase: UploadDocumentUseCase;
  let storageMock: any;
  let repoMock: any;
  let chunkingServiceMock: any;

  beforeEach(() => {
    // limpiar mocks previos
    jest.clearAllMocks();

    storageMock = { uploadDocument: jest.fn() };
    repoMock = { findByFileHash: jest.fn(), save: jest.fn() };
    // ajusta el nombre del método si tu chunking service usa otro
    chunkingServiceMock = { chunkDocument: jest.fn().mockResolvedValue([]) };

    useCase = new UploadDocumentUseCase(
      storageMock,
      repoMock,
      chunkingServiceMock,
    );

    // silenciar logs para que los tests no impriman en consola
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should upload document successfully', async () => {
    const file: any = {
      originalname: 'file.pdf',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('data'),
    };

    repoMock.findByFileHash.mockResolvedValue(null);
    storageMock.uploadDocument.mockResolvedValue({
      fileName: 'file.pdf',
      url: 'http://url',
    });
    repoMock.save.mockImplementation((d: any) => Promise.resolve(d));
    chunkingServiceMock.chunkDocument.mockResolvedValue([]); // por si execute lo llama

    const doc = await useCase.execute(file, 'user-1');

    expect(doc.originalName).toBe('file.pdf');
    expect(storageMock.uploadDocument).toHaveBeenCalled();
    expect(repoMock.save).toHaveBeenCalled();
  });

  it('should throw BadRequestException if file not PDF', async () => {
    const file: any = {
      originalname: 'file.txt',
      mimetype: 'text/plain',
      size: 100,
      buffer: Buffer.from('data'),
    };

    await expect(useCase.execute(file, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
