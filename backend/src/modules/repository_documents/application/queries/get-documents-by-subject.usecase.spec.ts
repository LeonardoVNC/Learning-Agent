import { GetDocumentsBySubjectUseCase } from './get-documents-by-subject.usecase';
import { ContractDocumentListItem } from '../../domain/entities/contract-document-list-item';

describe('GetDocumentsBySubjectUseCase', () => {
  let useCase: GetDocumentsBySubjectUseCase;
  let mockDocumentRepository: any;
  let mockDocumentStorage: any;

  beforeEach(() => {
    mockDocumentRepository = {
      findByCourseId: jest.fn(),
      countByCourseId: jest.fn(),
    };
    mockDocumentStorage = {
      documentExists: jest.fn(),
      generateDownloadUrl: jest.fn(),
    };

    useCase = new GetDocumentsBySubjectUseCase(
      mockDocumentRepository,
      mockDocumentStorage,
    );
  });

  it('obtiene documentos por materia exitosamente', async () => {
    const mockDocuments = [
      {
        id: 'doc1',
        fileName: 'file1.pdf',
        originalName: 'Documento 1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date('2023-01-01'),
        uploadedBy: 'user1'
      }
    ];
    
    mockDocumentRepository.findByCourseId.mockResolvedValue(mockDocuments);
    mockDocumentRepository.countByCourseId.mockResolvedValue(1);
    mockDocumentStorage.documentExists.mockResolvedValue(true);
    mockDocumentStorage.generateDownloadUrl.mockResolvedValue('http://download.url/file1.pdf');

    const result = await useCase.execute({
      materiaId: 'mat1',
      page: 1,
      limit: 10
    });

    expect(result.docs).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.docs[0]).toBeInstanceOf(ContractDocumentListItem);
    expect(result.docs[0].downloadUrl).toBe('http://download.url/file1.pdf');
  });

  it('filtra documentos que no existen en storage', async () => {
    const mockDocuments = [
      {
        id: 'doc1',
        fileName: 'file1.pdf',
        originalName: 'Documento 1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date('2023-01-01'),
        uploadedBy: 'user1'
      },
      {
        id: 'doc2',
        fileName: 'file2.pdf',
        originalName: 'Documento 2.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        uploadedAt: new Date('2023-01-02'),
        uploadedBy: 'user2'
      }
    ];
    
    mockDocumentRepository.findByCourseId.mockResolvedValue(mockDocuments);
    mockDocumentRepository.countByCourseId.mockResolvedValue(2);
    mockDocumentStorage.documentExists.mockImplementation((fileName) => 
      Promise.resolve(fileName === 'file1.pdf') // Solo existe file1.pdf
    );
    mockDocumentStorage.generateDownloadUrl.mockResolvedValue('http://download.url/file1.pdf');

    const result = await useCase.execute({
      materiaId: 'mat1',
    });

    expect(result.docs).toHaveLength(1);
    expect(result.docs[0].fileName).toBe('file1.pdf');
  });

  it('maneja paginación correctamente', async () => {
    const mockDocuments = Array(5).fill(0).map((_, i) => ({
      id: `doc${i + 1}`,
      fileName: `file${i + 1}.pdf`,
      originalName: `Documento ${i + 1}.pdf`,
      mimeType: 'application/pdf',
      size: 1024 * (i + 1),
      uploadedAt: new Date(`2023-01-${i + 1}`),
      uploadedBy: `user${i + 1}`
    }));
    
    mockDocumentRepository.findByCourseId.mockResolvedValue(mockDocuments.slice(0, 5));
    mockDocumentRepository.countByCourseId.mockResolvedValue(15);
    mockDocumentStorage.documentExists.mockResolvedValue(true);
    mockDocumentStorage.generateDownloadUrl.mockResolvedValue('http://download.url/file.pdf');

    const result = await useCase.execute({
      materiaId: 'mat1',
      page: 2,
      limit: 5
    });

    expect(result.docs).toHaveLength(5);
    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
  });

  it('filtra por tipo de documento', async () => {
    const mockDocuments = [
      {
        id: 'doc1',
        fileName: 'file1.pdf',
        originalName: 'Documento 1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date('2023-01-01'),
        uploadedBy: 'user1'
      }
    ];
    
    mockDocumentRepository.findByCourseId.mockResolvedValue(mockDocuments);
    mockDocumentRepository.countByCourseId.mockResolvedValue(1);
    mockDocumentStorage.documentExists.mockResolvedValue(true);
    mockDocumentStorage.generateDownloadUrl.mockResolvedValue('http://download.url/file1.pdf');

    const result = await useCase.execute({
      materiaId: 'mat1',
      tipo: 'pdf'
    });

    expect(result.docs).toHaveLength(1);
    // Verificar que se llamó al repositorio con el tipo correcto
    expect(mockDocumentRepository.findByCourseId).toHaveBeenCalledWith(
      'mat1', 0, 10, 'pdf'
    );
  });

  it('maneja errores al procesar documentos individuales', async () => {
    const mockDocuments = [
      {
        id: 'doc1',
        fileName: 'file1.pdf',
        originalName: 'Documento 1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date('2023-01-01'),
        uploadedBy: 'user1'
      },
      {
        id: 'doc2',
        fileName: 'file2.pdf',
        originalName: 'Documento 2.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        uploadedAt: new Date('2023-01-02'),
        uploadedBy: 'user2'
      }
    ];
    
    mockDocumentRepository.findByCourseId.mockResolvedValue(mockDocuments);
    mockDocumentRepository.countByCourseId.mockResolvedValue(2);
    mockDocumentStorage.documentExists.mockResolvedValue(true);
    mockDocumentStorage.generateDownloadUrl.mockImplementation((fileName) => {
      if (fileName === 'file2.pdf') {
        throw new Error('Error generando URL');
      }
      return 'http://download.url/file1.pdf';
    });

    const result = await useCase.execute({
      materiaId: 'mat1',
    });

    // Debería retornar solo el documento que se pudo procesar
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0].fileName).toBe('file1.pdf');
  });

  it('lanza error cuando falla la consulta principal', async () => {
    mockDocumentRepository.findByCourseId.mockRejectedValue(
      new Error('Error de base de datos'),
    );

    await expect(useCase.execute({
      materiaId: 'mat1',
    })).rejects.toThrow('Error al obtener documentos de la materia');
  });

  it('maneja caso sin documentos', async () => {
    mockDocumentRepository.findByCourseId.mockResolvedValue([]);
    mockDocumentRepository.countByCourseId.mockResolvedValue(0);

    const result = await useCase.execute({
      materiaId: 'mat1',
    });

    expect(result.docs).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});