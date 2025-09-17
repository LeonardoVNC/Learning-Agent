import React, { useState, useCallback } from "react";
import { Modal, Button, Typography, theme as antTheme } from "antd";
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { ButtonProps } from "antd";
import { useThemeStore } from '../store/themeStore';

const { Text } = Typography;

interface SafetyModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/**
 * Información del recurso que se va a eliminar
 */
interface ResourceInfo {
  /** Nombre del recurso a eliminar */
  name: string;
  /** Tipo de recurso (ej: "Documento PDF", "Usuario", "Curso") */
  type?: string;
  /** Ícono que representa el recurso */
  icon?: React.ReactNode;
  /** Información adicional que se mostrará en el modal */
  additionalInfo?: string | React.ReactNode;
}

/**
 * Configuración del botón de eliminación
 */
interface ButtonConfig {
  /** Mostrar texto "Eliminar" junto al ícono */
  showText?: boolean;
  /** Ancho del botón en píxeles */
  width?: number;
  /** Alto del botón en píxeles */
  height?: number;
  /** Estilo del botón */
  variant?: "fill" | "ghost" | "text" | "link";
  /** Tamaño del botón */
  size?: "small" | "middle" | "large";
  /** Forma del botón */
  shape?: "default" | "circle" | "round";
  /** Si el botón está deshabilitado */
  disabled?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Configuración del modal de confirmación
 */
interface ModalConfig {
  /** Mensaje personalizado de confirmación */
  message?: string;
  /** Texto del botón de confirmación */
  confirmText?: string;
  /** Texto del botón de cancelación */
  cancelText?: string;
}

/**
 * Props del componente DeleteButton
 */
interface DeleteButtonProps {
  /** Función que se ejecuta para eliminar el recurso */
  onDelete: () => Promise<void> | void;
  /** Información del recurso a eliminar */
  resourceInfo: ResourceInfo;
  /** Configuración del botón */
  buttonConfig?: ButtonConfig;
  /** Configuración del modal */
  modalConfig?: ModalConfig;
  /** Callback que se ejecuta antes de mostrar el modal */
  onDeleteStart?: () => void;
  /** Callback que se ejecuta después de eliminar exitosamente */
  onDeleteSuccess?: () => void;
  /** Callback que se ejecuta si hay error en la eliminación */
  onDeleteError?: (error: Error) => void;
  /** Callback que se ejecuta cuando se cancela la eliminación */
  onCancel?: () => void;
  /** Si el botón está deshabilitado externamente */
  disabled?: boolean;
}

export const SafetyModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
}: SafetyModalProps) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      centered
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {cancelText}
        </Button>,
        <Button key="confirm" danger type="primary" onClick={onConfirm}>
          {confirmText}
        </Button>,
      ]}
      title={title}
    >
      <p style={{ fontSize: "16px" }}>{message}</p>
    </Modal>
  );
};

