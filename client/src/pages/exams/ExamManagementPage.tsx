import { Card, Typography, theme } from 'antd';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import ExamTable from '../../components/exams/ExamTable';
import { useExamsStore } from '../../store/examsStore';
import PageTemplate from '../../components/PageTemplate';
import GlobalScrollbar from '../../components/GlobalScrollbar';
import useCourses from '../../hooks/useCourses'; 


const { Title, Text } = Typography;

export default function ExamManagementPage() {
  const { token } = theme.useToken();
  const exams = useExamsStore((s) => s.exams);
  const { courseId } = useParams<{ courseId: string }>();
  
  // Hook para obtener información del curso
  const { actualCourse, getCourseByID } = useCourses();

  // Obtener información del curso si tenemos courseId
  useEffect(() => {
    if (courseId && !actualCourse) {
      getCourseByID(courseId);
    }
  }, [courseId, actualCourse, getCourseByID]);

  const total = exams.length;
  const published = exams.filter((e) => e.status === "published").length;
  const scheduled = exams.filter((e) => e.status === "scheduled").length;

  // Breadcrumbs dinámicos basados en contexto
  const breadcrumbs = courseId 
    ? [
        { label: 'Inicio', href: '/' },
        { label: 'Materias', href: '/professor/courses' },
        { label: actualCourse?.name || 'Curso', href: `/professor/courses/${courseId}/periods` },
        { label: 'Exámenes' }
      ]
    : [
        { label: 'Inicio', href: '/' },
        { label: 'Materias', href: '/professor/courses' },
        { label: 'Gestión de Exámenes'}
      ];

  return (
    <PageTemplate
          title="Exámenes"
          subtitle="Gestiona todos los exámenes que creaste"
          breadcrumbs={breadcrumbs}
        >

      <GlobalScrollbar />
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ borderLeft: `4px solid ${token.colorPrimary}` }}>
          <Title level={4} style={{ margin: 0 }}>
            Total
          </Title>
          <Text type="secondary">{total} exámenes</Text>
        </Card>
        <Card style={{ borderLeft: `4px solid ${token.colorSuccess}` }}>
          <Title level={4} style={{ margin: 0 }}>
            Publicados
          </Title>
          <Text type="secondary">{published}</Text>
        </Card>
        <Card style={{ borderLeft: `4px solid ${token.colorInfo}` }}>
          <Title level={4} style={{ margin: 0 }}>
            Programados
          </Title>
          <Text type="secondary">{scheduled}</Text>
        </Card>
      </div>

      <div id="tabla-examenes" style={{ marginTop: 24 }}>
        <ExamTable
          data={exams}
          onEdit={() => {
            window.location.href = "/exams/create";
          }}
        />
      </div>

        <div id="tabla-examenes">
          <ExamTable
            data={exams}
            onEdit={() => { window.location.href = '/professor/exams/create'; }}
          />
        </div>

        <div id="fin-examenes" />

    </PageTemplate>
  );
}
