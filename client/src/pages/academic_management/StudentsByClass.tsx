import { useParams, useNavigate } from "react-router-dom";
import useClasses from "../../hooks/useClasses";
import { useEffect, useState } from "react";
import { Button, Card, Table, Space, message } from "antd";
import { StudentUpload } from "../../components/studentUpload";
import { CursosForm } from "../../components/cursosForm";
import { SingleStudentForm } from "../../components/singleStudentForm";
import {
  DownloadOutlined,
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { createEnrollmentInterface } from "../../interfaces/enrollmentInterface";
import useEnrollment from "../../hooks/useEnrollment";
import PageTemplate from "../../components/PageTemplate";
import type { Clase } from "../../interfaces/claseInterface";
import { SafetyModal } from "../../components/safetyModal";
import StudentPreviewModal from "../../components/StudentPreviewModal";
import type { EnrollGroupRow } from "../../interfaces/enrollmentInterface";
import useStudents from "../../hooks/useStudents";

export function StudentsByClass() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const { id } = useParams<{ id: string }>();
  const { fetchClassById, actualClass, updateClass, softDeleteClass } = useClasses();
  const { enrollSingleStudent, enrollGroupStudents } = useEnrollment();
  const { students, fetchStudentsByClass } = useStudents();

  const [formOpen, setFormOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState<string>("archivo.xlsx");
  const [dups, setDups] = useState<string[]>([]);
  const [parsed, setParsed] = useState<Array<Record<string, any> & { nombres: string; apellidos: string; codigo: number }>>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) { setReady(true); return; }
      setReady(false);
      await fetchClassById(id);
      await fetchStudentsByClass(id);
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async (values: createEnrollmentInterface) => {
    try {
      await enrollSingleStudent(values);
      message.success("Estudiante inscrito");
      if (id) fetchClassById(id);
    } catch {
      message.error("No se pudo inscribir al estudiante");
    }
  };

  const handleEdit = () => setModalOpen(true);

  const handleUpdateClase = async (values: Clase) => {
    if (!values.id) return;
    try {
      await updateClass(values);
      message.success("Se ha actualizado la clase correctamente");
      setModalOpen(false);
    } catch {
      message.error("Ha ocurrido un error actualizando la clase");
    }
  };

  const handleDeleteClase = async () => setSafetyOpen(true);

  const confirmDeleteClase = async () => {
    try {
      if (!id) {
        handleSoftDeleteError();
        return;
      }
      const data = await softDeleteClass(id);
      if (data && !data.success) {
        handleSoftDeleteError();
        return;
      }
      message.success("Curso eliminado correctamente");
      setTimeout(() => {
        navigate(`/classes`);
      }, 3000);
    } catch {
      handleSoftDeleteError();
    } finally {
      setSafetyOpen(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!id) return;

    const seen = new Set<string>();
    const filtered = parsed.filter((r) => {
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
      const res = await enrollGroupStudents({
        classId: id,
        studentRows: payloadRows,
      });

      const meta = res?.data;
      message.success(
        `Procesado: ${meta?.totalRows ?? 0} · Éxito: ${meta?.successRows ?? 0} · Ya inscritos: ${meta?.existingRows ?? 0} · Errores: ${meta?.errorRows ?? 0}`
      );

      setPreviewOpen(false);
      setParsed([]);
      setDups([]);
      fetchClassById(id);
    } catch (e: any) {
      message.error(e?.message || "No se pudo inscribir el grupo.");
    } finally {
      setSending(false);
    }
  };

  const handleSoftDeleteError = () => {
    message.error("Ocurrió un error al eliminar el curso. Inténtalo más tarde.");
  };

  const columns = [
    { title: "Nombres", dataIndex: "name", key: "nombres" },
    { title: "Apellidos", dataIndex: "lastname", key: "apellidos" },
    { title: "Código", dataIndex: "code", key: "codigo" },
    { title: "Asistencia", dataIndex: "asistencia", key: "asistencia" },
    { title: "1er Parcial", dataIndex: "1er_parcial", key: "1er_parcial" },
    { title: "2do Parcial", dataIndex: "2do_parcial", key: "2do_parcial" },
    { title: "Final", dataIndex: "final", key: "final" },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, record: any) => {
        const isLoading = downloadingId === record.code;
        return (
          <Button
            type="default"
            icon={<DownloadOutlined />}
            loading={isLoading}
            onClick={async () => {
              try {
                setDownloadingId(record.code);
                // const key =
                //   record.documentKey ?? `documents/${record.code}.pdf`;
                message.success("Descarga iniciada");
              } catch (e: unknown) {
                const err = e as Error;
                message.error(err?.message || "Error al descargar");
              } finally {
                setDownloadingId(null);
              }
            }}
          >
            Descargar
          </Button>
        );
      },
    },
  ];

  const hasStudents = Array.isArray(students) && students.length > 0;

  return (
    <PageTemplate
      title={`Curso: ${actualClass?.name}`}
      subtitle={`Lista de datos del curso ${actualClass?.name}`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Períodos", href: "/classes" },
        { label: `${actualClass?.name}`, href: `/classes/${actualClass?.id}` },
      ]}
    >
      <div style={{ padding: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Button
            type="primary"
            icon={<FolderOutlined />}
            onClick={() => navigate(`/curso/${id}/documents`)}
            style={{ margin: 4, width: 150 }}
          >
            Documentos
          </Button>

          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
            style={{ margin: 4, width: 150 }}
          >
            Editar Curso
          </Button>

          <CursosForm
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={handleUpdateClase}
            clase={actualClass}
          />

          <Button
            type="primary"
            icon={<DeleteOutlined />}
            onClick={handleDeleteClase}
            style={{ margin: 4, width: 150, backgroundColor: "#bb1717ff" }}
          >
            Eliminar Curso
          </Button>
        </div>

        {!ready ? null : hasStudents ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Space>
                <Button style={{ margin: 4, width: 120 }} type="primary" onClick={() => {}}>
                  1er Parcial
                </Button>
                <Button style={{ margin: 4, width: 120 }} type="primary" onClick={() => {}}>
                  2do Parcial
                </Button>
                <Button style={{ margin: 4, width: 120 }} type="primary" onClick={() => {}}>
                  Final
                </Button>
              </Space>
            </div>
            <Table
              columns={columns}
              dataSource={students || []}
              rowKey={(record) => record.code}
              pagination={{ pageSize: 20 }}
              bordered
            />
            <Button
              style={{ margin: 4, width: 120 }}
              type="primary"
              onClick={() => {
                setFormOpen(true);
              }}
            >
              Añadir Estudiante
            </Button>
          </>
        ) : (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 20,
            }}
          >
            <Card
              style={{
                width: "80%",
                height: "100%",
                textAlign: "center",
                borderRadius: 20,
              }}
            >
              <h2>No hay estudiantes asignados a este curso.</h2>
              <StudentUpload
                disabled={hasStudents}
                onStudentsParsed={(parsedStudents, info) => {
                  setParsed(parsedStudents);
                  if (info?.fileName) setFileName(info.fileName);

                  const seen = new Set<string>();
                  const dupSet = new Set<string>();
                  for (const s of parsedStudents) {
                    const k = String(s.codigo || "").trim().toLowerCase();
                    if (!k) continue;
                    if (seen.has(k)) dupSet.add(String(s.codigo));
                    else seen.add(k);
                  }
                  setDups(Array.from(dupSet));

                  setPreviewOpen(true);
                }}
              />
            </Card>
          </div>
        )}

        <SingleStudentForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
          }}
          onSubmit={async (values) => {
            if (!id) return;
            const data: createEnrollmentInterface = {
              ...values,
              classId: id,
            };
            await handleSubmit(data);
          }}
        />

        <StudentPreviewModal
          open={previewOpen}
          data={parsed}
          duplicates={dups}
          meta={{ fileName, totalRows: parsed.length }}
          loading={sending}
          onCancel={() => setPreviewOpen(false)}
          onConfirm={handleConfirmSend}
        />
      </div>
      <SafetyModal
        open={safetyOpen}
        onCancel={() => setSafetyOpen(false)}
        onConfirm={confirmDeleteClase}
        title="¿Eliminar curso?"
        message={`¿Estás seguro de que quieres eliminar el curso "${actualClass?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
      />
    </PageTemplate>
  );
}
