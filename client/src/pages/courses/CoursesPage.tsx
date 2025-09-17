import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, Space, Input, message } from "antd";
import { PlusOutlined, SolutionOutlined } from "@ant-design/icons";

import { CreateCourseForm } from "./CreateCourseForm";
import AccessDenied from "../../components/shared/AccessDenied";
import CustomCard from "../../components/shared/CustomCard";
import type { Course, CreateCourseDTO } from "../../interfaces/courseInterface";
import GlobalScrollbar from '../../components/GlobalScrollbar';
import PageTemplate from "../../components/PageTemplate";
import useCourses from "../../hooks/useCourses";
import { useUserStore } from "../../store/userStore";

export default function CoursesPage() {
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);
  const { courses, createCourse, fetchCoursesByTeacher } = useCourses();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(courses);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const fetchCourses = useCallback(async () => {
    if (!user) return

    const res = await fetchCoursesByTeacher(user.id)
    if (res.state == "error") {
      message.error(res.message);
      return
    }
  }, [user])

  useEffect(() => {
    fetchCourses()
  }, [user, fetchCourses])

  useEffect(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (lower == "") {
      setFilteredCourses(courses);
      return;
    }

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

  const goToCourse = (id: string) => {
    navigate(`${id}/periods`);
  };

  const goToExams = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${id}/exams`);
  };

  const goToMaterials = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${id}/documents`);
  };

  const handleAddCourse = async (values: CreateCourseDTO) => {
    if (!values) {
      message.error("No se pueden enviar datos vacíos")
      return
    }
    const res = await createCourse(values.name);
    if (res.state == "error") {
      message.error(res.message)
      return
    }
    message.success(res.message)
  };

  return (
    <>
      {user?.roles.includes("docente") ? (
        <PageTemplate
          title="Materias"
          subtitle="Revisa a detalle las materias que dictaste en algún momento."
          breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Materias" }]}
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
            <CreateCourseForm
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSubmit={handleAddCourse}
            />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <Space>
                <Input
                  placeholder="Buscar materia"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{ minWidth: 120, maxWidth: 300, width: '100%' }}
                />
              </Space>
              {user?.roles.includes("docente") && (
                <Button type="primary" onClick={() => setModalOpen(true)}>
                  <PlusOutlined />
                  Registrar materia
                </Button>
              )}
            </div>

            {filteredCourses.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {filteredCourses.map((course) => (
                  <CustomCard
                    status="default"
                    style={{ marginBottom: "16px" }}
                    onClick={() => goToCourse(course.id)}
                    key={course.id}
                  >
                    <CustomCard.Header
                      icon={<SolutionOutlined />}
                      title={course.name}
                    />
                    <CustomCard.Description>
                      {`Vea a detalle los períodos que ha dictado en ${course.name}`}
                    </CustomCard.Description>
                    <CustomCard.Actions>
                      <Button
                        type="primary"
                        onClick={(e) => goToExams(course.id, e)}
                      >
                        Exámenes
                      </Button>
                      <Button
                        onClick={(e) => goToMaterials(course.id, e)}
                      >
                        Materiales
                      </Button>
                    </CustomCard.Actions>
                  </CustomCard>
                ))}
              </div>
            ) : (
              <Empty description="No hay materías todavía." />
            )}
          </div>
        </PageTemplate>
      ) : (
        <AccessDenied />
      )}
    </>
  );
}