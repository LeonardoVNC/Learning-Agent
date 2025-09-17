import { useEffect, useState } from 'react';
import { Button, Typography, Empty } from 'antd';
import { listClassExams, deleteExamAny, type CourseExamRow } from '../../services/exams.service';
import ExamTable from '../../components/exams/ExamTable';
import { useNavigate } from 'react-router-dom';
import type { ExamSummary } from '../../store/examsStore';

const { Title, Text } = Typography;

type Props = {
  courseId: string; // subject
  classId: string;  // period
};

/**
 * Extrae posibles IDs desde una fila con estructura variable, evitando `any`.
 * Se permite indexación dinámica localmente con Record<string, unknown>.
 */
function extractIdCandidates(r: CourseExamRow, courseId: string): string[] {
  const vals = new Set<string>();
  const rec = r as unknown as Record<string, unknown>;

  const push = (v: unknown) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s || s === courseId) return;
    vals.add(s);
  };

  // Campos planos típicos
  ([
    'id', 'uuid',
    'examId', 'exam_id', 'examUuid', 'exam_uuid',
    'approvedExamId', 'approved_exam_id',
    'approvedId', 'approved_id',
    'publicExamId', 'public_exam_id',
  ] as const).forEach((k) => push(rec[k]));

  // Campos anidados comunes
  (['exam', 'approvedExam', 'approved', 'examen', 'aprobado'] as const).forEach((k) => {
    const o = rec[k];
    if (o && typeof o === 'object') {
      const obj = o as Record<string, unknown>;
      (['id', 'uuid', 'examId', 'approvedExamId'] as const).forEach((kk) => push(obj[kk]));
    }
  });

  // Heurística: cualquier clave que termine en id/_id
  Object.keys(rec).forEach((k) => {
    if (/id$/i.test(k) || /_id$/i.test(k)) push(rec[k]);
  });

  return Array.from(vals);
}

export default function CourseExamsPanel({ courseId, classId }: Props) {
  const [tableData, setTableData] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    listClassExams(classId)
      .then((rows: CourseExamRow[]) => {
        const mapped: ExamSummary[] = (rows || []).map((r) => {
          const candidates = extractIdCandidates(r, courseId);
          const primary = candidates[0] ?? String((r as unknown as { id?: unknown }).id ?? '');

          return {
            id: primary,
            title: r.title || 'Examen',
            status: r.status === 'Publicado' ? 'published' : 'draft',
            visibility: 'visible',
            createdAt: r.createdAt ?? new Date().toISOString(),
            publishedAt:
              r.status === 'Publicado'
                ? (r.updatedAt ?? r.createdAt ?? new Date().toISOString())
                : undefined,
            totalQuestions: Number((r as unknown as { questionsCount?: unknown }).questionsCount ?? 0),
            counts: { multiple_choice: 0, true_false: 0, open_analysis: 0, open_exercise: 0 },
          };
        });
        setTableData(mapped);
      })
      .finally(() => setLoading(false));
  }, [classId, courseId]);

  const Header = (
    <div className="flex items-center justify-between mb-2">
      <Title level={4} style={{ margin: 0 }}>Exámenes de esta materia</Title>
      <Button
        type="primary"
        onClick={() => navigate(`/exams/create?classId=${classId}&courseId=${courseId}`)}
      >
        Crear examen
      </Button>
    </div>
  );

  if (loading && tableData.length === 0) return <div className="mt-4">{Header}</div>;

  return (
    <div className="mt-4">
      {tableData.length > 0 ? (
        <>
          {Header}
          <div id="tabla-examenes-curso">
            <ExamTable
              data={tableData}
              disableStatusControls
              onEdit={() => navigate(`/exams/create?classId=${classId}&courseId=${courseId}`)}
              onDelete={async (id) => {
                await deleteExamAny(id);
                const rows = await listClassExams(classId);
                const mapped: ExamSummary[] = (rows || []).map((r) => {
                  const candidates = extractIdCandidates(r, courseId);
                  const primary = candidates[0] ?? String((r as unknown as { id?: unknown }).id ?? '');
                  return {
                    id: primary,
                    title: r.title || 'Examen',
                    status: r.status === 'Publicado' ? 'published' : 'draft',
                    visibility: 'visible',
                    createdAt: r.createdAt ?? new Date().toISOString(),
                    publishedAt:
                      r.status === 'Publicado'
                        ? (r.updatedAt ?? r.createdAt ?? new Date().toISOString())
                        : undefined,
                    totalQuestions: Number((r as unknown as { questionsCount?: unknown }).questionsCount ?? 0),
                    counts: { multiple_choice: 0, true_false: 0, open_analysis: 0, open_exercise: 0 },
                  };
                });
                setTableData(mapped);
              }}
            />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Empty description="Aún no hay exámenes para este curso">
            <Text style={{ fontSize: 14 }}>Los exámenes creados aparecerán aquí para su gestión.</Text>
          </Empty>
          <Button
            type="primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(`/exams/create?classId=${classId}&courseId=${courseId}`)}
          >
            Crear examen
          </Button>
        </div>
      )}
    </div>
  );
}
