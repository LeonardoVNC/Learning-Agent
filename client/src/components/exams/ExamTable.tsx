import { Button, Table, Tag, Tooltip, Typography, theme, Modal, DatePicker, Radio, message, Space, Popconfirm, Dropdown } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, EditOutlined, UploadOutlined, FilePdfOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useExamsStore, type ExamSummary, type ExamsState } from '../../store/examsStore';
import { readJSON } from '../../services/storage/localStorage';

const { Text } = Typography;

type Props = {
  data: ExamSummary[];
  onEdit?: (exam?: ExamSummary) => void;
  onDelete?: (id: string) => Promise<void> | void;
  disableStatusControls?: boolean;
};

function fmt(dateIso?: string) {
  if (!dateIso) return '—';
  try {
    return new Date(dateIso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return '—';
  }
}

function StatusVisibility({ exam }: { exam: ExamSummary }) {
  const isHidden = exam.visibility === 'hidden';
  if (isHidden) {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
        <Tag color="error">Oculto</Tag>
        <span className="text-[12px] text-[var(--app-color-text-tertiary)]">No visible al alumnado</span>
      </div>
    );
  }
  if (exam.status === 'published') {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
        <Tag color="success">Publicado</Tag>
        <span className="text-[12px] text-[var(--app-color-text-tertiary)]">Visible • Publicado: {fmt(exam.publishedAt)}</span>
      </div>
    );
  }
  if (exam.status === 'scheduled') {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
        <Tag color="processing">Programado</Tag>
        <span className="text-[12px] text-[var(--app-color-text-tertiary)]">Visible • Programado: {fmt(exam.publishedAt)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
      <Tag color="default">Borrador</Tag>
      <span className="text-[12px] text-[var(--app-color-text-tertiary)]">Visible • Aún no publicado</span>
    </div>
  );
}

type PrintableQuestion = {
  id: string;
  n: number;
  source: 'ai' | 'manual';
  type: 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';
  text: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  expectedAnswer?: string;
  answer?: string;
};

type PrintableExam = {
  examId: string;
  title: string;
  subject: string;
  teacher: string;
  createdAt?: string;
  questions: PrintableQuestion[];
};

type PrintMode = 'questions_only' | 'questions_answers';

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function answerOf(q: PrintableQuestion): string | undefined {
  if (q.answer && String(q.answer).trim()) return q.answer;
  if (typeof q.correctBoolean === 'boolean') return q.correctBoolean ? 'Verdadero' : 'Falso';
  if (typeof q.correctOptionIndex === 'number' && Array.isArray(q.options)) {
    const i = q.correctOptionIndex;
    if (i >= 0 && i < q.options.length) return q.options[i];
  }
  if (q.expectedAnswer && String(q.expectedAnswer).trim()) return q.expectedAnswer;
  return undefined;
}

function renderQuestion(q: PrintableQuestion, withAnswers: boolean): string {
  const text = escapeHtml(q.text);
  let html = `<div class="q">
    <div class="q-num">(${q.n})</div>
    <div class="q-body">
      <div class="q-text">${text}</div>`;

  if (q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.length) {
    html += `<ol class="q-options">`;
    q.options.forEach((opt) => {
      html += `<li>${escapeHtml(opt)}</li>`;
    });
    html += `</ol>`;
  }

  if (withAnswers) {
    const ans = answerOf(q);
    html += `<div class="q-answer"><b>Respuesta:</b> ${ans ? escapeHtml(ans) : '—'}</div>`;
  }

  html += `</div></div>`;
  return html;
}

