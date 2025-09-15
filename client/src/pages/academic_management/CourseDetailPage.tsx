import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
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
  UserAddOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import useClasses from "../../hooks/useClasses";
import useTeacher from "../../hooks/useTeacher";
import PageTemplate from "../../components/PageTemplate";
import { CursosForm } from "../../components/cursosForm";
import { SafetyModal } from "../../components/safetyModal";
import { SingleStudentForm } from "../../components/singleStudentForm";
import StudentPreviewModal from "../../components/StudentPreviewModal";
import type { Clase } from "../../interfaces/claseInterface";
import type {
  createEnrollmentInterface,
  EnrollGroupRow,
} from "../../interfaces/enrollmentInterface";
import useEnrollment from "../../hooks/useEnrollment";
import dayjs from "dayjs";
import useStudents from "../../hooks/useStudents";
import { useUserStore } from "../../store/userStore";
import useCourses from "../../hooks/useCourses";
import UploadButton from "../../components/shared/UploadButton";
import { processFile } from "../../utils/enrollGroupByFile";
import type { StudentInfo } from "../../interfaces/studentInterface";
import CourseExamsPanel from "../courses/CourseExamsPanel";
import AttendanceModal from "../../components/AttendanceModal";
import AbsencesModal from "../../components/AbsencesModal";
import useAttendance from "../../hooks/useAttendance";

