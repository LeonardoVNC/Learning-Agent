import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Button,
  Typography,
  Alert,
  Tabs,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Tag,
  Tooltip,
  message,
  Skeleton,
  Empty,
  Progress,
  Drawer,
  Grid,
  theme as antTheme
} from 'antd';
import {
  CloseOutlined,
  FileTextOutlined,
  SyncOutlined,
  CopyOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useThemeStore } from '../../store/themeStore';
import { palette } from '../../theme';
import type { Document, DocumentExtractedData } from '../../interfaces/documentInterface';
import { useDocuments } from '../../hooks/useDocuments';

const { Title, Text, Paragraph } = Typography;

// Traducciones directas de status
const getStatusInSpanish = (status: string): string => {
  switch (status) {
    case 'GENERATING': return 'Generando';
    case 'GENERATED': return 'Generado';
    case 'ERROR': return 'Error';
    default: return status;
  }
};
const { TabPane } = Tabs;
const { useBreakpoint } = Grid;

// Constants
const MIN_DRAWER_HEIGHT = 220;
const MAX_DRAWER_HEIGHT_RATIO = 0.98;
const INITIAL_DRAWER_HEIGHT_RATIO = 0.75;

interface DocumentDataSidebarProps {
  document: Document | null;
  onClose: () => void;
  visible: boolean;
}

