import type { FC } from 'react';
import { Card, Typography, Button, Tag, Space, Spin } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { palette } from '../../theme';
import useExtractedData from '../../hooks/useExtractedData';

const { Title, Paragraph } = Typography;

interface ChunksViewerProps {
  documentId: string;
}

export const ChunksViewer: FC<ChunksViewerProps> = ({ documentId }) => {
  const { chunks = [], loading, error, generateEmbeddings } = useExtractedData(documentId);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <Spin />
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px' }}>
      <Typography.Text type="danger">{error}</Typography.Text>
    </div>
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5}>Chunks Semánticos</Title>
        <Button 
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={() => generateEmbeddings()}
          loading={loading}
        >
          Generar Embeddings
        </Button>
      </div>
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {chunks.map((chunk: { id?: string; content: string; metadata?: { pageNumber?: number; section?: string }; embedding?: number[] }, index: number) => (
          <Card 
            key={chunk.id || `chunk-${index}`}
            size="small"
            style={{ backgroundColor: palette.neutral50 }}
          >
            <Space style={{ marginBottom: 8 }}>
              <Tag color="blue">{`Chunk ${index + 1}`}</Tag>
              {chunk.metadata?.pageNumber && (
                <Tag color="cyan">{`Página ${chunk.metadata.pageNumber}`}</Tag>
              )}
              {chunk.metadata?.section && (
                <Tag color="purple">{chunk.metadata.section}</Tag>
              )}
              {chunk.embedding && (
                <Tag color="green">Embedding generado</Tag>
              )}
            </Space>
            <div style={{
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 4,
              border: `1px solid ${palette.neutral300}`
            }}>
              <Paragraph
                style={{
                  whiteSpace: 'pre-wrap',
                  margin: 0
                }}
              >
                {chunk.content}
              </Paragraph>
            </div>
          </Card>
        ))}
      </Space>
    </Space>
  );
};