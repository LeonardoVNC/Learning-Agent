import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  message,
  Typography,
  Empty,
  Tabs
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  UserOutlined,
  FolderOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined,
  BookOutlined
} from "@ant-design/icons";
import useClasses from "../../hooks/useClasses";
import useTeacher from "../../hooks/useTeacher";
import PageTemplate from "../../components/PageTemplate";
import { CursosForm } from "../../components/cursosForm";
import { SafetyModal } from "../../components/safetyModal";
import { SingleStudentForm } from "../../components/singleStudentForm";
import { StudentUpload } from "../../components/studentUpload";
import StudentPreviewModal from "../../components/StudentPreviewModal";
import type { Clase } from "../../interfaces/claseInterface";
import type { TeacherInfo } from "../../interfaces/teacherInterface";
import type { createEnrollmentInterface, EnrollGroupRow } from "../../interfaces/enrollmentInterface";
import useEnrollment from "../../hooks/useEnrollment";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchClase, students, objClass, updateClass, softDeleteClass } = useClasses();
  const { enrollSingleStudent, enrollGroupStudents } = useEnrollment();
  const { getTeacherInfoById } = useTeacher();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [singleStudentFormOpen, setSingleStudentFormOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);

  const [parsedStudents, setParsedStudents] = useState<Array<Record<string, any> & { nombres: string; apellidos: string; codigo: number }>>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("archivo.xlsx");
  const [sending, setSending] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await fetchClase(id);
      } catch (error) {
        message.error("Error al cargar los datos del curso");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // Efecto para cargar información del docente cuando objClass cambia
  useEffect(() => {
    const loadTeacherInfo = async () => {
      if (objClass?.teacherId) {
        try {
          const teacher = await getTeacherInfoById(objClass.teacherId);
          if (teacher) {
            setTeacherInfo(teacher);
          }
        } catch (error) {
          console.error("Error al obtener información del docente:", error);
        }
      } else {
        setTeacherInfo(null);
      }
    };

    loadTeacherInfo();
  }, [objClass, getTeacherInfoById]);

  const handleEditCourse = async (values: Clase) => {
    if (!values.id) return;
    try {
      const data = await updateClass(values);
      if (!data.success) {
        message.error("Error al actualizar el curso");
        return
      }
      setEditModalOpen(false);
      if (id) await fetchClase(id);
    } catch {
      message.error("Error al actualizar el curso");
    }
  };

  const handleDeleteCourse = () => setSafetyModalOpen(true);

  const confirmDeleteCourse = async () => {
    try {
      if (!id) {
        message.error("ID del curso no encontrado");
        return;
      }
      const result = await softDeleteClass(id);
      if (result && !result.success) {
        message.error("Error al eliminar el curso");
        return;
      }
      message.success("Curso eliminado correctamente");
      setTimeout(() => {
        navigate("/classes");
      }, 2000);
    } catch {
      message.error("Error al eliminar el curso");
    } finally {
      setSafetyModalOpen(false);
    }
  };

  const handleEnrollStudent = async (values: createEnrollmentInterface) => {
    try {
      await enrollSingleStudent(values);
      message.success("Estudiante inscrito correctamente");
      if (id) fetchClase(id);
      setSingleStudentFormOpen(false);
    } catch {
      message.error("Error al inscribir al estudiante");
    }
  };

  const handleGroupEnrollment = async () => {
    if (!id) return;

    const seen = new Set<string>();
    const filtered = parsedStudents.filter((r) => {
      const k = String(r.codigo || "").trim().toLowerCase();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const payloadRows: EnrollGroupRow[] = filtered.map((r) => ({
      studentName: r.nombres,
      studentLastname: r.apellidos,
      studentCode: String(r.codigo),
      email: r.correo || undefined,
      career: r.career || undefined,
      campus: r.campus || undefined,
      admissionYear: r.admissionYear || undefined,
      residence: r.residence || undefined,
    }));

    setSending(true);
    try {
      const result = await enrollGroupStudents({
        classId: id,
        studentRows: payloadRows,
      });

      message.success(
        `Procesado: ${result.totalRows} · Éxito: ${result.successRows} · Ya inscritos: ${result.existingRows} · Errores: ${result.errorRows}`
      );

      setPreviewModalOpen(false);
      setParsedStudents([]);
      setDuplicates([]);
      fetchClase(id);
    } catch (error: any) {
      message.error(error?.message || "Error al inscribir el grupo de estudiantes");
    } finally {
      setSending(false);
    }
  };

  const studentsColumns = [
    {
      title: "Nombres",
      dataIndex: "name",
      key: "name"
    },
    {
      title: "Apellidos",
      dataIndex: "lastname",
      key: "lastname"
    },
    {
      title: "Código",
      dataIndex: "code",
      key: "code"
    },
    {
      title: "Asistencia",
      dataIndex: "asistencia",
      key: "asistencia",
      render: () => "-"
    },
    {
      title: "Acciones",
      key: "actions",
      render: () => (
        <Button
          type="primary"
          size="small"
          icon={<BarChartOutlined />}
          onClick={() => {
            // Sin acción - será implementado por el equipo de Ángela
            message.info("Funcionalidad en desarrollo");
          }}
        >
          Ver progreso
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <PageTemplate
        title="Cargando..."
        subtitle="Cargando información del curso"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Clases", href: "/classes" },
        ]}
      >
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <Text>Cargando datos del curso...</Text>
        </div>
      </PageTemplate>
    );
  }

  if (!objClass) {
    return (
      <PageTemplate
        title="Curso no encontrado"
        subtitle="El curso solicitado no existe"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Clases", href: "/classes" },
        ]}
      >
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <Empty description="Curso no encontrado" />
          <Button type="primary" onClick={() => navigate("/classes")}>
            Volver a Clases
          </Button>
        </div>
      </PageTemplate>
    );
  }

  const hasStudents = Array.isArray(students) && students.length > 0;

  return (
    <PageTemplate
      title={objClass.name}
      subtitle={dayjs().format("DD [de] MMMM [de] YYYY")}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Clases", href: "/classes" },
        { label: objClass.name, href: `/classes/${objClass.id}` },
      ]}
    >
      <div style={{ padding: "1rem" }}>
        <div style={{ marginBottom: 8, backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={2} style={{ margin: 0, color: '#000', fontSize: '28px' }}>
                {objClass.name}
              </Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', marginBottom: '16px' }}>
                <Text style={{ color: '#666', fontSize: '14px' }}>
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  {objClass.semester}
                </Text>
                <Text style={{ color: '#666', fontSize: '14px' }}>
                  <TeamOutlined style={{ marginRight: '4px' }} />
                  {hasStudents ? students.length : 0} estudiantes
                </Text>
              </div>
            </div>

            <Space>
              <Button
                type="primary"
                icon={<FolderOutlined />}
                onClick={() => navigate(`/curso/${id}/documents`)}
              >
                Documentos
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditModalOpen(true)}
              >
                Editar Curso
              </Button>
              <Button
                danger
                type="primary"
                icon={<DeleteOutlined />}
                onClick={handleDeleteCourse}
              >
                Eliminar Curso
              </Button>
            </Space>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#e8e8e8', marginBottom: '8px' }}></div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <Tabs defaultActiveKey="general" size="large" style={{ backgroundColor: '#ffffff', paddingLeft: '16px' }}>
            <TabPane
              tab={
                <span style={{ color: '#000', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <FileTextOutlined style={{ color: '#000', marginRight: '6px', fontSize: '14px' }} />
                  <span>Información General</span>
                </span>
              }
              key="general"
            >
              <div style={{ padding: '32px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <Text strong style={{ color: '#000', fontSize: '14px' }}>Nombre del curso:</Text>
                    <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                      <Text style={{ color: '#000', fontSize: '16px' }}>{objClass.name}</Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ color: '#000', fontSize: '14px' }}>Gestión (semestre):</Text>
                    <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                      <Text style={{ color: '#000', fontSize: '16px' }}>{objClass.semester}</Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ color: '#000', fontSize: '14px' }}>Fecha de inicio:</Text>
                    <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                      <Text style={{ color: '#000', fontSize: '16px' }}>{dayjs(objClass.dateBegin).format("DD/MM/YYYY")}</Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ color: '#000', fontSize: '14px' }}>Fecha final:</Text>
                    <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                      <Text style={{ color: '#000', fontSize: '16px' }}>{dayjs(objClass.dateEnd).format("DD/MM/YYYY")}</Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ color: '#000', fontSize: '14px' }}>Docente asignado:</Text>
                    <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                      <Text style={{ color: '#000', fontSize: '16px' }}>
                        {teacherInfo ? `${teacherInfo.name} ${teacherInfo.lastname}` : objClass.teacherId ? "Cargando..." : "No asignado"}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ color: '#000', fontSize: '14px' }}>Horarios:</Text>
                    <div style={{ marginTop: '8px', marginBottom: '20px' }}>
                      <Text style={{ color: '#000', fontSize: '16px' }}>Por definir</Text>
                    </div>
                  </div>
                </div>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ color: '#000', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <UserOutlined style={{ color: '#000', marginRight: '6px', fontSize: '14px' }} />
                  <span>Estudiantes</span>
                </span>
              }
              key="students"
            >
              <div style={{ backgroundColor: '#ffffff', padding: '32px' }}>
                {hasStudents ? (
                  <>
                    {/* Tabla de estudiantes */}
                    <Table
                      columns={studentsColumns}
                      dataSource={students}
                      rowKey={(record) => record.code}
                      pagination={{
                        position: ['bottomCenter'],
                        showSizeChanger: false,
                        pageSize: 10
                      }}
                      size="middle"
                    />
                    <div style={{ marginTop: 24 }}>
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => setSingleStudentFormOpen(true)}
                      >
                        Añadir Estudiante
                      </Button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Empty description="No hay estudiantes inscritos en este curso">
                      <div style={{ marginTop: '24px' }}>
                        <StudentUpload
                          disabled={false}
                          onStudentsParsed={(parsed, info) => {
                            setParsedStudents(parsed);
                            if (info?.fileName) setFileName(info.fileName);

                            const seen = new Set<string>();
                            const dupSet = new Set<string>();
                            for (const s of parsed) {
                              const k = String(s.codigo || "").trim().toLowerCase();
                              if (!k) continue;
                              if (seen.has(k)) dupSet.add(String(s.codigo));
                              else seen.add(k);
                            }
                            setDuplicates(Array.from(dupSet));
                            setPreviewModalOpen(true);
                          }}
                        />
                      </div>
                    </Empty>
                  </div>
                )}
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ color: '#000', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <InboxOutlined style={{ color: '#000', marginRight: '6px', fontSize: '14px' }} />
                  <span>Materiales</span>
                </span>
              }
              key="materials"
            >
              <div style={{ textAlign: 'center', padding: '64px', backgroundColor: '#ffffff' }}>
                <Empty description="Funcionalidad de materiales en desarrollo">
                  <Button
                    type="primary"
                    onClick={() => navigate(`/curso/${id}/documents`)}
                    style={{ marginTop: '16px' }}
                  >
                    Ir a Documentos
                  </Button>
                </Empty>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ color: '#000', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <BookOutlined style={{ color: '#000', marginRight: '6px', fontSize: '14px' }} />
                  <span>Gestión de Exámenes</span>
                </span>
              }
              key="exams"
            >
              <div style={{ backgroundColor: '#ffffff', padding: '32px' }}>
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <Empty description="No hay exámenes creados para este curso">
                    <Text style={{ color: '#666', fontSize: '14px' }}>
                      Los exámenes creados aparecerán aquí para su gestión
                    </Text>
                  </Empty>
                </div>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span style={{ color: '#000', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <FileTextOutlined style={{ color: '#000', marginRight: '6px', fontSize: '14px' }} />
                  <span>Sílabo</span>
                </span>
              }
              key="syllabus"
            >
              <div style={{ textAlign: 'center', padding: '64px', backgroundColor: '#ffffff' }}>
                <Empty description="Sílabo no disponible">
                  <Button
                    type="primary"
                    disabled
                    style={{ marginTop: '16px' }}
                  >
                    Subir Sílabo
                  </Button>
                </Empty>
              </div>
            </TabPane>
          </Tabs>
        </div>

        {/* Modals */}
        <CursosForm
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditCourse}
          clase={objClass}
        />

        <SafetyModal
          open={safetyModalOpen}
          onCancel={() => setSafetyModalOpen(false)}
          onConfirm={confirmDeleteCourse}
          title="¿Eliminar curso?"
          message={`¿Estás seguro de que quieres eliminar el curso "${objClass.name}"? Esta acción no se puede deshacer.`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          danger
        />

        <SingleStudentForm
          open={singleStudentFormOpen}
          onClose={() => setSingleStudentFormOpen(false)}
          onSubmit={async (values) => {
            if (!id) return;
            const data: createEnrollmentInterface = {
              ...values,
              classId: id,
            };
            await handleEnrollStudent(data);
          }}
        />

        <StudentPreviewModal
          open={previewModalOpen}
          data={parsedStudents}
          duplicates={duplicates}
          meta={{ fileName, totalRows: parsedStudents.length }}
          loading={sending}
          onCancel={() => setPreviewModalOpen(false)}
          onConfirm={handleGroupEnrollment}
        />
      </div>
    </PageTemplate>
  );
}
