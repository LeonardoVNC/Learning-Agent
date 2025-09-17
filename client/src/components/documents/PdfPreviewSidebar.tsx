import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Spin, Alert, Grid, theme as antTheme } from 'antd';
import { CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import { useThemeStore } from '../../store/themeStore';
import type { Document } from '../../interfaces/documentInterface';
import { documentService } from '../../services/documents.service';
import { palette } from '../../theme';

const { Title, Text } = Typography;

interface PdfPreviewSidebarProps {
  document: Document | null;
  onClose: () => void;
  visible: boolean;
  sidebarWidth?: string;
}

const { useBreakpoint } = Grid;

export const PdfPreviewSidebar: React.FC<PdfPreviewSidebarProps> = ({
  document,
  onClose,
  visible,
  sidebarWidth = '50%'
}) => {
  const screens = useBreakpoint();
  const isSmallScreen = !screens.lg;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Theme
  const theme = useThemeStore((state: { theme: string }) => state.theme);
  const isDark = theme === "dark";
  const { token } = antTheme.useToken();

  const loadPdfUrl = useCallback(async () => {
    if (!document) return;

    setLoading(true);
    setError(null);
    
    try {
      const signedUrl = await documentService.getDownloadUrl(document.id);
      setPdfUrl(signedUrl);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Error al cargar el PDF para previsualización');
    } finally {
      setLoading(false);
    }
  }, [document]);

  useEffect(() => {
    if (document && visible) {
      loadPdfUrl();
    } else {
      setPdfUrl(null);
      setError(null);
    }
  }, [document, visible, loadPdfUrl]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: sidebarWidth,
        height: '100vh',
        backgroundColor: isDark ? token.colorBgContainer : palette.white,
        boxShadow: isDark ? '-4px 0 20px rgba(91, 110, 240, 0.1)' : '-4px 0 20px rgba(0, 0, 0, 0.15)',
        zIndex: isSmallScreen ? 1050 : 1000,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${isDark ? token.colorBorder : palette.neutral500}`,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isSmallScreen ? '12px 16px' : '16px 20px',
          borderBottom: `1px solid ${isDark ? token.colorBorder : palette.neutral500}`,
          backgroundColor: isDark ? token.colorBgElevated : palette.neutral200,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          minWidth: 0,
          flex: 1
        }}>
          <FileTextOutlined style={{ 
            color: isDark ? token.colorPrimary : palette.P0,
            fontSize: isSmallScreen ? '16px' : '18px',
            flexShrink: 0
          }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Title 
              level={5} 
              style={{ 
                margin: 0, 
                color: isDark ? token.colorPrimary : palette.P0,
                fontSize: isSmallScreen ? '14px' : '16px'
              }}
            >
              Previsualización de PDF
            </Title>
            {document && (
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: isSmallScreen ? '11px' : '12px',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={document.originalName}
              >
                {document.originalName}
              </Text>
            )}
          </div>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            color: palette.neutral600,
            fontSize: isSmallScreen ? '14px' : '16px',
            padding: isSmallScreen ? '2px' : '4px',
            flexShrink: 0
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: isSmallScreen ? '12px' : '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              flexDirection: isSmallScreen ? 'column' : 'row',
              gap: isSmallScreen ? '8px' : '12px'
            }}
          >
            <Spin size={isSmallScreen ? "default" : "large"} />
            <Text style={{ 
              fontSize: isSmallScreen ? '14px' : '16px',
              textAlign: 'center'
            }}>
              Cargando PDF...
            </Text>
          </div>
        )}

        {error && (
          <Alert
            message="Error de previsualización"
            description={error}
            type="error"
            showIcon
            style={{ 
              marginBottom: '16px',
              fontSize: isSmallScreen ? '12px' : '14px'
            }}
          />
        )}

        {pdfUrl && !loading && !error && (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: isSmallScreen ? '4px' : '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
            title={`PDF Preview: ${document?.originalName}`}
          />
        )}

        {!document && !loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: palette.neutral800,
              textAlign: 'center',
              padding: isSmallScreen ? '20px' : '0'
            }}
          >
            <Text style={{ fontSize: isSmallScreen ? '14px' : '16px' }}>
              Selecciona un documento para previsualizar
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};