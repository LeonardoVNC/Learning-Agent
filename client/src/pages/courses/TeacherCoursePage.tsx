import { Button, Card, Col, Empty, Row, Space, Input } from "antd";
import PageTemplate from "../../components/PageTemplate";
import { useEffect, useState } from "react";
import useCourses from "../../hooks/useCourses";
import useClasses from "../../hooks/useClasses";
import { getPeriodsByCourse } from "../../services/classesService";
import type { Course } from "../../interfaces/courseInterface";
import type { Clase } from "../../interfaces/claseInterface";
import { useNavigate } from "react-router-dom";
import { CreateCourseForm } from "./CreateCourseForm";
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useUserContext } from "../../context/UserContext";
import { CreatePeriodForm } from "../../components/CreatePeriodForm";
import dayjs from "dayjs";

export function TeacherCoursePage() {
  const { user, fetchUser } = useUserContext();
  const { courses, createCourse } = useCourses();
  const { clases, createClass } = useClasses();
  const [modalOpen, setModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(courses || []);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [coursePeriods, setCoursePeriods] = useState<Clase[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (lower == "") {
      setFilteredCourses(courses || []);
      return;
    }

    if (!courses) return;

    const words = lower.split(" ");
    const specialChars = /[!@#$%^&*?:{}|<>]/;

    const filterWords = (c: Course, words: string[]) => {
      let match = true;
      for (const word of words) {
        if (!match) return false;
        if (specialChars.test(word)) continue;
        match = match && c.name.toString().toLowerCase().includes(word);
      }
      return match;
    };

    const filtered = courses.filter((c) => filterWords(c, words));
    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  const goToCourse = (course: Course) => {
    handleCourseClick(course);
  };

  const goToExams = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/exams/${id}`);
  };

  const goToMaterials = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/materials/${id}`);
  };

  const handleAddCourse = (values: any) => {
    createCourse(values.name);
  };

  const loadCoursePeriods = async (courseId: string) => {
    try {
      const periods = await getPeriodsByCourse(courseId);
      setCoursePeriods(periods);
    } catch (error) {
      console.error('Error loading periods:', error);
    }
  };

  const handleCourseClick = async (course: Course) => {
    navigate(`/courses/${course.id}/periods`);
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setCoursePeriods([]);
  };

  const handlePeriodClick = (period: Clase) => {
    navigate(`/courses/${period.id}`);
  };

  const handlePeriodCreated = async (periodData: Omit<Clase, "id">) => {
    try {
      await createClass(periodData);
      
      if (selectedCourse) {
        await loadCoursePeriods(selectedCourse.id);
      }
      
      setPeriodModalOpen(false);
    } catch (error) {
      console.error('Error creating period:', error);
    }
  };

  const renderGrid = (items: Course[]) =>
    items?.length ? (
      <Row gutter={[16, 16]}>
        {items.map((course) => (
          <Col xs={24} sm={12} md={8} lg={8} key={course.id}>
            <Card
              hoverable
              onClick={() => goToCourse(course)}
              style={{
                width: "100%",
                height: 180,
                textAlign: "center",
                borderRadius: 20,
                padding: "12px",
                display: "flex",
                flexDirection: "column",
              }}
              styles={{
                body: {
                  padding: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                },
              }}
            >
              <div
                style={{
                  flex: "1 1 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 0,
                  marginBottom: "12px",
                }}
              >
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    lineHeight: "1.3",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    margin: 0,
                    maxHeight: "calc(2 * 1.3em)",
                    wordBreak: "break-word",
                  }}
                >
                  {course.name}
                </h1>
              </div>

              <div
                style={{
                  flex: "0 0 auto",
                  height: "82px",
                }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    style={{ width: "100%" }}
                    onClick={(e) => goToExams(course.id, e)}
                  >
                    Exámenes
                  </Button>
                  <Button
                    style={{ width: "100%" }}
                    onClick={(e) => goToMaterials(course.id, e)}
                  >
                    Materiales
                  </Button>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    ) : (
      <Empty description="No hay materías todavía." />
    );

  const renderPeriodsView = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToCourses}
            style={{ padding: '4px 8px' }}
          >
            Volver a Materias
          </Button>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            {selectedCourse?.name} - Períodos
          </h2>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setPeriodModalOpen(true)}
        >
          Crear Período
        </Button>
      </div>

      {coursePeriods.length > 0 ? (
        <Row gutter={[16, 16]} key="periods-row">
          {coursePeriods.map((period, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={`period-${period.id || index}`}>
              <Card
                hoverable
                onClick={() => handlePeriodClick(period)}
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>
                    {period.semester}
                  </h3>
                  <p style={{ margin: 0, color: '#666' }}>
                    {dayjs(period.dateBegin).format('DD/MM/YYYY')} - {dayjs(period.dateEnd).format('DD/MM/YYYY')}
                  </p>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No hay períodos creados para esta materia." />
      )}

      <CreatePeriodForm
        open={periodModalOpen}
        course={selectedCourse!}
        onClose={() => setPeriodModalOpen(false)}
        onSubmit={handlePeriodCreated}
      />
    </div>
  );

  return (
    <PageTemplate
      title={selectedCourse ? `${selectedCourse.name} - Períodos` : "Materias"}
      subtitle={selectedCourse ? "Gestiona los períodos de la materia" : "Revisa a detalle las materias que dictaste en algún momento."}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Materias" }]}
    >
      <div
        className="w-full lg:max-w-6xl lg:mx-auto space-y-4 sm:space-y-6"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 24px",
        }}
      >
        {selectedCourse ? renderPeriodsView() : (
          <>
            <CreateCourseForm
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSubmit={handleAddCourse}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Space>
                <Input
                  placeholder="Buscar materia"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{ width: 240 }}
                />
              </Space>
              {user?.roles.includes("docente") && (
                <Button type="primary" onClick={() => setModalOpen(true)}>
                  <PlusOutlined />
                  Registrar materia
                </Button>
              )}
            </div>

            {renderGrid(filteredCourses)}
          </>
        )}
      </div>
    </PageTemplate>
  );
}