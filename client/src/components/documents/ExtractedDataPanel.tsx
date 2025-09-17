import type { FC } from 'react';
import { Card, Typography, Button, Row, Col, Space, Statistic } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { palette } from '../../theme';

const { Title, Text, Paragraph } = Typography;

interface ExtractedDataPanelProps {
  documentId: string;
}

export const ExtractedDataPanel: FC<ExtractedDataPanelProps> = ({ documentId }) => {
  // Datos hardcodeados para demostración
  const mockData = {
    metadata: {
      title: "Introducción a la Inteligencia Artificial",
      author: "Dr. Juan Pérez",
      pages: 42,
      fileType: "PDF",
      uploadDate: "2025-08-31",
      fileName: documentId
    },
    statistics: {
      wordCount: 12458,
      charCount: 68234,
      chunkCount: 24
    },
    extractedData: `La Inteligencia Artificial (IA) es una rama de la informática que busca crear sistemas capaces de realizar tareas que normalmente requieren inteligencia humana.

Estos sistemas pueden incluir:
• Aprendizaje automático
• Procesamiento del lenguaje natural
• Visión por computadora
• Robótica

La IA se ha convertido en una tecnología transformadora que está revolucionando diversos sectores, desde la medicina hasta la educación.

Este documento explora los fundamentos básicos de la IA, sus aplicaciones actuales y su potencial impacto en el futuro de la sociedad.

[Contenido truncado para demostración...]`
  };

  const handleExport = () => {
    const blob = new Blob([mockData.extractedData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mockData.metadata.title || mockData.metadata.fileName || 'documento'}_extraido.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 16 }}>
      <Card title={<Title level={5}>Metadatos del Documento</Title>}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text strong>Título: </Text>
            <Text>{mockData.metadata.title || 'No disponible'}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Autor: </Text>
            <Text>{mockData.metadata.author || 'No disponible'}</Text>
          </Col>
          <Col span={8}>
            <Text strong>Páginas: </Text>
            <Text>{mockData.metadata.pages || 'N/A'}</Text>
          </Col>
          <Col span={8}>
            <Text strong>Tipo de archivo: </Text>
            <Text>{mockData.metadata.fileType || 'N/A'}</Text>
          </Col>
          <Col span={8}>
            <Text strong>Fecha de carga: </Text>
            <Text>{mockData.metadata.uploadDate || 'N/A'}</Text>
          </Col>
        </Row>
      </Card>

      <Card title={<Title level={5}>Estadísticas de Extracción</Title>}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic 
              title="Palabras" 
              value={mockData.statistics.wordCount} 
              formatter={value => value.toLocaleString()} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Caracteres" 
              value={mockData.statistics.charCount} 
              formatter={value => value.toLocaleString()} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Chunks generados" 
              value={mockData.statistics.chunkCount} 
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={<Title level={5}>Texto Extraído</Title>}
        extra={
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
          >
            Exportar Texto
          </Button>
        }
      >
        <div style={{ 
          maxHeight: 400, 
          overflow: 'auto', 
          padding: 16, 
          backgroundColor: palette.neutral50, 
          border: `1px solid ${palette.neutral300}`, 
          borderRadius: 4 
        }}>
          <Paragraph
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}
          >
            {mockData.extractedData}
          </Paragraph>
        </div>
      </Card>
    </Space>
  );
};