const DeleteButton: React.FC<DeleteButtonProps> = ({
  onDelete,
  resourceInfo,
  buttonConfig = {},
  modalConfig = {},
  onDeleteStart,
  onDeleteSuccess,
  onDeleteError,
  onCancel,
  disabled = false,
}) => {
  // Estados internos
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Tema
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === "dark";
  const { token } = antTheme.useToken();

  // Configuración por defecto del botón
  const {
    showText = true,
    width,
    height,
    variant = "fill",
    size = "middle",
    shape = "default",
    disabled: buttonDisabled = false,
    className = "",
  } = buttonConfig;

  // Configuración por defecto del modal
  const {
    message:
      modalMessage = "¿Estás seguro de que deseas eliminar este elemento?",
    confirmText = "Eliminar",
    cancelText = "Cancelar",
  } = modalConfig;

  // Color fijo del componente
  const FIXED_COLOR = "#bb1717ff";

  // Mapeo de variantes a props de Ant Design
  const getButtonProps = (): ButtonProps => {
    const baseProps: ButtonProps = {
      icon: <DeleteOutlined />,
      size,
      shape,
      disabled: disabled || buttonDisabled || deleting,
      className,
      style: {
        width,
        height,
        color: variant === "fill" ? "#ffffff" : FIXED_COLOR,
        backgroundColor: variant === "fill" ? FIXED_COLOR : "transparent",
        borderColor: FIXED_COLOR,
        ...(["ghost", "text", "link"].includes(variant) && {
          backgroundColor: "transparent",
        }),
      },
    };

    switch (variant) {
      case "fill":
        return { ...baseProps, type: "primary" };
      case "ghost":
        return { ...baseProps, ghost: true };
      case "text":
        return { ...baseProps, type: "text" };
      case "link":
        return { ...baseProps, type: "link" };
      default:
        return { ...baseProps, type: "default" };
    }
  };

  // Manejo del clic en el botón
  const handleButtonClick = useCallback(() => {
    onDeleteStart?.();
    setModalOpen(true);
  }, [onDeleteStart]);

  // Confirmación de eliminación
  const handleConfirmDelete = useCallback(async () => {
    try {
      setDeleting(true);
      await onDelete();
      setModalOpen(false);
      onDeleteSuccess?.();
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error("Error desconocido");
      onDeleteError?.(errorInstance);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, onDeleteSuccess, onDeleteError]);

  // Cancelación de eliminación
  const handleCancel = useCallback(() => {
    setModalOpen(false);
    onCancel?.();
  }, [onCancel]);

  return (
    <>
      {/* Botón de eliminación */}
      <Button {...getButtonProps()} onClick={handleButtonClick}>
        {showText && "Eliminar"}
      </Button>

      {/* Modal de confirmación */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: isDark ? token.colorError : '#d32f2f',
            padding: `${token.paddingXS}px 0`
          }}>
            <ExclamationCircleOutlined style={{ marginRight: token.marginXS, fontSize: '20px' }} />
            <span style={{ fontWeight: '600' }}>Confirmar eliminación</span>
          </div>
        }
        open={modalOpen}
        onOk={handleConfirmDelete}
        onCancel={handleCancel}
        okText={confirmText}
        cancelText={cancelText}
        confirmLoading={deleting}
        centered
        width={480}
        styles={{
          body: {
            padding: `${token.paddingLG}px`,
          }
        }}
        okButtonProps={{
          danger: true,
          size: "large",
          style: {
            backgroundColor: isDark ? token.colorErrorActive : '#d32f2f',
            borderColor: isDark ? token.colorErrorBorder : '#d32f2f',
            fontWeight: '500'
          }
        }}
        cancelButtonProps={{
          size: "large",
          style: {
            borderColor: isDark ? token.colorBorder : '#7A85C1',
            color: isDark ? token.colorText : '#3B38A0',
            fontWeight: '500'
          }
        }}
      >
        <div style={{ textAlign: "center" }}>
          {/* Ícono principal de eliminación */}
          <div style={{
            fontSize: '48px',
            color: isDark ? token.colorError : '#ff7875',
            marginBottom: token.marginLG,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <DeleteOutlined style={{ fontSize: '48px' }} />
          </div>

          {/* Mensaje de confirmación */}
          <p style={{
            marginBottom: token.marginLG,
            fontSize: '16px',
            color: isDark ? token.colorText : '#262626',
            lineHeight: '1.5'
          }}>
            {modalMessage}
          </p>

          {/* Información del recurso */}
          <div style={{
            backgroundColor: isDark ? token.colorWarningBg : '#fff2e8',
            border: `1px solid ${isDark ? token.colorWarningBorder : '#ffcc7a'}`,
            borderRadius: token.borderRadius,
            padding: token.paddingLG,
            marginTop: token.marginLG,
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: token.marginXS }}>
              <div style={{ 
                color: isDark ? token.colorWarning : '#d46b08', 
                fontSize: '16px' 
              }}>
                {resourceInfo.icon || <FileTextOutlined />}
              </div>
              <Text strong style={{ 
                color: isDark ? token.colorWarning : '#d46b08', 
                fontSize: '14px',
                marginLeft: token.marginXS
              }}>
                {resourceInfo.name}
              </Text>
              {resourceInfo.type && (
                <Text style={{ 
                  fontSize: '12px',
                  marginLeft: token.marginXS,
                  color: isDark ? token.colorWarningText : '#fa8c16'
                }}>
                  ({resourceInfo.type})
                </Text>
              )}
            </div>

            {/* Información adicional */}
            {resourceInfo.additionalInfo && (
              <div style={{ 
                marginTop: token.marginXS, 
                fontSize: '12px', 
                color: isDark ? token.colorWarningText : '#d48806' 
              }}>
                {resourceInfo.additionalInfo}
              </div>
            )}

            {/* Mensaje de advertencia */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: token.marginXS }}>
              <ExclamationCircleOutlined style={{ 
                color: isDark ? token.colorWarning : '#fa8c16', 
                marginRight: token.marginXXS, 
                fontSize: '12px' 
              }} />
              <Text style={{ 
                fontSize: '12px', 
                fontStyle: 'italic',
                color: isDark ? token.colorWarningText : '#d48806'
              }}>
                Esta acción no se puede deshacer
              </Text>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DeleteButton;

// Exportar tipos para uso externo
export type { DeleteButtonProps, ResourceInfo, ButtonConfig, ModalConfig };