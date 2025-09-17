import { GetDocumentContentUseCase } from './get-document-content.usecase';

describe('GetDocumentContentUseCase', () => {
  let useCase: GetDocumentContentUseCase;
  let mockDocumentRepository: any;

  beforeEach(() => {
    mockDocumentRepository = {
      findById: jest.fn(),
    };

    useCase = new GetDocumentContentUseCase(
      mockDocumentRepository,
    );
  });

  it('obtiene contenido de documento exitosamente', async () => {
    const mockDocument = {
      id: 'doc1',
      extractedText: 'Este es el contenido del documento',
      pageCount: 5,
      documentTitle: 'Documento de prueba'
    };
    
    mockDocumentRepository.findById.mockResolvedValue(mockDocument);

    const result = await useCase.execute({
      docId: 'doc1',
    });

    expect(result.contenido).toBe('Este es el contenido del documento');
    expect(result.metadata.paginas).toBe(5);
  });

  it('lanza error cuando documento no existe', async () => {
    mockDocumentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({
      docId: 'nonexistent',
    })).rejects.toThrow('Documento con ID nonexistent no encontrado');
  });

  it('lanza error cuando documento no tiene texto extraído', async () => {
    const mockDocument = {
      id: 'doc1',
      extractedText: null, // Sin texto extraído
      pageCount: 5
    };
    
    mockDocumentRepository.findById.mockResolvedValue(mockDocument);

    await expect(useCase.execute({
      docId: 'doc1',
    })).rejects.toThrow('no tiene contenido de texto extraído');
  });

  it('maneja documentos sin pageCount', async () => {
    const mockDocument = {
      id: 'doc1',
      extractedText: 'Contenido sin pageCount',
      pageCount: null // Sin pageCount
    };
    
    mockDocumentRepository.findById.mockResolvedValue(mockDocument);

    const result = await useCase.execute({
      docId: 'doc1',
    });

    expect(result.contenido).toBe('Contenido sin pageCount');
    expect(result.metadata.paginas).toBeUndefined();
  });

  it('maneja errores inesperados', async () => {
    mockDocumentRepository.findById.mockRejectedValue(
      new Error('Error de base de datos'),
    );

    await expect(useCase.execute({
      docId: 'doc1',
    })).rejects.toThrow('Error al obtener contenido del documento');
  });
});