function buildPlantillaHtml(data: PrintableExam, mode: PrintMode): string {
  const withAnswers = mode === 'questions_answers';
  const total = data.questions?.length ?? 0;

  const questionsHtml = (data.questions || [])
    .map(q => renderQuestion(q, withAnswers))
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(data.title)}</title>
  <style>
    @page { size: A4; margin: 24mm 18mm 18mm 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
    .box { border: 1px solid #999; border-radius: 6px; padding: 6mm; }
    .note { font-size: 9pt; color: #333; line-height: 1.35; white-space: pre-wrap; }
    .student { margin-top: 6mm; }
    .student .field { display: grid; grid-template-columns: 22mm 1fr; gap: 3mm; margin: 1.5mm 0; }
    .q { display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; margin: 5mm 0; page-break-inside: avoid; }
    .q-num { font-weight: bold; }
    .q-text { margin-bottom: 2mm; }
    .q-options { margin: 0 0 2mm 18px; }
    .q-answer { margin-top: 2mm; color: #0a4; }
    .footer { margin-top: 10mm; font-size: 9pt; color: #444; }
    .hdr { border-bottom: 2px solid #111; padding-bottom: 4mm; margin-bottom: 6mm; font-weight: 700;}
  </style>
</head>
<body>
  <div class="hdr">PRUEBA VÁLIDA PARA LA CALIFICACIÓN: &nbsp; parcial 1a &nbsp;&nbsp; parcial 2a &nbsp;&nbsp; final</div>

  <div class="grid">
    <div class="box">
      <div><b>MATERIA:</b> ${escapeHtml(data.subject || '—')}</div>
      <div><b>DOCENTE:</b> ${escapeHtml(data.teacher || '—')}</div>
      <div><b>Título:</b> ${escapeHtml(data.title)}</div>
      <div><b>Puntaje total de la prueba:</b> 100 puntos</div>
      <div><b>Fecha:</b> ${escapeHtml(new Date(data.createdAt || Date.now()).toLocaleDateString('es-ES'))}</div>
      <div><b>Tipo de impresión:</b> ${withAnswers ? 'Preguntas + Respuestas' : 'Solo preguntas'}</div>
      <div><b>Cantidad de preguntas:</b> ${total}</div>
    </div>
    <div class="box note">
      ACTÚA CON HONESTIDAD ACADÉMICA
      El fraude académico en exámenes, trabajos, prácticas o cualquier otra actividad de la materia, ya sea por intención o ejecución, es sancionado con la reprobación automática de la materia.
      Cualquier sanción por fraude académico implica la pérdida del derecho a acceder al cuadro de honor y a la graduación con honores. La reincidencia puede concluir con la expulsión de la Universidad.
    </div>
  </div>

  <div class="student box">
    <div><b>DATOS QUE DEBE COMPLETAR EL ESTUDIANTE:</b></div>
    <div class="field"><div>Código:</div><div>______________________________</div></div>
    <div class="field"><div>Nombre:</div><div>______________________________</div></div>
  </div>

  <div class="questions">
    ${questionsHtml}
  </div>

  <div class="footer">Generado — Sistema de Gestión de Exámenes</div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`;
}

function openPrint(html: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function loadPrintableExam(exam: ExamSummary): PrintableExam | null {
  const stored = readJSON<PrintableExam>(`exam:content:${exam.id}`);
  if (!stored || !Array.isArray(stored.questions) || stored.questions.length === 0) return null;
  return {
    examId: stored.examId || exam.id,
    title: stored.title || exam.title,
    subject: stored.subject || exam.className || '—',
    teacher: stored.teacher || '—',
    createdAt: stored.createdAt || exam.createdAt,
    questions: stored.questions.map((q, i) => ({ ...q, n: q.n || i + 1 })),
  };
}

function handleDownloadPdf(exam: ExamSummary, mode: PrintMode) {
  const printable = loadPrintableExam(exam);
  if (!printable) {
    message.error('No se encontró el contenido del examen. Vuelve a guardarlo desde la pantalla de resultados.');
    return;
  }
  const html = buildPlantillaHtml(printable, mode);
  openPrint(html);
}
/* =========================== FIN helpers =========================== */

export default function ExamTable({ data, onEdit, onDelete, disableStatusControls = true }: Props) {
  const toggleVisibility = useExamsStore((s: ExamsState) => s.toggleVisibility);
  const setVisibility = useExamsStore((s: ExamsState) => s.setVisibility);
  const setStatus = useExamsStore((s: ExamsState) => s.setStatus);
  const removeExam = useExamsStore((s: ExamsState) => s.removeExam);
  const { token } = theme.useToken();

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleAt, setScheduleAt] = useState<Dayjs | null>(null);
  const [target, setTarget] = useState<ExamSummary | null>(null);

  const openPublishModal = (exam: ExamSummary) => {
    setTarget(exam);
    setPublishMode('now');
    setScheduleAt(null);
    setPublishOpen(true);
  };

  const handleConfirmPublish = () => {
    if (!target) return;
    if (publishMode === 'now') {
      setStatus(target.id, 'published', new Date().toISOString());
      setVisibility(target.id, 'visible');
      message.success('Examen publicado');
    } else if (publishMode === 'schedule') {
      if (!scheduleAt) {
        message.warning('Selecciona una fecha y hora');
        return;
      }
      setStatus(target.id, 'scheduled', scheduleAt.toDate().toISOString());
      setVisibility(target.id, 'visible');
      message.success('Examen programado');
    } else {
      setStatus(target.id, 'draft', undefined);
      message.success('Examen guardado como borrador');
    }
    setPublishOpen(false);
    setTarget(null);
  };

  const columns: ColumnsType<ExamSummary> = [
    {
      title: <span style={{ display: 'block', textAlign: 'center', fontSize: token.fontSizeLG, fontWeight: 600 }}>Título de Examen</span>,
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div style={{ textAlign:'center' }}>
          <Text strong style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }} ellipsis>
            {title}
          </Text>
          <div style={{ textAlign: 'center' }} className="text-[12px] text-[var(--app-color-text-tertiary)]">
            {record.totalQuestions} preguntas • Creado: {fmt(record.createdAt)}
          </div>
        </div>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
      ellipsis: true,
    },
    {
      title: <span style={{ display: 'block', textAlign: 'center', fontSize: token.fontSizeLG, fontWeight: 600 }}>Estado / Visibilidad</span>,
      key: 'status_visibility',
      align: 'center',
      render: (_, record) => <StatusVisibility exam={record} />,
      sorter: (a, b) => {
        const v = a.visibility.localeCompare(b.visibility);
        if (v !== 0) return v;
        return a.status.localeCompare(b.status);
      },
      ellipsis: true,
    },
    {
      title: <span style={{ display: 'block', textAlign: 'center', fontSize: token.fontSizeLG, fontWeight: 600 }}>Acciones</span>,
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const menuItems = [
          { key: 'q', label: 'Descargar — Solo preguntas', onClick: () => handleDownloadPdf(record, 'questions_only') },
          { key: 'qa', label: 'Descargar — Preguntas y respuestas', onClick: () => handleDownloadPdf(record, 'questions_answers') },
        ];
        return (
          <Space size={6} wrap={false} style={{ whiteSpace: 'nowrap' }}>
            <Tooltip title="Editar">
              <Button type="text" style={{ paddingInline: 6 }} icon={<EditOutlined style={{ fontSize: 18 }} />} onClick={() => onEdit?.(record)} aria-label="Editar" />
            </Tooltip>
            <Tooltip title="Publicar / Programar / Borrador">
              <Button type="text" style={{ paddingInline: 6 }} icon={<UploadOutlined style={{ fontSize: 18 }} />} onClick={() => openPublishModal(record)} aria-label="Estado" />
            </Tooltip>
            <Tooltip title={record.visibility === 'visible' ? 'Hacer privado' : 'Hacer público'}>
              <Button
                type="text"
                style={{ paddingInline: 6 }}
                icon={record.visibility === 'visible' ? <EyeInvisibleOutlined style={{ fontSize: 18 }} /> : <EyeOutlined style={{ fontSize: 18 }} />}
                onClick={() => toggleVisibility(record.id)}
                aria-label="Visibilidad"
              />
            </Tooltip>

            <Dropdown
              menu={{ items: menuItems.map(m => ({ key: m.key, label: m.label, onClick: m.onClick })) }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Tooltip title="Descargar PDF">
                <Button type="text" style={{ paddingInline: 6 }} icon={<FilePdfOutlined style={{ fontSize: 18 }} />} aria-label="Descargar PDF">
                  <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                </Button>
              </Tooltip>
            </Dropdown>            

            <Popconfirm
              title="Eliminar examen"
              description="Esta acción no se puede deshacer."
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={async () => { if (onDelete) { await onDelete(record.id); } else { removeExam(record.id); } message.success('Examen eliminado'); }}
            >
              <Tooltip title="Eliminar">
                <Button type="text" danger style={{ paddingInline: 6 }} icon={<DeleteOutlined style={{ fontSize: 18 }} />} aria-label="Eliminar" />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Table
        rowKey="id"
        className="shadow-sm rounded-lg"
        style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` ,padding:10 }}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{
          emptyText: 'Sin datos',
          triggerDesc: 'Ordenar descendente',
          triggerAsc: 'Ordenar ascendente',
          cancelSort: 'Quitar orden',
          sortTitle: 'Ordenar',
        }}
      />
      <Modal
        title="Publicación del examen"
        open={publishOpen}
        onOk={handleConfirmPublish}
        onCancel={() => setPublishOpen(false)}
        okText={publishMode === 'now' ? 'Publicar' : publishMode === 'schedule' ? 'Programar' : 'Guardar como borrador'}
        cancelText="Cancelar"
      >
        <Radio.Group value={publishMode} onChange={(e) => setPublishMode(e.target.value)} className="flex flex-col gap-2">
          <Radio value="now">Publicar ahora</Radio>
          <Radio value="schedule">Programar</Radio>
          <Radio value="draft">Borrador</Radio>
        </Radio.Group>
        {publishMode === 'schedule' && (
          <div className="mt-3">
            <DatePicker showTime style={{ width: '100%' }} value={scheduleAt as any} onChange={(d) => setScheduleAt(d)} />
          </div>
        )}
      </Modal>
    </>
  );
}