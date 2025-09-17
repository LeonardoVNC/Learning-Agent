import React, { useState, useCallback, useRef } from 'react';
import { 
  Button, 
  Modal, 
  Upload, 
  Progress, 
  Typography, 
  Steps, 
  Alert, 
  message, 
  Grid, 
  theme as antTheme,
  Space,
  Card,
  Divider,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  CloudUploadOutlined, 
  PlusOutlined, 
  FileAddOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useThemeStore } from '../../store/themeStore';
import { chunkedUploadService } from '../../services/chunkedUpload.service';
import type { 
  ChunkedUploadProgress, 
  ChunkedUploadOptions, 
  ChunkedUploadResult 
} from '../../services/chunkedUpload.service';
import type { RcFile } from 'rc-upload/lib/interface';
import type { ButtonProps } from 'antd';

const { Dragger } = Upload;
const { Text, Title } = Typography;
const { Step } = Steps;
const { useBreakpoint } = Grid;

interface ProcessingStep {
  key: string;
  title: string;
  description: string;
}

interface FileConfig {
  accept: string;
  maxSize: number;
  validationMessage?: string;
  chunkSize?: number;
}

interface ProcessingConfig {
  steps: ProcessingStep[];
  processingText?: string;
  successText?: string;
}

interface ButtonConfig {
  showText?: boolean;
  width?: number;
  height?: number;
  variant?: 'fill' | 'ghost' | 'text' | 'link';
  size?: 'small' | 'middle' | 'large';
  shape?: 'default' | 'circle' | 'round';
  disabled?: boolean;
  className?: string;
}

interface ModalConfig {
  title?: string;
  width?: number;
}

interface ProcessingStepState extends ProcessingStep {
  status: 'wait' | 'process' | 'finish' | 'error';
}

interface UploadProgressInfo {
  uploadedBytes: number;
  totalBytes: number;
  speed: number;
  timeRemaining: number;
  chunksUploaded: number;
  totalChunks: number;
}