const { Text } = Typography;
const { TabPane } = Tabs;

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const { fetchClassById, actualClass, updateClass, softDeleteClass } =
    useClasses();
  const { students, fetchStudentsByClass } = useStudents();
  const {
    enrollSingleStudent,
    enrollGroupStudents,
    softDeleteSingleEnrollment,
  } = useEnrollment();
  const { actualCourse, getCourseByID } = useCourses();
  const { teacherInfo, fetchTeacherInfoById } = useTeacher();

  const { fetchAbsencesByClass } = useAttendance();
  const [absencesData, setAbsencesData] = useState<Record<string, number>>({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [singleStudentFormOpen, setSingleStudentFormOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [safetyModalConfig, setSafetyModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

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

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

  const [absencesModalOpen, setAbsencesModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<
    StudentInfo | undefined
  >(undefined);
  const [loadingAbsences, setLoadingAbsences] = useState(false);

  const fetchPeriod = async () => {
    if (!id) return;

    const res = await fetchClassById(id);
    if (res.state == "error") {
      message.error(res.message);
    }
  };

  const fetchCourse = async () => {
    if (!actualClass?.courseId) return;

    const courseID = actualClass.courseId;
    const res = await getCourseByID(courseID);
    if (res.state == "error") {
      message.error(res.message);
    }
  };

  const fetchTeacher = async () => {
    if (!actualCourse?.teacherId) return;

    const res = await fetchTeacherInfoById(actualCourse.teacherId);
    if (res.state == "error") {
      message.error(res.message);
    }
  };

  const fetchStudents = useCallback(async () => {
    if (!id) return;

    const res = await fetchStudentsByClass(id);
    if (res.state === "error") {
      message.error(res.message);
    }
  }, [id]);

  useEffect(() => {
    const preparePeriods = async () => {
      if (!id) return;
      setLoading(true);
      await fetchPeriod();
    };
    preparePeriods();
  }, [id]);

  useEffect(() => {
    const prepareCourse = async () => {
      if (!actualClass?.courseId) return;
      await fetchCourse();
    };
    prepareCourse();
  }, [actualClass]);

  useEffect(() => {
    const prepareTeacher = async () => {
      if (!actualCourse?.teacherId) return;
      await fetchTeacher();
      setLoading(false);
    };
    prepareTeacher();
  }, [actualCourse]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const loadAbsences = async () => {
      if (!id) return;
      const res = await fetchAbsencesByClass(id);
      if (res.state === "success" && Array.isArray(res.data)) {
        const mapped: Record<string, number> = {};
        res.data.forEach((s: any) => {
          mapped[s.codigo] = s.totalAbsences;
        });
        setAbsencesData(mapped);
      }
    };
    loadAbsences();
  }, [id, fetchAbsencesByClass]);

  const handleEditClass = async (values: Clase) => {
    const data = await updateClass(values);
    if (data.state == "success") {
      message.success(data.message);
    } else if (data.state == "info") {
      message.info(data.message);
    } else {
      message.error(data.message);
    }

    setEditModalOpen(false);
  };

  const handleDeletePeriod = () => {
    setSafetyModalConfig({
      title: "¿Eliminar período?",
      message: `¿Estás seguro de que quieres eliminar el período ${actualClass?.name}? Esta acción no se puede deshacer.`,
      onConfirm: confirmDeletePeriod,
    });
    setSafetyModalOpen(true);
  };

  const confirmDeletePeriod = async () => {
    try {
      if (!id) {
        message.error("ID del curso no encontrado");
        return;
      }
      const res = await softDeleteClass(id);
      if (res.state == "error") {
        message.error(res.message);
        return;
      }
      if (res.state == "info") {
        message.info(res.message);
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

  const handleEnrollStudent = async (values: createEnrollmentInterface) => {
    try {
      await enrollSingleStudent(values);
      message.success("Estudiante inscrito correctamente");
      if (id) fetchClassById(id);
      await fetchStudents();
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

    const result = await enrollGroupStudents({
      classId: id,
      studentRows: payloadRows,
    });
    if (result.state == "success") {
      console.log(result.data);
      const totalRows = result.data.totalRows;
      const successRows = result.data.successRows;
      const existingRows = result.data.existingRows;
      const errorRows = result.data.errorRows;

      message.success(`Procesadas ${totalRows} filas`);
      message.info(
        `Éxito: ${successRows} · Ya inscritos: ${existingRows} · Errores: ${errorRows}`
      );

      setPreviewModalOpen(false);
      setParsedStudents([]);
      setDuplicates([]);
      fetchClassById(id);
      await fetchStudents();
    } else {
      message.error(result.message);
    }

    setSending(false);
  };

  const handleSingleEnrollmentDeleteWarning = (record: StudentInfo) => {
    setSafetyModalConfig({
      title: "¿Eliminar estudiante?",
      message: `¿Estás seguro que quieres eliminar a ${record.name} ${record.lastname} de este periodo?`,
      onConfirm: () => handleDeleteSingleEnrollment(record),
    });
    setSafetyModalOpen(true);
  };

  const handleDeleteSingleEnrollment = async (record: StudentInfo) => {
    if (!id || !record) {
      message.error("Ha ocurrido un error");
      setSafetyModalOpen(false);
      return;
    }
    const classData = {
      studentId: record.userId,
      classId: id,
    };
    const res = await softDeleteSingleEnrollment(classData);
    if (res.state == "error") {
      message.error(res.message);
      setSafetyModalOpen(false);
      return;
    }
    message.success(res.message);
    await fetchStudents();
    setSafetyModalOpen(false);
  };

  const goToExams = () => {
    navigate(`/exams`);
  };

  const studentsColumns = [
    {
      title: "Código",
      dataIndex: "code",
      key: "code",
    },
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
      title: "Ausencias",
      dataIndex: "absences",
      key: "absences",
      render: (_: any, record: StudentInfo) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedStudent(record);
            setAbsencesModalOpen(true);
            setLoadingAbsences(true);
          }}
        >
          {absencesData[record.code] ?? "No data"}
        </Button>
      ),
    },

    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: StudentInfo) => (
        <div style={{ display: "flex", gap: 8 }}>
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
            onClick={() => handleSingleEnrollmentDeleteWarning(record)}
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
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Materias", href: "/courses" },
        {
          label: actualCourse?.name || "Materia",
          href: `/courses/${courseId}/periods`,
        },
        { label: actualClass.name },
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
            onClick={handleDeletePeriod}
          >
            Eliminar Período
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
                      rowKey={(record) => record.code}
                      pagination={{
                        position: ["bottomCenter"],
                        showSizeChanger: false,
                        pageSize: 10,
                      }}
                      size="middle"
                    />
                    <div style={{ marginTop: 24 }}>
                      <div className="flex gap-3">
                        <Button
                          type="primary"
                          size="large"
                          onClick={() => setSingleStudentFormOpen(true)}
                          icon={<UserAddOutlined />}
                        >
                          Añadir Estudiante
                        </Button>
                        <UploadButton
                          buttonConfig={{
                            size: "large",
                          }}
                          onUpload={async (file, onProgress) => {
                            const students = await processFile(
                              file,
                              onProgress
                            );
                            return students;
                          }}
                          fileConfig={{
                            accept: ".csv,.xlsx,.xls",
                            maxSize: 1 * 1024 * 1024,
                            validationMessage:
                              "Solo se permiten archivos .xlsx o .csv de hasta 1MB",
                          }}
                          processingConfig={{
                            steps: [
                              {
                                key: "upload",
                                title: "Subir archivo",
                                description: "Subiendo archivo",
                              },
                              {
                                key: "parse",
                                title: "Parsear datos",
                                description: "Procesando información",
                              },
                            ],
                            processingText: "Procesando tabla...",
                            successText: "Tabla procesada correctamente",
                          }}
                          onUploadSuccess={(students) => {
                            if (Array.isArray(students)) {
                              setParsedStudents(students);
                              setFileName("archivo.xlsx");
                              const seen = new Set<string>();
                              const dupSet = new Set<string>();
                              for (const s of students) {
                                const k = String(s.codigo || "")
                                  .trim()
                                  .toLowerCase();
                                if (!k) continue;
                                if (seen.has(k)) dupSet.add(String(s.codigo));
                                else seen.add(k);
                              }
                              setDuplicates(Array.from(dupSet));
                              setPreviewModalOpen(true);
                            }
                          }}
                        />

                        <Button
                          type="primary"
                          size="large"
                          onClick={() => setAttendanceModalOpen(true)}
                          icon={<CheckSquareOutlined />}
                        >
                          Tomar asistencia
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <Empty description="No hay estudiantes inscritos en este curso">
                      <div style={{ marginTop: "24px" }}>
                        <UploadButton
                          buttonConfig={{
                            variant: "fill",
                            className: "color: white ",
                          }}
                          onUpload={async (file, onProgress) => {
                            const students = await processFile(
                              file,
                              onProgress
                            );
                            return students;
                          }}
                          fileConfig={{
                            accept: ".csv,.xlsx,.xls",
                            maxSize: 1 * 1024 * 1024,
                            validationMessage:
                              "Solo se permiten archivos .xlsx o .csv de hasta 1MB",
                          }}
                          processingConfig={{
                            steps: [
                              {
                                key: "upload",
                                title: "Subir archivo",
                                description: "Subiendo archivo",
                              },
                              {
                                key: "parse",
                                title: "Parsear datos",
                                description: "Procesando información",
                              },
                            ],
                            processingText: "Procesando tabla...",
                            successText: "Tabla procesada correctamente",
                          }}
                          onUploadSuccess={(students) => {
                            if (Array.isArray(students)) {
                              setParsedStudents(students);
                              setFileName("archivo.xlsx");
                              const seen = new Set<string>();
                              const dupSet = new Set<string>();
                              for (const s of students) {
                                const k = String(s.codigo || "")
                                  .trim()
                                  .toLowerCase();
                                if (!k) continue;
                                if (seen.has(k)) dupSet.add(String(s.codigo));
                                else seen.add(k);
                              }
                              setDuplicates(Array.from(dupSet));
                              setPreviewModalOpen(true);
                            }
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
                {courseId && <CourseExamsPanel courseId={courseId} />}
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

        <AttendanceModal
          open={attendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          students={students ? students : []}
          classId={id || ""}
        />

        <AbsencesModal
          open={absencesModalOpen}
          onClose={() => setAbsencesModalOpen(false)}
          student={selectedStudent}
          loading={loadingAbsences}
        />
      </div>
    </PageTemplate>
  );
}
