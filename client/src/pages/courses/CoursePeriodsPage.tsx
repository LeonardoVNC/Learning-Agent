import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Empty, Input, message } from "antd";
import { PlusOutlined, ReadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "../../components/shared/AccessDenied";
import type { Clase, CreateClassDTO } from "../../interfaces/claseInterface";
import CustomCard from "../../components/shared/CustomCard";
import GlobalScrollbar from '../../components/GlobalScrollbar';
import PageTemplate from "../../components/PageTemplate";
import PeriodForm from "../../components/PeriodForm";
import useClasses from "../../hooks/useClasses";
import useCourses from "../../hooks/useCourses";
import { useUserStore } from "../../store/userStore";

export default function CoursePeriodsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPeriods, setFilteredPeriods] = useState<Clase[]>([]);

  const { classes, createClass, fetchClassesByCourse } = useClasses();
  const { actualCourse, getCourseByID } = useCourses();

  const fetchCoursePeriods = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);

    const courseRes = await getCourseByID(courseId);
    if (courseRes.state == "error") {
      setLoading(false);
      message.error(courseRes.message);
      return;
    }

    const periodsRes = await fetchClassesByCourse(courseId);
    if (periodsRes.state == "error") {
      setLoading(false);
      message.error(periodsRes.message);
      return;
    }

    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCoursePeriods();
    }
  }, [courseId, fetchCoursePeriods]);

  useEffect(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (lower === "") {
      setFilteredPeriods(classes);
      return;
    }

    const filtered = classes.filter(
      (period) =>
        period.semester.toLowerCase().includes(lower) ||
        period.name.toLowerCase().includes(lower)
    );
    setFilteredPeriods(filtered);
  }, [searchTerm, classes]);

  const handleCreatePeriod = async (periodData: Clase | CreateClassDTO) => {
    if (!courseId) return;

    setCreatingPeriod(true);
    let createData: CreateClassDTO;
    if ("courseId" in periodData && typeof periodData.courseId === "string") {
      createData = periodData as CreateClassDTO;
    } else {
      createData = {
        semester: periodData.semester,
        dateBegin: periodData.dateBegin,
        dateEnd: periodData.dateEnd,
        courseId: courseId,
        teacherId: periodData.teacherId,
      };
    }
    const res = await createClass(createData);
    if (res.state == "error") {
      message.error(res.message);
      setCreatingPeriod(false);
      return;
    }
    message.success(res.message);
    await fetchClassesByCourse(courseId);
    setCreatingPeriod(false);
  };

  const goToPeriod = (periodId: string) => {
    navigate(`${periodId}`);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  if (loading) {
    return (
      <PageTemplate
        title="Períodos"
        subtitle="Cargando información..."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Materias", href: "/professor/courses" },
          { label: "Cargando..." }
        ]}
      >
        <GlobalScrollbar />        
        <div style={{ textAlign: "center", padding: "50px" }}>
          <div>Cargando curso y períodos...</div>
        </div>
      </PageTemplate>
    );
  }

  if (!actualCourse) {
    return (
      <PageTemplate
        title="Curso no encontrado"
        subtitle="No se pudo cargar la información del curso"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Materias", href: "/professor/courses" },
          { label: "Error" }
        ]}
      >
        <GlobalScrollbar />                
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Empty description="Curso no encontrado" />
          <Button type="primary" onClick={() => navigate(-1)}>
            Volver a Materias
          </Button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <>
      {user?.roles.includes("docente") ? (
        <PageTemplate
          title={actualCourse.name}
          subtitle="Períodos en los que se dictó esta materia"
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Materias", href: "/professor/courses" },
            { label: actualCourse.name }
          ]}
        >
        <GlobalScrollbar />        
          <div
            style={{
              maxWidth: '100%',
              width: '100%',
              margin: '0 auto',
              padding: '24px 16px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header con búsqueda y botón crear */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <Input
                  placeholder="Buscar período"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{
                    minWidth: 120,
                    maxWidth: 300,
                    width: '100%',
                    borderRadius: 8,
                  }}
                  className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              {user?.roles.includes("docente") && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalOpen(true)}
                  style={{
                    borderRadius: 8,
                    fontWeight: "500",
                  }}
                >
                  Crear Período
                </Button>
              )}
            </div>

            {filteredPeriods.length > 0 ? (
              <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 min-[1367px]:grid-cols-3 gap-4 md:gap-6">
                {filteredPeriods.map((period) => (
                  <div key={period.id}>
                    <CustomCard
                      status="default"
                      onClick={() => goToPeriod(period.id)}
                      style={{ width: '100%' }}
                    >
                      <CustomCard.Header
                        icon={<ReadOutlined />}
                        title={period.semester}
                      />
                      <CustomCard.Description>
                        {`Consulte la información de ${period.name}`}
                      </CustomCard.Description>
                      <CustomCard.Body>
                        <div style={{ marginBottom: "2px" }}>
                          Inicio: {dayjs(period.dateBegin).format("DD/MM/YYYY")}
                        </div>
                        <div>
                          Fin: {dayjs(period.dateEnd).format("DD/MM/YYYY")}
                        </div>
                      </CustomCard.Body>
                    </CustomCard>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description="No hay períodos creados para esta materia"
                style={{
                  margin: "40px 0",
                  padding: "20px",
                }}
              />
            )}

            {/* Modal para crear período */}
            {actualCourse && (
              <PeriodForm
                open={modalOpen}
                onClose={handleModalCancel}
                onSubmit={handleCreatePeriod}
                course={actualCourse}
                loading={creatingPeriod}
              />
            )}
          </div>
        </PageTemplate>
      ) : (
        <AccessDenied />
      )}
    </>
  );
}