interface ChunkedUploadButtonProps {
  onPostUploadProcess?: (
    document: ChunkedUploadResult['document'],
    onProgress?: (step: string, progress: number, message: string) => void,
    uploadStatus?: string // Add parameter for upload status
  ) => Promise<unknown>;
  fileConfig: FileConfig;
  processingConfig: ProcessingConfig;
  buttonConfig?: ButtonConfig;
  modalConfig?: ModalConfig;
  onUploadStart?: (file: File) => void;
  onUploadSuccess?: (result: unknown) => void;
  onUploadError?: (error: Error) => void;
  onModalClose?: () => void;
  disabled?: boolean;
  courseId?: string;
  classId?: string;
}
const ChunkedUploadButton: React.FC<ChunkedUploadButtonProps> = ({
  onPostUploadProcess,
  fileConfig,
  processingConfig,
  buttonConfig = {},
  modalConfig = {},
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onModalClose,
  disabled = false,
  courseId,
  classId
}) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadProgressInfo, setUploadProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [processingSteps, setProcessingSteps] = useState<ProcessingStepState[]>([]);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  
  const uploadStartTime = useRef<number>(0);
  const lastProgressUpdate = useRef<number>(0);
  const speedHistory = useRef<number[]>([]);

  const screens = useBreakpoint();
  const isSmallScreen = !screens.lg;
  const { token } = antTheme.useToken();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Constants
  const BYTES_PER_MB = 1024 * 1024;

  const {
    showText = true,
    width,
    height,
    variant = 'fill',
    size = 'large',
    shape = 'default',
    disabled: buttonDisabled = false,
    className = ''
  } = buttonConfig;

  const {
    title = 'Upload New File',
    width: modalWidth = 700
  } = modalConfig;

  const {
    processingText = 'Processing file...',
    successText = 'File processed successfully!'
  } = processingConfig;

  const FIXED_COLOR = token.colorBgElevated === '#141d47' ? '#5b6ef0' : '#1A2A80';
  React.useEffect(() => {
    setProcessingSteps(
      processingConfig.steps.map(step => ({
        ...step,
        status: 'wait' as const
      }))
    );
  }, [processingConfig.steps]);

  const calculateUploadSpeed = useCallback((uploadedBytes: number): number => {
    const now = Date.now();
    if (uploadStartTime.current === 0) {
      uploadStartTime.current = now;
      return 0;
    }

    const timeDiff = (now - lastProgressUpdate.current) / 1000;
    if (timeDiff > 0) {
      const speed = uploadedBytes / ((now - uploadStartTime.current) / 1000);
      speedHistory.current.push(speed);
      
      if (speedHistory.current.length > 10) {
        speedHistory.current.shift();
      }
      
      const avgSpeed = speedHistory.current.reduce((sum, s) => sum + s, 0) / speedHistory.current.length;
      lastProgressUpdate.current = now;
      return avgSpeed;
    }
    
    return 0;
  }, []);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return 'Calculando...';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  const getButtonProps = (): ButtonProps => {
    const baseProps: ButtonProps = {
      icon: <CloudUploadOutlined />,
      size,
      shape,
      disabled: disabled || buttonDisabled || currentPhase === 'uploading' || currentPhase === 'processing',
      className,
      style: {
        width,
        height
      }
    };

    switch (variant) {
      case 'fill':
        return { ...baseProps, type: 'primary' };
      case 'ghost':
        return { ...baseProps, ghost: true };
      case 'text':
        return { ...baseProps, type: 'text' };
      case 'link':
        return { ...baseProps, type: 'link' };
      default:
        return { ...baseProps, type: 'default' };
    }
  };

  const validateFile = (file: File): string | null => {
    const acceptedTypes = fileConfig.accept.split(',').map(type => type.trim());
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isValidType) {
      return fileConfig.validationMessage || `Only these file types are allowed: ${fileConfig.accept}`;
    }

    if (file.size > fileConfig.maxSize) {
      const maxSizeMB = (fileConfig.maxSize / BYTES_PER_MB).toFixed(1);
      return `File is too large. Maximum allowed: ${maxSizeMB} MB`;
    }

    return null;
  };

  const handleButtonClick = useCallback(() => {
    setModalOpen(true);
    resetUploader();
  }, []);

  const handleUploadProgress = useCallback((progress: ChunkedUploadProgress) => {
    setUploadProgress(progress.progress);
    setCurrentStep(progress.message);
    
    if (progress.uploadedBytes && progress.totalBytes) {
      const speed = calculateUploadSpeed(progress.uploadedBytes);
      const timeRemaining = speed > 0 ? (progress.totalBytes - progress.uploadedBytes) / speed : 0;
      
      setUploadProgressInfo({
        uploadedBytes: progress.uploadedBytes,
        totalBytes: progress.totalBytes,
        speed,
        timeRemaining,
        chunksUploaded: 0,
        totalChunks: 0
      });
    }
  }, [calculateUploadSpeed]);

  const handleFileSelect = (file: RcFile): boolean => {
    const validationError = validateFile(file);
    if (validationError) {
      message.error(validationError);
      return false;
    }

    setSelectedFile(file);
    setError(null);
    onUploadStart?.(file);
    handleFileUpload(file);
    return false;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setCurrentPhase('uploading');
      setUploadProgress(0);
      setError(null);
      uploadStartTime.current = Date.now();
      lastProgressUpdate.current = Date.now();
      speedHistory.current = [];

      // Show warning for large files
      const fileSizeMB = file.size / BYTES_PER_MB;
      const largeFileThreshold = Number(import.meta.env.VITE_LARGE_FILE_THRESHOLD_MB) || 50;
      if (fileSizeMB > largeFileThreshold) {
        message.warning({
          content: `Archivo grande detectado (${fileSizeMB.toFixed(1)} MB). El procesamiento puede tomar varios minutos. Por favor no cierre esta ventana.`,
          duration: 8,
          style: { marginTop: '10vh' }
        });
      }

      const options: ChunkedUploadOptions = {
        chunkSize: fileConfig.chunkSize || Number(import.meta.env.VITE_DEFAULT_CHUNK_SIZE) || 2 * BYTES_PER_MB,
        maxRetries: 3,
        onProgress: handleUploadProgress,
        onChunkComplete: (chunkIndex, totalChunks) => {
          setUploadProgressInfo(prev => prev ? {
            ...prev,
            chunksUploaded: chunkIndex + 1,
            totalChunks
          } : null);
        },
        courseId,
        classId
      };

      const result = await chunkedUploadService.uploadFileWithChunks(file, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Error en la subida chunked');
      }

      setUploadSessionId(result.sessionId);

      if (onPostUploadProcess && result.document) {
        setCurrentPhase('processing');
        setProcessingProgress(0);

        const postProcessResult = await onPostUploadProcess(
          result.document,
          (step, progress, message) => {
            setCurrentStep(message);
            setProcessingProgress(progress);
            
            setProcessingSteps(prev => prev.map(s => {
              if (s.key === step) {
                return { ...s, status: progress === 100 ? 'finish' : 'process' };
              } else if (prev.findIndex(ps => ps.key === step) > prev.findIndex(ps => ps.key === s.key)) {
                return { ...s, status: 'wait' };
              } else {
                return { ...s, status: 'finish' };
              }
            }));
          },
          result.status // Pasar el status del upload
        );

        setCurrentPhase('success');
        onUploadSuccess?.(postProcessResult);
      } else {
        setCurrentPhase('success');
        onUploadSuccess?.(result);
      }

    } catch (error) {
      setCurrentPhase('error');
      setUploadProgress(0);
      setProcessingProgress(0);
      const errorMessage = error instanceof Error ? error.message : 'Processing error';
      setError(errorMessage);
      
      // Show Alert for duplicate errors (409)
      if (errorMessage.includes('duplicate') || errorMessage.includes('Duplicate') || errorMessage.includes('similar')) {
        message.error({
          content: `Duplicate document detected: ${errorMessage}`,
          duration: 8,
          style: { marginTop: '10vh' }
        });
      }
      
      setProcessingSteps(prev => prev.map(s => 
        s.status === 'process' ? { ...s, status: 'error' } : s
      ));
      
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [
    fileConfig.chunkSize,
    handleUploadProgress,
    onPostUploadProcess,
    onUploadSuccess,
    onUploadError
  ]);

  const handleCancelUpload = useCallback(async () => {
    if (uploadSessionId && currentPhase === 'uploading') {
      try {
        await chunkedUploadService.cancelUpload(uploadSessionId);
        setCurrentPhase('error');
        setError('Upload cancelado por el usuario');
        setCurrentStep('Upload cancelado');
      } catch (error) {
        console.error('Error canceling upload:', error);
      }
    }
  }, [uploadSessionId, currentPhase]);

  const handleRetryUpload = useCallback(() => {
    if (selectedFile) {
      resetUploader();
      setTimeout(() => {
        handleFileUpload(selectedFile);
      }, 100);
    }
  }, [selectedFile, handleFileUpload]);

  const handleManualSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileConfig.accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const validationError = validateFile(file);
        if (validationError) {
          message.error(validationError);
          return;
        }
        setSelectedFile(file);
        setError(null);
        onUploadStart?.(file);
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleCloseModal = useCallback(() => {
    if (currentPhase === 'uploading' && uploadSessionId) {
      handleCancelUpload();
    }
    
    setModalOpen(false);
    onModalClose?.();
    setTimeout(resetUploader, 300);
  }, [currentPhase, uploadSessionId, handleCancelUpload, onModalClose]);

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setCurrentPhase('idle');
    setCurrentStep('');
    setError(null);
    setUploadSessionId(null);
    setUploadProgressInfo(null);
    uploadStartTime.current = 0;
    lastProgressUpdate.current = 0;
    speedHistory.current = [];
    setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'wait' as const })));
  };

  const renderUploadProgressInfo = () => {
    if (!uploadProgressInfo || currentPhase !== 'uploading') return null;

    return (
      <Card 
        size="small"
        style={{ 
          marginTop: '16px',
          backgroundColor: isDark ? token.colorBgElevated : '#f8f9ff',
          border: `1px solid ${isDark ? token.colorBorder : '#e8eaed'}`
        }}
      >
        <Row gutter={[16, 8]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="Subido"
              value={formatBytes(uploadProgressInfo.uploadedBytes)}
              valueStyle={{ fontSize: isSmallScreen ? '12px' : '14px', color: FIXED_COLOR }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Total"
              value={formatBytes(uploadProgressInfo.totalBytes)}
              valueStyle={{ fontSize: isSmallScreen ? '12px' : '14px', color: isDark ? token.colorText : '#666' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Velocidad"
              value={formatBytes(uploadProgressInfo.speed) + '/s'}
              valueStyle={{ fontSize: isSmallScreen ? '12px' : '14px', color: isDark ? token.colorSuccess : '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Tiempo restante"
              value={formatTimeRemaining(uploadProgressInfo.timeRemaining)}
              valueStyle={{ fontSize: isSmallScreen ? '12px' : '14px', color: isDark ? token.colorWarning : '#fa8c16' }}
            />
          </Col>
        </Row>

        {uploadProgressInfo.totalChunks > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Text style={{ fontSize: '12px', color: isDark ? token.colorTextSecondary : '#999' }}>
              Chunks: {uploadProgressInfo.chunksUploaded} / {uploadProgressInfo.totalChunks}
            </Text>
          </>
        )}
        {/* Upload chunk info removed to avoid confusion */}
      </Card>
    );
  };

  const renderProcessingSteps = () => {
    if (currentPhase === 'idle') return null;

    return (
      <div style={{ marginTop: '24px' }}>
        <Title 
          level={5} 
          style={{ 
            color: FIXED_COLOR, 
            marginBottom: '16px',
            fontSize: isSmallScreen ? '14px' : '16px'
          }}
        >
          {currentPhase === 'uploading' ? 'Progreso de Subida' : 'Progreso del Procesamiento'}
        </Title>
        
        <Steps 
          direction={isSmallScreen ? "vertical" : "vertical"}
          size={isSmallScreen ? "small" : "default"}
          current={processingSteps.findIndex(s => s.status === 'process')}
        >
          {processingSteps.map((step) => (
            <Step
              key={step.key}
              title={<span style={{ fontSize: isSmallScreen ? '12px' : '14px' }}>{step.title}</span>}
              description={
                <span style={{ fontSize: isSmallScreen ? '11px' : '12px' }}>
                  {step.description}
                </span>
              }
              status={step.status}
              icon={
                step.status === 'process' ? <LoadingOutlined /> :
                step.status === 'error' ? <ExclamationCircleOutlined /> :
                step.status === 'finish' ? <CheckCircleOutlined /> : undefined
              }
            />
          ))}
        </Steps>
        
        {currentStep && (
          <Alert
            message={currentStep}
            type={currentPhase === 'error' ? 'error' : 'info'}
            showIcon
            style={{ 
              marginTop: '16px',
              fontSize: isSmallScreen ? '12px' : '14px'
            }}
          />
        )}
        
        {/* Informative message specific for large files in processing */}
        {currentPhase === 'processing' && selectedFile && (selectedFile.size / BYTES_PER_MB) > (Number(import.meta.env.VITE_LARGE_FILE_THRESHOLD_MB) || 50) && (
          <Alert
            message="Processing large file"
            description={`This ${((selectedFile.size) / BYTES_PER_MB).toFixed(1)} MB file is being processed. Estimated time may be 5-10 minutes depending on size. Please keep this window open.`}
            type="warning"
            showIcon
            style={{ 
              marginTop: '12px',
              fontSize: isSmallScreen ? '12px' : '14px'
            }}
          />
        )}
      </div>
    );
  };

  const renderUploadControls = () => {
    if (currentPhase === 'idle' || currentPhase === 'success') return null;

    return (
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <Space>
          {currentPhase === 'uploading' && (
            <Button
              icon={<StopOutlined />}
              onClick={handleCancelUpload}
              danger
              size={isSmallScreen ? "small" : "middle"}
            >
              Cancelar
            </Button>
          )}
          
          {currentPhase === 'error' && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRetryUpload}
              type="primary"
              size={isSmallScreen ? "small" : "middle"}
            >
              Reintentar
            </Button>
          )}
        </Space>
      </div>
    );
  };

  return (
    <>
      <Button
        {...getButtonProps()}
        onClick={handleButtonClick}
        loading={currentPhase === 'uploading' || currentPhase === 'processing'}
      >
        {showText && 'Subir Archivo'}
      </Button>

      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: isDark ? '#ffffff' : FIXED_COLOR,
            fontSize: '18px',
            fontWeight: '600',
            textShadow: 'none'
          }}>
            {title}
          </div>
        }
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        centered
        width={modalWidth}
        destroyOnClose={false}
        styles={{
          header: {
            backgroundColor: 'transparent',
            borderBottom: 'none',
            boxShadow: 'none',
            filter: 'none'
          },
          body: {
            padding: isSmallScreen ? '16px' : '24px'
          }
        }}
      >
        <div style={{ padding: isSmallScreen ? '16px 0' : '24px 0' }}>
          {currentPhase === 'idle' ? (
            <>
              <Dragger
                name="file"
                multiple={false}
                accept={fileConfig.accept}
                beforeUpload={handleFileSelect}
                showUploadList={false}
                style={{
                  border: `2px dashed ${isDark ? token.colorBorder : '#7A85C1'}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? token.colorBgElevated : '#F8F9FB',
                  padding: isSmallScreen ? '20px 16px' : '40px 20px',
                  cursor: 'pointer'
                }}
              >
                <p className="ant-upload-drag-icon">
                  <CloudUploadOutlined style={{ 
                    fontSize: isSmallScreen ? '36px' : '48px', 
                    color: isDark ? '#5b6ef0' : '#3B38A0' 
                  }} />
                </p>
                <p className="ant-upload-text" style={{ 
                  color: isDark ? '#ffffff' : '#1A2A80', 
                  fontSize: isSmallScreen ? '14px' : '16px', 
                  fontWeight: '500',
                  margin: isSmallScreen ? '12px 0 6px 0' : '16px 0 8px 0'
                }}>
                  {isSmallScreen ? 'Toca o arrastra aquí' : 'Haz clic o arrastra el archivo aquí'}
                </p>
                <p className="ant-upload-hint" style={{ 
                  color: isDark ? '#bfc7ff' : '#7A85C1',
                  fontSize: isSmallScreen ? '12px' : '14px',
                  margin: '0',
                  padding: isSmallScreen ? '0 8px' : '0'
                }}>
                  {fileConfig.validationMessage || 
                   `Accepted files: ${fileConfig.accept}. Maximum size: ${(fileConfig.maxSize / BYTES_PER_MB).toFixed(1)}MB`}
                </p>
              </Dragger>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleManualSelect}
                  style={{
                    backgroundColor: isDark ? token.colorPrimary : '#1890ff',
                    borderColor: isDark ? token.colorPrimary : '#1890ff',
                    borderRadius: '6px',
                    fontWeight: '500',
                    color: '#ffffff'
                  }}
                  size={isSmallScreen ? "middle" : "large"}
                >
                  {isSmallScreen ? 'Seleccionar' : 'Seleccionar Archivo'}
                </Button>
              </div>
            </>
          ) : currentPhase === 'success' ? (
            <div style={{ 
              textAlign: 'center', 
              padding: isSmallScreen ? '30px 16px' : '40px 20px',
              backgroundColor: isDark ? token.colorBgElevated : '#f6ffed',
              borderRadius: '8px',
              border: `2px solid ${isDark ? token.colorSuccess : '#52c41a'}`
            }}>
              <CheckCircleOutlined style={{ 
                fontSize: isSmallScreen ? '48px' : '64px', 
                color: isDark ? token.colorSuccess : '#52c41a', 
                marginBottom: isSmallScreen ? '12px' : '16px',
                display: 'block'
              }} />
              
              <Text style={{ 
                color: isDark ? token.colorSuccess : '#389e0d', 
                fontSize: isSmallScreen ? '16px' : '18px', 
                fontWeight: '600',
                display: 'block',
                marginBottom: '8px'
              }}>
                {successText}
              </Text>

              {selectedFile && (
                <Text style={{ 
                  color: isDark ? token.colorTextSecondary : '#666', 
                  fontSize: isSmallScreen ? '12px' : '14px',
                  display: 'block',
                  marginBottom: '16px'
                }}>
                  "{selectedFile.name}" está listo
                </Text>
              )}

              <Button
                type="primary"
                onClick={handleCloseModal}
                style={{
                  backgroundColor: isDark ? token.colorSuccess : '#52c41a',
                  borderColor: isDark ? token.colorSuccess : '#52c41a',
                  color: '#ffffff',
                  marginTop: '16px'
                }}
                size={isSmallScreen ? "middle" : "large"}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: isSmallScreen ? '30px 16px' : '40px 20px',
              backgroundColor: isDark ? token.colorBgElevated : '#F8F9FB',
              borderRadius: '8px',
              border: `2px solid ${currentPhase === 'error' ? 
                (isDark ? token.colorError : '#ff4d4f') : 
                (isDark ? token.colorBorder : '#7A85C1')}`
            }}>
              {currentPhase === 'error' ? (
                <CloseCircleOutlined style={{ 
                  fontSize: isSmallScreen ? '36px' : '48px', 
                  color: isDark ? token.colorError : '#ff4d4f', 
                  marginBottom: isSmallScreen ? '12px' : '16px' 
                }} />
              ) : (
                <FileAddOutlined style={{ 
                  fontSize: isSmallScreen ? '36px' : '48px', 
                  color: '#3B38A0', 
                  marginBottom: isSmallScreen ? '12px' : '16px' 
                }} />
              )}
              
              {selectedFile && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '4px',
                    flexWrap: isSmallScreen ? 'wrap' : 'nowrap'
                  }}>
                    <FileTextOutlined style={{ 
                      color: '#1A2A80', 
                      marginRight: '8px', 
                      fontSize: isSmallScreen ? '14px' : '16px' 
                    }} />
                    <Text strong style={{ 
                      color: '#1A2A80',
                      fontSize: isSmallScreen ? '12px' : '14px',
                      wordBreak: 'break-word',
                      textAlign: 'center'
                    }}>
                      {selectedFile.name}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: isSmallScreen ? '11px' : '12px' }}>
                    {(selectedFile.size / BYTES_PER_MB).toFixed(2)} MB
                  </Text>
                </div>
              )}

              <Text style={{ 
                color: currentPhase === 'error' ? 
                  (isDark ? token.colorError : '#ff4d4f') : '#1A2A80', 
                fontSize: isSmallScreen ? '14px' : '16px', 
                fontWeight: '500',
                display: 'block',
                marginBottom: '16px'
              }}>
                {currentPhase === 'error' ? 'Error en la subida' : 
                 currentPhase === 'uploading' ? 'Subiendo archivo...' : processingText}
              </Text>

              {uploadProgress > 0 && currentPhase === 'uploading' && (
                <Progress
                  percent={uploadProgress}
                  strokeColor="#3B38A0"
                  trailColor="#E6E6E6"
                  style={{ 
                    maxWidth: isSmallScreen ? '250px' : '300px', 
                    margin: '0 auto 16px auto' 
                  }}
                  size={isSmallScreen ? "small" : "default"}
                />
              )}

              {processingProgress > 0 && currentPhase === 'processing' && (
                <Progress
                  percent={processingProgress}
                  strokeColor="#3B38A0"
                  trailColor="#E6E6E6"
                  style={{ 
                    maxWidth: isSmallScreen ? '250px' : '300px', 
                    margin: '0 auto 16px auto' 
                  }}
                  size={isSmallScreen ? "small" : "default"}
                />
              )}

              {renderUploadProgressInfo()}

              {renderProcessingSteps()}

              {renderUploadControls()}

              {error && (
                <Alert
                  message="Error en el procesamiento"
                  description={error}
                  type="error"
                  showIcon
                  style={{ 
                    marginTop: '16px', 
                    textAlign: 'left',
                    fontSize: isSmallScreen ? '12px' : '14px'
                  }}
                />
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ChunkedUploadButton;

export type { 
  ChunkedUploadButtonProps,
  FileConfig, 
  ProcessingConfig, 
  ProcessingStep, 
  ButtonConfig, 
  ModalConfig,
  UploadProgressInfo
};