export const DocumentDataSidebar: React.FC<DocumentDataSidebarProps> = ({ document, onClose, visible }) => {
  const { getDocumentExtractedData, getDocumentIndex, generateDocumentIndex, extractedDataLoading, extractedDataError } = useDocuments();

  const theme = useThemeStore((state: { theme: string }) => state.theme);
  const isDark = theme === 'dark';
  const { token } = antTheme.useToken();

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // bottom-sheet (mobile)
  const initialHeight = Math.round(window.innerHeight * INITIAL_DRAWER_HEIGHT_RATIO);
  const [drawerHeight, setDrawerHeight] = useState<number>(initialHeight);

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(drawerHeight);

  // extracted data state
  const [extractedData, setExtractedData] = useState<DocumentExtractedData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('metadata');
  const [retryCount, setRetryCount] = useState<number>(0);

  // index state
  const [indexData, setIndexData] = useState<any>(null);
  const [indexLoading, setIndexLoading] = useState<boolean>(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  
  // Cache para índices por documento ID para evitar recargas innecesarias
  const indexCacheRef = useRef<Map<string, any>>(new Map());

  const documentId = document?.id;
  const isLoading = documentId ? extractedDataLoading[documentId] || false : false;
  const error = documentId ? extractedDataError[documentId] || null : null;

  const loadExtractedData = useCallback(async () => {
    if (!document?.id) {
      setExtractedData(null);
      return;
    }
    try {
      const data = await getDocumentExtractedData(document.id);
      setExtractedData(data);
    } catch (err) {
      console.error('Error loading extracted data:', err);
    }
  }, [document?.id, getDocumentExtractedData]);

  // Index functions con cache optimizado
  const loadIndexData = useCallback(async () => {
    if (!document?.id) {
      console.log('No document ID, setting indexData to null');
      setIndexData(null);
      return;
    }

    // Verificar si ya tenemos el índice en cache
    const cachedIndex = indexCacheRef.current.get(document.id);
    if (cachedIndex) {
      console.log('Index loaded from cache for document:', document.id);
      setIndexData(cachedIndex);
      return;
    }

    setIndexLoading(true);
    setIndexError(null);
    
    try {
      const data = await getDocumentIndex(document.id);
      console.log('Index data loaded from API:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Error desconocido al cargar el índice');
      }
      
      // Guardar en cache
      indexCacheRef.current.set(document.id, data);
      setIndexData(data);
      
    } catch (err: any) {
      
      let errorMessage = 'Error al cargar el índice';
      
      if (err?.response?.status === 404) {
        // Si es 404, probablemente no existe índice aún
        console.log('Index not found, this is normal for documents without generated index');
        setIndexData(null);
        setIndexError(null);
        return;
      } else if (err?.response?.status === 400) {
        errorMessage = 'Documento no válido';
      } else if (err?.response?.status === 500) {
        errorMessage = 'Error interno del servidor';
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setIndexError(errorMessage);
      
    } finally {
      setIndexLoading(false);
    }
  }, [document?.id, getDocumentIndex]);

  const handleGenerateIndex = useCallback(async () => {
    if (!document?.id) {
      message.error('No se ha seleccionado un documento');
      return;
    }
    
    setIndexLoading(true);
    setIndexError(null);
    
    // Mostrar mensaje de progreso
    message.info('Generando índice del documento... Esto puede tomar unos minutos.');
    
    try {
      // Crear un timeout para la operación
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: La generación del índice está tomando demasiado tiempo')), 120000) // 2 minutos
      );
      
      const generatePromise = generateDocumentIndex(document.id);
      
      // Ejecutar con timeout
      const generateResult = await Promise.race([generatePromise, timeoutPromise]) as any;
      console.log('Generate result:', generateResult);
      
      // Verificar si la generación fue exitosa
      if (!generateResult?.success) {
        throw new Error(generateResult?.message || 'Error desconocido al generar el índice');
      }
      
      // Invalidar cache para este documento ya que se generó un nuevo índice
      if (document?.id) {
        indexCacheRef.current.delete(document.id);
      }
      
      // Recargar datos del índice después de generar
      await loadIndexData();
      message.success('Índice generado exitosamente');
      
    } catch (err: any) {
      console.error('Error generating index:', err);
      
      // Determinar el mensaje de error más específico
      let errorMessage = 'Error al generar el índice';
      
      if (err?.message?.includes('Timeout')) {
        errorMessage = 'La generación del índice está tomando demasiado tiempo. Inténtalo más tarde.';
      } else if (err?.response?.status === 400) {
        errorMessage = 'El documento no es válido para generar índice';
      } else if (err?.response?.status === 404) {
        errorMessage = 'Documento no encontrado';
      } else if (err?.response?.status === 409) {
        errorMessage = 'Ya hay una generación de índice en proceso';
      } else if (err?.response?.status === 422) {
        errorMessage = 'El documento no tiene suficiente contenido para generar un índice';
      } else if (err?.response?.status === 500) {
        errorMessage = 'Error interno del servidor al generar el índice';
      } else if (err?.response?.status === 503) {
        errorMessage = 'Servicio temporalmente no disponible';
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setIndexError(errorMessage);
      message.error(errorMessage);
      
    } finally {
      setIndexLoading(false);
    }
  }, [document?.id, generateDocumentIndex, loadIndexData]);

  // Función para procesar los chapters en elementos planos con useMemo para optimización
  const processFlatIndex = useCallback((chapters: any[]) => {
    const flatItems: any[] = [];
    
    chapters.forEach((chapter, chapterIndex) => {
      // Agregar el capítulo principal
      flatItems.push({
        id: `chapter-${chapterIndex}`,
        title: chapter.title,
        description: chapter.description,
        level: 1,
        type: 'chapter'
      });
      
      // Agregar subtemas
      if (chapter.subtopics && chapter.subtopics.length > 0) {
        chapter.subtopics.forEach((subtopic: any, subtopicIndex: number) => {
          flatItems.push({
            id: `subtopic-${chapterIndex}-${subtopicIndex}`,
            title: subtopic.title,
            description: subtopic.description,
            level: 2,
            type: 'subtopic'
          });
        });
      }
      
      // Agregar ejercicios
      if (chapter.exercises && chapter.exercises.length > 0) {
        chapter.exercises.forEach((exercise: any, exerciseIndex: number) => {
          flatItems.push({
            id: `exercise-${chapterIndex}-${exerciseIndex}`,
            title: exercise.title,
            description: exercise.description,
            difficulty: exercise.difficulty,
            estimatedTime: exercise.estimatedTime,
            keywords: exercise.keywords,
            level: 3,
            type: exercise.type || 'exercise'
          });
        });
      }
    });
    
    return flatItems;
  }, []);

  // Memoizar el índice procesado para evitar recalcular en cada render
  const processedIndexItems = useMemo(() => {
    if (!indexData?.data?.chapters || !Array.isArray(indexData.data.chapters)) {
      return [];
    }
    return processFlatIndex(indexData.data.chapters);
  }, [indexData?.data?.chapters, processFlatIndex]);

  // Memoizar estadísticas del índice para evitar recálculos
  const indexStats = useMemo(() => {
    if (!indexData?.data?.chapters) return { chapters: 0, subtopics: 0, exercises: 0 };
    
    const chapters = indexData.data.chapters.length;
    const subtopics = indexData.data.chapters.reduce((acc: number, chapter: any) => 
      acc + (chapter.subtopics ? chapter.subtopics.length : 0), 0);
    const exercises = indexData.data.chapters.reduce((acc: number, chapter: any) => {
      const chapterExercises = chapter.exercises ? chapter.exercises.length : 0;
      const subtopicExercises = chapter.subtopics ? 
        chapter.subtopics.reduce((subAcc: number, subtopic: any) => 
          subAcc + (subtopic.exercises ? subtopic.exercises.length : 0), 0) : 0;
      return acc + chapterExercises + subtopicExercises;
    }, 0);
    
    return { chapters, subtopics, exercises };
  }, [indexData?.data?.chapters]);

  useEffect(() => {
    if (document?.id && visible) {
      loadExtractedData();
      // Siempre cargar datos del índice cuando se cambie a esa pestaña
      if (activeTab === 'index') {
        console.log('Changing to index tab, loading index data...');
        loadIndexData();
      }
    } else {
      setExtractedData(null);
      setIndexData(null);
      setIndexError(null);
    }
  }, [document?.id, visible, activeTab, loadExtractedData, loadIndexData]);

  // copy to clipboard util
  const copyToClipboard = useCallback(async (text: string, label = 'Texto') => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} copiado al portapapeles`);
    } catch {
      message.error('Error al copiar al portapapeles');
    }
  }, []);

  const retryLoadData = useCallback(async () => {
    if (!document?.id) return;
    setRetryCount((p) => p + 1);
    try {
      const data = await getDocumentExtractedData(document.id);
      setExtractedData(data);
      message.success('Datos recargados exitosamente');
    } catch (err) {
      console.error('Error reloading data:', err);
      message.error('Error al recargar los datos');
    }
  }, [document?.id, getDocumentExtractedData]);

  // Resize and drag handlers for mobile drawer
  useEffect(() => {
    const onResize = () => {
      const newMax = Math.round(window.innerHeight * MAX_DRAWER_HEIGHT_RATIO);
      setDrawerHeight((h) => Math.max(MIN_DRAWER_HEIGHT, Math.min(newMax, h)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = drawerHeight;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY; 
      const candidate = Math.round(startHeightRef.current + delta);
      const bounded = Math.max(MIN_DRAWER_HEIGHT, Math.min(Math.round(window.innerHeight * MAX_DRAWER_HEIGHT_RATIO), candidate));
      setDrawerHeight(bounded);
    };

    const onPointerUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [drawerHeight]);

  // ui
  const Header = (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${isDark ? token.colorBorder : palette.neutral200}`,
        backgroundColor: isDark ? token.colorBgElevated : palette.neutral50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <FileTextOutlined style={{ color: isDark ? token.colorPrimary : palette.P0, fontSize: 18, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <Title level={5} style={{ margin: 0, color: isDark ? token.colorPrimary : palette.P0 }}>
            Datos del Documento
          </Title>
          {document && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', maxWidth: isMobile ? 200 : 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {document.originalName}
            </Text>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} style={{ color: palette.neutral600, fontSize: 16, padding: 6 }} />
      </div>
    </div>
  );

  const Body = (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 16, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {isLoading && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>
            <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>
            <Card>
              <Skeleton.Button active style={{ width: 200, height: 40 }} />
              <Skeleton active paragraph={{ rows: 4, style: { marginTop: 16 } }} />
            </Card>
          </Space>
        )}

        {error && (
          <Alert
            message="Error al cargar datos"
            description={<Space direction="vertical" style={{ width: '100%' }}><Text>{error}</Text>{retryCount > 0 && <Text type="secondary">Intentos de recarga: {retryCount}</Text>}</Space>}
            type="error"
            showIcon
            action={<Button size="small" icon={<ReloadOutlined />} onClick={retryLoadData} loading={isLoading}>Reintentar</Button>}
            style={{ marginBottom: 16 }}
          />
        )}

        {extractedData && !isLoading && !error && (
          <>
            <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarStyle={{ padding: 0, marginBottom: 8 }}>
              <TabPane tab="Metadatos" key="metadata">
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card title={<Title level={5}>Información del Archivo</Title>}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}><Text strong>Título: </Text><Text>{extractedData.metadata.title || 'No disponible'}</Text></Col>
                      <Col span={12}><Text strong>Autor: </Text><Text>{extractedData.metadata.author || 'No disponible'}</Text></Col>
                      <Col span={8}><Text strong>Tipo: </Text><Text>{extractedData.metadata.fileType || 'N/A'}</Text></Col>
                      <Col span={8}><Text strong>Tamaño: </Text><Text>{extractedData.metadata.size ? `${(extractedData.metadata.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</Text></Col>
                      <Col span={8}><Text strong>Fecha: </Text><Text>{extractedData.metadata.uploadDate || 'N/A'}</Text></Col>
                    </Row>
                  </Card>

                  <Card title={<Title level={5}>Estadísticas de Procesamiento</Title>}>
                    <Row gutter={16}>
                      <Col span={12}><Statistic title="Total de Chunks" value={extractedData.statistics.chunkCount} /></Col>
                      <Col span={12}><Statistic title="Contenido Total (caracteres)" value={extractedData.statistics.totalContentLength || 0} formatter={(v) => (v as number).toLocaleString()} /></Col>
                    </Row>

                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8}><Statistic title="Chunk Promedio" value={extractedData.statistics.averageChunkSize || 0} formatter={(v) => (v as number).toLocaleString()} suffix="chars" /></Col>
                      <Col span={8}><Statistic title="Chunk Mínimo" value={extractedData.statistics.minChunkSize || 0} formatter={(v) => (v as number).toLocaleString()} suffix="chars" /></Col>
                      <Col span={8}><Statistic title="Chunk Máximo" value={extractedData.statistics.maxChunkSize || 0} formatter={(v) => (v as number).toLocaleString()} suffix="chars" /></Col>
                    </Row>

                    <div style={{ marginTop: 24 }}>
                      <Title level={5} style={{ fontSize: 14, marginBottom: 8 }}>Distribución de Tamaños</Title>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, minWidth: 60 }}>Mínimo</Text>
                        <Progress percent={extractedData.statistics.minChunkSize && extractedData.statistics.maxChunkSize ? Math.round((extractedData.statistics.minChunkSize / extractedData.statistics.maxChunkSize) * 100) : 0} size="small" strokeColor={palette.red} style={{ flex: 1 }} format={() => `${extractedData.statistics.minChunkSize || 0}`} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, minWidth: 60 }}>Promedio</Text>
                        <Progress percent={extractedData.statistics.averageChunkSize && extractedData.statistics.maxChunkSize ? Math.round((extractedData.statistics.averageChunkSize / extractedData.statistics.maxChunkSize) * 100) : 0} size="small" strokeColor={palette.blue} style={{ flex: 1 }} format={() => `${Math.round(extractedData.statistics.averageChunkSize || 0)}`} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, minWidth: 60 }}>Máximo</Text>
                        <Progress percent={100} size="small" strokeColor={palette.green} style={{ flex: 1 }} format={() => `${extractedData.statistics.maxChunkSize || 0}`} />
                      </div>
                    </div>
                  </Card>
                </Space>
              </TabPane>

              <TabPane tab="Índice" key="index">
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {indexLoading && (
                    <Card>
                      <Skeleton active paragraph={{ rows: 4 }} />
                    </Card>
                  )}

                  {indexError && !indexLoading && (
                    <Alert
                      message="Error con el índice del documento"
                      description={
                        <div>
                          <p>{indexError}</p>
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              • Verifica que el documento esté completamente procesado<br/>
                              • Algunos tipos de documento pueden no ser compatibles<br/>
                              • Si el problema persiste, contacta al administrador
                            </Text>
                          </div>
                        </div>
                      }
                      type="error"
                      showIcon
                      action={
                        <Space direction="vertical" size="small">
                          <Button size="small" icon={<ReloadOutlined />} onClick={loadIndexData} loading={indexLoading}>
                            Reintentar Carga
                          </Button>
                          <Button size="small" icon={<SyncOutlined />} onClick={handleGenerateIndex} loading={indexLoading}>
                            Generar Índice
                          </Button>
                        </Space>
                      }
                    />
                  )}

                  {(!indexData?.data?.chapters || indexData?.data?.chapters?.length === 0) && !indexLoading && !indexError && (
                    <Card>
                      <Empty 
                        description="No se ha generado el índice para este documento"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                      <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Button 
                          type="primary" 
                          icon={<SyncOutlined />} 
                          onClick={handleGenerateIndex}
                          loading={indexLoading}
                          size="large"
                        >
                          Generar Índice
                        </Button>
                      </div>
                    </Card>
                  )}

                  {indexData?.data?.chapters && indexData?.data?.chapters?.length > 0 && !indexLoading && (
                    <>
                      <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <Title level={5} style={{ margin: 0 }}>
                            Estructura del Documento ({indexStats.chapters} capítulos, {indexStats.subtopics} subtemas, {indexStats.exercises} ejercicios)
                          </Title>
                          <Button 
                            icon={<SyncOutlined />} 
                            onClick={handleGenerateIndex}
                            loading={indexLoading}
                            size="small"
                          >
                            Regenerar
                          </Button>
                        </div>
                        
                        <Row gutter={16}>
                          <Col span={8}>
                            <Statistic 
                              title="Capítulos" 
                              value={indexStats.chapters} 
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic 
                              title="Subtemas" 
                              value={indexStats.subtopics} 
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic 
                              title="Ejercicios" 
                              value={indexStats.exercises} 
                            />
                          </Col>
                        </Row>
                        
                        <Row gutter={16} style={{ marginTop: 16 }}>
                          <Col span={12}>
                            <Statistic 
                              title="Generado" 
                              value={indexData.data.generatedAt ? new Date(indexData.data.generatedAt).toLocaleDateString() : 'N/A'} 
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic 
                              title="Estado" 
                              value={getStatusInSpanish(indexData.data.status || 'GENERATED')}
                            />
                          </Col>
                        </Row>
                      </Card>

                      <Card title={<Title level={5}>Índice de Contenidos</Title>}>
                        <div style={{ maxHeight: isMobile ? 300 : 400, overflowY: 'auto', paddingRight: 8 }}>
                          {processedIndexItems.map((item: any, index: number) => (
                            <div 
                              key={item.id || index}
                              style={{
                                paddingLeft: (item.level - 1) * 20,
                                marginBottom: 8,
                                borderBottom: `1px solid ${palette.neutral300}`,
                                paddingBottom: 8,
                                cursor: 'pointer',
                                borderRadius: 4,
                                padding: '8px 12px',
                                backgroundColor: isDark ? token.colorBgElevated : palette.neutral50,
                                border: `1px solid ${isDark ? token.colorBorder : palette.neutral300}`,
                              }}
                              onClick={() => item.description && copyToClipboard(item.description, `Contenido de ${item.type}`)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <Tag color={
                                  item.type === 'chapter' ? 'blue' : 
                                  item.type === 'subtopic' ? 'green' : 
                                  item.type === 'CONCEPTUAL' ? 'orange' :
                                  item.type === 'ANALYSIS' ? 'purple' :
                                  'default'
                                }>
                                  {item.type === 'chapter' ? 'Capítulo' : 
                                   item.type === 'subtopic' ? 'Subtema' : 
                                   item.type === 'CONCEPTUAL' ? 'Conceptual' :
                                   item.type === 'PRACTICAL' ? 'Práctico' :
                                   item.type === 'ANALYSIS' ? 'Análisis' :
                                   item.type === 'APPLICATION' ? 'Aplicación' :
                                   item.type === 'PROBLEM_SOLVING' ? 'Resolución' :
                                   item.type || 'Ejercicio'}
                                </Tag>
                                <Text strong style={{ fontSize: isMobile ? 13 : 14, flex: 1 }}>
                                  {item.title}
                                </Text>
                                {item.difficulty && (
                                  <Tag color={
                                    item.difficulty === 'BASIC' ? 'green' :
                                    item.difficulty === 'INTERMEDIATE' ? 'orange' : 
                                    item.difficulty === 'ADVANCED' ? 'red' :
                                    'default'
                                  } style={{ fontSize: isMobile ? 11 : 12 }}>
                                    {item.difficulty === 'BASIC' ? 'Básico' :
                                     item.difficulty === 'INTERMEDIATE' ? 'Intermedio' :
                                     item.difficulty === 'ADVANCED' ? 'Avanzado' :
                                     item.difficulty}
                                  </Tag>
                                )}
                                {item.estimatedTime && (
                                  <Tag color="cyan" style={{ fontSize: isMobile ? 11 : 12 }}>
                                    {item.estimatedTime}
                                  </Tag>
                                )}
                                <Tooltip title="Copiar descripción">
                                  <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<CopyOutlined />}
                                  />
                                </Tooltip>
                              </div>
                              
                              {item.description && (
                                <Paragraph 
                                  style={{ 
                                    marginTop: 8, 
                                    marginBottom: 0,
                                    fontSize: isMobile ? 12 : 13,
                                    color: isDark ? token.colorTextSecondary : palette.neutral600,
                                  }}
                                  ellipsis={{ 
                                    rows: 2, 
                                    expandable: true, 
                                    symbol: 'ver más' 
                                  }}
                                >
                                  {item.description}
                                </Paragraph>
                              )}
                              
                              {item.keywords && item.keywords.length > 0 && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  <Text style={{ fontSize: 12, color: isDark ? token.colorTextSecondary : palette.neutral500 }}>
                                    Palabras clave:
                                  </Text>
                                  {item.keywords.map((keyword: string, kIndex: number) => (
                                    <Tag key={kIndex} color="geekblue" style={{ fontSize: 11 }}>
                                      {keyword}
                                    </Tag>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    </>
                  )}
                </Space>
              </TabPane>
            </Tabs>
          </>
        )}

        {!extractedData && !isLoading && !error && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: palette.neutral500, padding: 20, textAlign: 'center' }}>
            <Space direction="vertical">
              <FileTextOutlined style={{ fontSize: 48, color: palette.neutral300 }} />
              <Text style={{ fontSize: 16 }}>Selecciona un documento para ver sus datos</Text>
              <Text type="secondary" style={{ fontSize: 14 }}>Usa el botón "Datos" en la tabla de documentos</Text>
            </Space>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: bottom-sheet Drawer
  if (isMobile) {
    return (
      <Drawer
        open={visible}
        onClose={onClose}
        placement="bottom"
        height={drawerHeight}
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        drawerStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '100vh' }}
        maskClosable
        closeIcon={null}
        headerStyle={{ display: 'none' }}
      >
        <div
          onPointerDown={onHandlePointerDown}
          style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 6, touchAction: 'none', cursor: 'ns-resize', userSelect: 'none' }}
        >
          <div style={{ width: 40, height: 6, borderRadius: 4, background: palette.neutral300 }} />
        </div>

        {Header}
        {Body}
      </Drawer>
    );
  }

  // Desktop / tablet
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '50%',
        height: '100vh',
        backgroundColor: isDark ? token.colorBgContainer : palette.white,
        boxShadow: isDark ? '-4px 0 20px rgba(91, 110, 240, 0.1)' : '-4px 0 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${isDark ? token.colorBorder : palette.neutral200}`,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: 'transform 0.28s ease-in-out, opacity 0.28s ease-in-out, visibility 0.28s ease-in-out',
      }}
    >
      {Header}
      {Body}
    </div>
  );
};
