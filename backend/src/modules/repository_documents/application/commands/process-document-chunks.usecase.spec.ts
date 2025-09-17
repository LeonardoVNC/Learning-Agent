import { ProcessDocumentChunksUseCase } from './process-document-chunks.usecase';
import { Logger, NotFoundException } from '@nestjs/common';

describe('ProcessDocumentChunksUseCase', () => {
  let useCase: ProcessDocumentChunksUseCase;
  let repoMock: any;
  let chunkingServiceMock: any;

  beforeEach(() => {
    repoMock = { findById: jest.fn() };
    chunkingServiceMock = {
      processDocumentChunks: jest.fn(),
      hasProcessedChunks: jest.fn(),
    };

    useCase = new ProcessDocumentChunksUseCase(repoMock, chunkingServiceMock);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should process chunks successfully', async () => {
    const doc = { extractedText: 'text', status: 'PROCESSED' };
    repoMock.findById.mockResolvedValue(doc);
    const resultMock = {
      status: 'success',
      savedChunks: [1, 2],
      processingTimeMs: 100,
      chunkingResult: {
        statistics: {
          averageChunkSize: 50,
          minChunkSize: 10,
          maxChunkSize: 100,
          actualOverlapPercentage: 0,
        },
      },
    };
    chunkingServiceMock.processDocumentChunks.mockResolvedValue(resultMock);

    const result = await useCase.execute({ documentId: 'doc-1' });
    expect(result.status).toBe('success');
  });

  it('should return error if document not found', async () => {
    repoMock.findById.mockResolvedValue(null);

    const result = await useCase.execute({ documentId: 'doc-1' });
    expect(result.status).toBe('error');
  });
});
