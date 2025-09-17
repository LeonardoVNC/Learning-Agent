import React, { useCallback, useState, useEffect, useMemo } from "react";
import { Card, message, Row, Col, Grid, theme as antTheme } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useParams, useLocation } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import ChunkedUploadButton from "../../components/shared/ChunkedUploadButton";
import { DocumentTable } from "../../components/documents/DocumentTable";
import { PdfPreviewSidebar } from "../../components/documents/PdfPreviewSidebar";
import { DocumentDataSidebar } from "../../components/documents/DocumentDataSidebar";
import { useDocuments } from "../../hooks/useDocuments";
import { useChunkedDocumentUpload } from "../../hooks/useChunkedDocumentUpload";
import { useUser } from "../../context/UserContext";
import { useUserStore } from "../../store/userStore";
import { useThemeStore } from "../../store/themeStore";
import { palette } from "../../theme";
import type { Document } from "../../interfaces/documentInterface";
import useCourses from "../../hooks/useCourses";
import useClasses from "../../hooks/useClasses";

const { useBreakpoint } = Grid;

const UploadDocumentPage: React.FC = () => {
  const { processDocumentComplete } = useChunkedDocumentUpload();
  // Use only one source for user data
  const user = useUserStore((s) => s.user);
  const { id: _userId } = useUser(); // Hook that internally uses the same store
  const isStudent = Boolean(user?.roles?.includes?.("estudiante"));
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const location = useLocation();
  
  // Memoize filters to prevent infinite re-renders
  const documentsFilters = useMemo(() => ({
    courseId,
    classId: id
  }), [courseId, id]);
  
  // Now we can use the documents hook with stable filters
  const { documents, loading, downloadDocument, deleteDocument, loadDocuments } = useDocuments(documentsFilters);
  
  // Hooks to get course and period information
  const { actualCourse, getCourseByID } = useCourses();
  const { actualClass, fetchClassById } = useClasses();

  // Get course and period information when necessary
  useEffect(() => {
    if (courseId && !actualCourse) {
      getCourseByID(courseId);
    }
    if (id && !actualClass) {
      fetchClassById(id);
    }
  }, [courseId, id, actualCourse, actualClass, getCourseByID, fetchClassById]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const screens = useBreakpoint();
  
  // Check if we're in the student reinforcement context
  const isInReinforcementContext = location.pathname.includes('/student/classes/') && location.pathname.includes('/reinforcement/documents');
  
  // Theme
  const theme = useThemeStore((state: { theme: string }) => state.theme);
  const isDark = theme === "dark";
  const { token } = antTheme.useToken();
  
  // State for preview sidebar
  const [previewSidebarVisible, setPreviewSidebarVisible] = useState<boolean>(false);
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null);
  
  // State for data sidebar
  const [dataSidebarVisible, setDataSidebarVisible] = useState<boolean>(false);
  const [documentToViewData, setDocumentToViewData] = useState<Document | null>(null);

  const isSmallScreen = !screens.lg;
  const isMobileScreen = !screens.md;
  const sidebarWidth = isSmallScreen ? '100%' : '50%';
  
  const contentMaxWidth = (previewSidebarVisible || dataSidebarVisible) && !isSmallScreen 
    ? '50%'
    : '100%';

  // Create dynamic breadcrumbs based on context
  const getBreadcrumbs = () => {
    if (isInReinforcementContext && id) {
      return [
        { label: "Home", href: "/" },
        { label: "Classes", href: "/student/classes" },
        { label: "Reinforcement", href: `/student/classes/${id}/reinforcement` },
        { label: "Documents" }
      ];
    }
    
    // Professor context: /professor/courses/:courseId/periods/:id/documents
    if (courseId && id && actualCourse && actualClass) {
      return [
        { label: "Inicio", href: "/" },
        { label: "Materias", href: "/professor/courses" },
        { label: actualCourse.name, href: `/professor/courses/${courseId}/periods` },
        { label: actualClass.name, href: `/professor/courses/${courseId}/periods/${id}` },
        { label: "Documentos" }
      ];
    }
    
    // Professor context: /professor/courses/:courseId/documents (from course card)
    if (courseId && !id && actualCourse) {
      return [
        { label: "Inicio", href: "/" },
        { label: "Materias", href: "/professor/courses" },
        { label: actualCourse.name, href: `/professor/courses/${courseId}/periods` },
        { label: "Documentos" }
      ];
    }
    
    return [{ label: "Inicio", href: "/" }, { label: "Documentos" }];
  };

  const pageTitle = isSmallScreen ? "Documentos" : "Documentos Académicos";
  const containerPadding = isSmallScreen ? "16px" : "24px";

  const fileConfig = {
    accept: ".pdf",
    maxSize: 100 * 1024 * 1024, // 100MB
    chunkSize: 2 * 1024 * 1024, // 2MB chunks for better performance
    validationMessage: "Solo se permiten archivos PDF de hasta 100MB"
  };

  const processingConfig = {
    steps: [
      { key: "validate", title: "Validación", description: "Validando formato PDF..." },
      { key: "extract", title: "Extracción", description: "Extrayendo contenido..." },
      { key: "process", title: "Procesamiento", description: "Procesando documento..." },
      { key: "store", title: "Almacenamiento", description: "Guardando información..." }
    ],
    processingText: "Procesando documento PDF...",
    successText: "¡Documento procesado exitosamente!"
  };
    
  const handleUploadSuccess = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDocuments();
    } catch (error) {
      console.error("Error updating table:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadDocuments]);

  const handleDownload = useCallback(async (doc: Document) => {
    try {
      await downloadDocument(doc);
      message.success("File downloaded successfully");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Download error";
      message.error(errorMessage);
    }
  }, [downloadDocument]);

  const handleDeleteSuccess = useCallback(() => {
    message.success("Document deleted successfully");
    loadDocuments();
  }, [loadDocuments]);

  const handleDeleteError = useCallback((error: Error) => {
    message.error(error.message);
  }, []);

  const handleViewData = useCallback((doc: Document) => {
    if (previewSidebarVisible) {
      setPreviewSidebarVisible(false);
      setDocumentToPreview(null);
    }
    setDocumentToViewData(doc);
    setDataSidebarVisible(true);
  }, [previewSidebarVisible]);

  const handleCloseDataSidebar = useCallback(() => {
    setDataSidebarVisible(false);
    setDocumentToViewData(null);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setPreviewSidebarVisible(false);
    setDocumentToPreview(null);
  }, []);

  // Preview
  const handlePreview = useCallback(async (doc: Document) => {
    if (dataSidebarVisible) {
      setDataSidebarVisible(false);
      setDocumentToViewData(null);
    }
    setDocumentToPreview(doc);
    setPreviewSidebarVisible(true);
  }, [dataSidebarVisible]);

  return (
    <div style={{ 
      position: "relative", 
      width: "100%", 
      height: "100vh", 
      display: "flex",
      overflow: "hidden" 
    }}>
      <div style={{ 
        width: contentMaxWidth,
        transition: "width 0.3s ease-in-out",
        minWidth: 0,
        overflow: "auto",
        height: "100%",
        flex: "0 0 auto" 
      }}>
      <PageTemplate
        title={pageTitle}
        subtitle="Sistema de carga y gestión de material educativo PDF"
        breadcrumbs={getBreadcrumbs()}>
        <div style={{
          padding: containerPadding,
          width: "100%",
          margin: "0",
          maxWidth: "none" 
        }}>
          {/* Documents Table Section */}
          <Row>
            <Col xs={24}>
              <Card
                title={
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: isDark ? token.colorText : palette.P0,
                    width: "100%",
                    minWidth: 0,
                    gap: isSmallScreen ? "12px" : "16px",
                    flexWrap: isSmallScreen ? "nowrap" : "nowrap"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      minWidth: 0,
                      flex: "1 1 auto",
                      overflow: "hidden"
                    }}>
                      <FileTextOutlined style={{ 
                        marginRight: "8px", 
                        fontSize: isSmallScreen ? "14px" : "20px",
                        flexShrink: 0 
                      }} />
                      <span style={{ 
                        fontSize: isSmallScreen ? "14px" : "18px", 
                        fontWeight: "500",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {isSmallScreen ? "Repositorio" : "Repositorio de Documentos"}
                      </span>
                      <div style={{
                        marginLeft: "12px",
                        backgroundColor: documents.length > 0 
                          ? (isDark ? token.colorPrimaryBg : palette.lightBlue) 
                          : (isDark ? token.colorBgTextHover : palette.neutral100),
                        color: documents.length > 0 
                          ? (isDark ? token.colorPrimary : palette.purple) 
                          : (isDark ? token.colorTextSecondary : palette.neutral600),
                        padding: isSmallScreen ? "2px 8px" : "4px 10px",
                        borderRadius: isSmallScreen ? "10px" : "16px",
                        fontSize: isSmallScreen ? "10px" : "12px",
                        fontWeight: "500",
                        transition: "all 0.3s ease",
                        flexShrink: 0,
                        whiteSpace: "nowrap"
                      }}>
                        {loading || refreshing ? (isSmallScreen ? "..." : "Actualizando...") : (isSmallScreen ? `${documents.length}` : `${documents.length} documento${documents.length !== 1 ? 's' : ''}`)}
                      </div>
                    </div>

                    {!isStudent && (
                      <div style={{ 
                        flexShrink: 0,
                        minWidth: "fit-content",
                        paddingTop: isSmallScreen ? '6px' : '4px'
                      }}>
                        <ChunkedUploadButton
                          fileConfig={fileConfig}
                          processingConfig={processingConfig}
                          buttonConfig={{
                            showText: !isMobileScreen,
                            variant: "fill",
                            size: isMobileScreen ? "small" : "middle",
                            shape: "default"
                          }}
                          modalConfig={{
                            title: "Subir Nuevo Documento",
                            width: isMobileScreen ? (typeof window !== 'undefined' ? window.innerWidth * 0.9 : 600) : 600
                          }}
                          onPostUploadProcess={processDocumentComplete}
                          onUploadSuccess={handleUploadSuccess}
                          courseId={courseId}
                          classId={id}
                        />
                      </div>
                    )}
                  </div>
                }
                style={{
                  borderRadius: "12px",
                  boxShadow: isDark 
                    ? "0 4px 16px rgba(91, 110, 240, 0.1)" 
                    : "0 4px 16px rgba(26, 42, 128, 0.1)",
                  border: `1px solid ${isDark ? token.colorBorder : palette.neutral200}`,
                  backgroundColor: isDark ? token.colorBgContainer : palette.white,
                  width: "100%",
                  minWidth: 0,
                  overflow: "hidden"
                }}
              >
                <DocumentTable
                  key={`documents-table-${documents.length}`}
                  documents={documents}
                  loading={loading || refreshing}
                  onDownload={handleDownload}
                  onDelete={deleteDocument}
                  onPreview={handlePreview}
                  onViewData={handleViewData}
                  onDeleteSuccess={handleDeleteSuccess}
                  onDeleteError={handleDeleteError}
                  isStudent={isStudent}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </PageTemplate>
      </div>

      {/* PDF preview sidebar */}
      <PdfPreviewSidebar
        document={documentToPreview}
        visible={previewSidebarVisible}
        onClose={handleCloseSidebar}
        sidebarWidth={sidebarWidth}
      />

      {/* Document data sidebar */}
      <DocumentDataSidebar
        document={documentToViewData}
        visible={dataSidebarVisible}
        onClose={handleCloseDataSidebar}
      />
    </div>
  );
};

export default UploadDocumentPage;
