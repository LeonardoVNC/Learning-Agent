import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Table, Button, message, Typography, Empty, Tabs } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  UserOutlined,
  FolderOutlined,
  BookOutlined,
  BarChartOutlined,
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
import type {
  createEnrollmentInterface,
  EnrollGroupRow,
} from "../../interfaces/enrollmentInterface";
import useEnrollment from "../../hooks/useEnrollment";
import dayjs from "dayjs";
import useStudents from "../../hooks/useStudents";
import { useUserStore } from "../../store/userStore";
import useCourses from "../../hooks/useCourses";
import type { StudentInfo } from "../../interfaces/studentInterface";

const { Text } = Typography;
const { TabPane } = Tabs;

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchClassById, actualClass, updateClass, softDeleteClass } =
    useClasses();
  const { students, fetchStudentsByClass } = useStudents();
  const { enrollSingleStudent, enrollGroupStudents, softDeleteStudent } =
    useEnrollment();
  const { getCourseByID } = useCourses();
  const { getTeacherInfoById } = useTeacher();
  const user = useUserStore((s) => s.user);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetyModalConfig, setSafetyModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [singleStudentFormOpen, setSingleStudentFormOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);

  const [studentToDelete, setStudentToDelete] = useState<StudentInfo | null>(
    null
  );

  const [parsedStudents, setParsedStudents] = useState<
    Array<
      Record<string, any> & {
        nombres: string;
        apellidos: string;
        codigo: number;
      }
    >
  >([]);
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
        await fetchClassById(id);
        await fetchStudentsByClass(id);
      } catch (error) {
        message.error("Error al cargar los datos del curso");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const loadTeacherInfo = async () => {
      if (actualClass?.courseId) {
        try {
          const courseID = actualClass.courseId;
          const courseRes = await getCourseByID(courseID);
          if (courseRes.state === "error") return;

          const teacherId = courseRes.data.teacherId;
          if (!teacherId) return;

          const teacherRes = await getTeacherInfoById(teacherId);
          if (teacherRes && teacherRes.success) {
            const teacher = teacherRes.data;
            if (teacher) setTeacherInfo(teacher);
          }
        } catch (error) {
          console.error("Error al obtener información del docente:", error);
          setTeacherInfo(null);
        }
      } else {
        setTeacherInfo(null);
      }
    };
    loadTeacherInfo();
  }, [actualClass]);

  const handleEditClass = async (values: Clase) => {
    const data = await updateClass(values);
    if (data.state === "success") {
      message.success(data.message);
    } else {
      message.error("Error al actualizar el curso");
      return;
    }

    setEditModalOpen(false);
    if (id) await fetchClassById(id);
  };

  const handleDeleteClass = () => {
    setSafetyModalConfig({
      title: "¿Eliminar curso?",
      message: (
        <span>
          ¿Estás seguro de que quieres eliminar el curso{" "}
          <strong>"{actualClass.name}"</strong>? Esta acción no se puede
          deshacer.
        </span>
      ),
      onConfirm: confirmDeleteClass,
    });
    setSafetyModalOpen(true);
  };

  const handleDeleteStudent = (student: StudentInfo) => {
    setStudentToDelete(student);
    setSafetyModalConfig({
      title: "¿Eliminar estudiante?",
      message: (
        <span>
          ¿Estás seguro de que quieres eliminar al estudiante{" "}
          <strong>
            "{student.name} {student.lastname}"
          </strong>
          ? Esta acción no se puede deshacer.
        </span>
      ),
      onConfirm: confirmDeleteStudent,
    });
    setSafetyModalOpen(true);
  };

  const confirmDeleteClass = async () => {
    try {
      if (!id) {
        message.error("ID de la clase no encontrado");
        return;
      }
      const res = await softDeleteClass(id);
      if (!res.success) {
        message.error(res.message); //AQUI
        return;
      }
      message.success(res.message);
      setTimeout(() => {
        if (user?.roles.includes("docente")) {
          navigate("/courses");
        } else {
          navigate("/");
        }
      }, 2000);
    } catch {
      message.error("Error al eliminar el curso");
    } finally {
      setSafetyModalOpen(false);
    }
  };

  const confirmDeleteStudent = async () => {
    try {
      if (!studentToDelete) return;
      const res = await softDeleteStudent(studentToDelete.userId);
      if (res.state !== "success") {
        message.error(res.message);
        return;
      }
      message.success(
        `Estudiante eliminado correctamente`
      );
      if (id) fetchStudentsByClass(id);
    } catch {
      message.error("Error al eliminar al estudiante");
    } finally {
      setSafetyModalOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleEnrollStudent = async (values: createEnrollmentInterface) => {
    try {
      await enrollSingleStudent(values);
      message.success("Estudiante inscrito correctamente");
      if (id) fetchClassById(id);
      setSingleStudentFormOpen(false);
    } catch {
      message.error("Error al inscribir al estudiante");
    }
  };

  const handleGroupEnrollment = async () => {
    if (!id) return;

    const seen = new Set<string>();
    const filtered = parsedStudents.filter((r) => {
      const k = String(r.codigo || "")
        .trim()
        .toLowerCase();
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
      fetchClassById(id);
    } catch (error: any) {
      message.error(
        error?.message || "Error al inscribir el grupo de estudiantes"
      );
    } finally {
      setSending(false);
    }
  };

  const studentsColumns = [
    {
      title: "Nombres",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Apellidos",
      dataIndex: "lastname",
      key: "lastname",
    },
    {
      title: "Código",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Asistencia",
      dataIndex: "asistencia",
      key: "asistencia",
      render: () => "-",
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: any) => (
        <div className="flex gap-3">
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
          <Button
            danger
            type="primary"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteStudent(record)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <PageTemplate
        title="Cargando..."
        subtitle="Cargando información del curso"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Clases" }]}
      >
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <Text>Cargando datos del curso...</Text>
        </div>
      </PageTemplate>
    );
  }

  if (!actualClass) {
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
      title={actualClass.name}
      subtitle={dayjs().format("DD [de] MMMM [de] YYYY")}
      //TODO Hay que cambiar los Breadcrumbs para que se mantengan con el formato del usuario actual (docente o estudiante)
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Clases", href: "/classes" },
        { label: actualClass.name, href: `/classes/${actualClass.id}` },
      ]}
      actions={
        <>
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
            onClick={handleDeleteClass}
          >
            Eliminar Curso
          </Button>
        </>
      }
    >
      <div style={{ padding: "1rem" }}>
        <div
          style={{
            height: "1px",
            marginBottom: "8px",
          }}
        ></div>

        <div
          style={{
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <Tabs
            defaultActiveKey="general"
            size="large"
            style={{ paddingLeft: "16px" }}
          >
            <TabPane
              tab={
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                  }}
                >
                  <FileTextOutlined
                    style={{
                      marginRight: "6px",
                      fontSize: "14px",
                    }}
                  />
                  <span>Información General</span>
                </span>
              }
              key="general"
            >
              <div style={{ padding: "32px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: "14px" }}>
                      Nombre del curso:
                    </Text>
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                      <Text style={{ fontSize: "16px" }}>
                        {actualClass.name}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: "14px" }}>
                      Gestión (semestre):
                    </Text>
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                      <Text style={{ fontSize: "16px" }}>
                        {actualClass.semester}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: "14px" }}>
                      Fecha de inicio:
                    </Text>
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                      <Text style={{ fontSize: "16px" }}>
                        {dayjs(actualClass.dateBegin).format("DD/MM/YYYY")}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: "14px" }}>
                      Fecha final:
                    </Text>
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                      <Text style={{ fontSize: "16px" }}>
                        {dayjs(actualClass.dateEnd).format("DD/MM/YYYY")}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: "14px" }}>
                      Docente asignado:
                    </Text>
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                      <Text style={{ fontSize: "16px" }}>
                        {teacherInfo
                          ? `${teacherInfo.name} ${teacherInfo.lastname}`
                          : actualClass.teacherId
                          ? "Cargando..."
                          : "No asignado"}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: "14px" }}>
                      Horarios:
                    </Text>
                    <div style={{ marginTop: "8px", marginBottom: "20px" }}>
                      <Text style={{ fontSize: "16px" }}>Por definir</Text>
                    </div>
                  </div>
                </div>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                  }}
                >
                  <UserOutlined
                    style={{
                      marginRight: "6px",
                      fontSize: "14px",
                    }}
                  />
                  <span>Estudiantes</span>
                </span>
              }
              key="students"
            >
              <div style={{ padding: "32px" }}>
                {hasStudents ? (
                  <>
                    {/* Tabla de estudiantes */}
                    <Table
                      columns={studentsColumns}
                      dataSource={students}
                      rowKey={(record) => record.userId}
                      pagination={{
                        position: ["bottomCenter"],
                        showSizeChanger: false,
                        pageSize: 10,
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
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <Empty description="No hay estudiantes inscritos en este curso">
                      <div style={{ marginTop: "24px" }}>
                        <StudentUpload
                          disabled={false}
                          onStudentsParsed={(parsed, info) => {
                            setParsedStudents(parsed);
                            if (info?.fileName) setFileName(info.fileName);

                            const seen = new Set<string>();
                            const dupSet = new Set<string>();
                            for (const s of parsed) {
                              const k = String(s.codigo || "")
                                .trim()
                                .toLowerCase();
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
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                  }}
                >
                  <InboxOutlined
                    style={{ marginRight: "6px", fontSize: "14px" }}
                  />
                  <span>Materiales</span>
                </span>
              }
              key="materials"
            >
              <div style={{ textAlign: "center", padding: "64px" }}>
                <Empty description="Funcionalidad de materiales en desarrollo">
                  <Button
                    type="primary"
                    onClick={() => navigate(`/curso/${id}/documents`)}
                    style={{ marginTop: "16px" }}
                  >
                    Ir a Documentos
                  </Button>
                </Empty>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                  }}
                >
                  <BookOutlined
                    style={{ marginRight: "6px", fontSize: "14px" }}
                  />
                  <span>Gestión de Exámenes</span>
                </span>
              }
              key="exams"
            >
              <div style={{ padding: "32px" }}>
                <div style={{ textAlign: "center", padding: "64px 0" }}>
                  <Empty description="No hay exámenes creados para este curso">
                    <Text style={{ fontSize: "14px" }}>
                      Los exámenes creados aparecerán aquí para su gestión
                    </Text>
                  </Empty>
                </div>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                  }}
                >
                  <FileTextOutlined
                    style={{
                      marginRight: "6px",
                      fontSize: "14px",
                    }}
                  />
                  <span>Sílabo</span>
                </span>
              }
              key="syllabus"
            >
              <div style={{ textAlign: "center", padding: "64px" }}>
                <Empty description="Sílabo no disponible">
                  <Button type="primary" disabled style={{ marginTop: "16px" }}>
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
          onSubmit={handleEditClass}
          clase={actualClass}
        />

        <SafetyModal
          open={safetyModalOpen}
          onCancel={() => {
            setSafetyModalOpen(false);
            setStudentToDelete(null);
          }}
          onConfirm={safetyModalConfig.onConfirm}
          title={safetyModalConfig.title}
          message={safetyModalConfig.message}
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
