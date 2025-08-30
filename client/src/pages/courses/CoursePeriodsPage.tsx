import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button, Card, Col, Empty, Row, Input, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { courseService } from "../../services/course.service";
import PageTemplate from "../../components/PageTemplate";
import { CreatePeriodForm } from "../../components/CreatePeriodForm";
import usePeriods from "../../hooks/usePeriods";
import type { Course } from "../../interfaces/courseInterface";
import type { Clase } from "../../interfaces/claseInterface";
import { useUserContext } from "../../context/UserContext";
import dayjs from "dayjs";

export function CoursePeriodsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useUserContext();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPeriods, setFilteredPeriods] = useState<Clase[]>([]);

  const { periods, createPeriod, fetchPeriodsByCourse } = usePeriods();

  const loadCourseAndPeriods = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      // Cargar información del curso
      const courseResponse = await courseService.getCourseById(courseId);
      setCourse(courseResponse);

      // Cargar períodos del curso - esto actualizará el estado del hook
      await fetchPeriodsByCourse(courseId);
    } catch (error) {
      message.error("Error al cargar la información del curso");
      console.error("Error loading course and periods:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchPeriodsByCourse]);

  useEffect(() => {
    if (courseId) {
      loadCourseAndPeriods();
    }
  }, [courseId, loadCourseAndPeriods]);

  useEffect(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (lower === "") {
      setFilteredPeriods(periods);
      return;
    }

    const filtered = periods.filter((period) =>
      period.semester.toLowerCase().includes(lower) ||
      period.name.toLowerCase().includes(lower)
    );
    setFilteredPeriods(filtered);
  }, [searchTerm, periods]);

  const handleCreatePeriod = async (periodData: Omit<Clase, "id">) => {
    setCreatingPeriod(true);
    try {
      await createPeriod(periodData);
      if (courseId) {
        await fetchPeriodsByCourse(courseId);
      }
    } catch (error) {
      // El error ya se maneja en el hook
      console.error(error);
    } finally {
      setCreatingPeriod(false);
    }
  };

  const goToPeriod = (periodId: string) => {
    navigate(`/classes/${periodId}`);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  const renderPeriodCards = (items: Clase[]) => {
    return items.length ? (
      <Row gutter={[16, 16]}>
        {items.map((period) => (
          <Col xs={24} sm={12} md={8} lg={6} key={period.id}>
            <Card
              hoverable
              onClick={() => goToPeriod(period.id)}
              style={{
                height: 160,
                textAlign: "center",
                cursor: "pointer",
                borderRadius: 8,
                border: "1px solid #e8e8e8",
                backgroundColor: "#ffffff",
              }}
              styles={{
                body: {
                  padding: "20px 16px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <h2 style={{ 
                  fontSize: "18px", 
                  fontWeight: "bold", 
                  margin: 0,
                  color: "#1A2A80",
                  lineHeight: "1.2"
                }}>
                  {period.semester}
                </h2>
              </div>
              
              <div style={{ 
                fontSize: "13px", 
                color: "#666",
                lineHeight: "1.4"
              }}>
                <div style={{ marginBottom: "2px" }}>
                  Inicio: {dayjs(period.dateBegin).format("DD/MM/YYYY")}
                </div>
                <div>
                  Fin: {dayjs(period.dateEnd).format("DD/MM/YYYY")}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    ) : (
      <Empty 
        description="No hay períodos creados para esta materia"
        style={{ 
          margin: "40px 0",
          padding: "20px",
        }}
      />
    );
  };

  if (loading) {
    return (
      <PageTemplate
        title="Períodos"
        subtitle="Cargando información..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Materias", href: "/courses" },
          { label: "Cargando..." }
        ]}
      >
        <div style={{ textAlign: "center", padding: "50px" }}>
          <div>Cargando curso y períodos...</div>
        </div>
      </PageTemplate>
    );
  }

  if (!course) {
    return (
      <PageTemplate
        title="Curso no encontrado"
        subtitle="No se pudo cargar la información del curso"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Materias", href: "/courses" },
          { label: "Error" }
        ]}
      >
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Empty description="Curso no encontrado" />
          <Button type="primary" onClick={() => navigate("/courses")}>
            Volver a Materias
          </Button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title={course.name}
      subtitle="Períodos en los que se dictó esta materia"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Materias", href: "/courses" },
        { label: course.name }
      ]}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px",
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
            gap: "12px"
          }}
        >
          <div>
            <Input
              placeholder="Buscar período..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              style={{ 
                width: 240,
                borderRadius: 8
              }}
            />
          </div>
          {user?.roles.includes("docente") && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              style={{ 
                borderRadius: 8,
                fontWeight: "500"
              }}
            >
              Crear Período
            </Button>
          )}
        </div>

        {/* Grid de períodos */}
        {renderPeriodCards(filteredPeriods)}

        {/* Modal para crear período */}
        {course && (
          <CreatePeriodForm
            open={modalOpen}
            onClose={handleModalCancel}
            onSubmit={handleCreatePeriod}
            course={course}
            loading={creatingPeriod}
          />
        )}
      </div>
    </PageTemplate>
  );
}
