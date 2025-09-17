import api from './api/instance';

const USE_MOCK = String(import.meta.env.VITE_API_MOCK || 'false') === 'true';

export type GeneratedQuestion =
  | { id: string; type: 'multiple_choice'; text: string; options: string[]; include: boolean }
  | { id: string; type: 'true_false'; text: string; include: boolean }
  | { id: string; type: 'open_analysis'; text: string; imageUrl?: string; options?: string[]; include: boolean }
  | { id: string; type: 'open_exercise'; text: string; include: boolean };

const TEXT_KEYS = ['text', 'statement', 'question', 'prompt', 'enunciado', 'descripcion', 'description', 'body', 'content'] as const;
const OPT_KEYS  = ['options', 'choices', 'alternativas', 'opciones', 'answers'] as const;

function pickTextLike(q: any): string {
  for (const k of TEXT_KEYS) {
    const v = q?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}
function pickOptionsLike(q: any): string[] | undefined {
  for (const k of OPT_KEYS) {
    const v = q?.[k];
    if (Array.isArray(v) && v.length) return v.map(String);
  }
  return undefined;
}

function mockQuestions(): GeneratedQuestion[] {
  return [
    {
      id: 'q1_mc',
      type: 'multiple_choice',
      text: '¿Cuál es la derivada de f(x) = 3x² + 2x - 5?',
      options: ['6x + 2', '3x + 2', '6x² + 2', '3x² + 2x'],
      include: true,
    },
    {
      id: 'q2_tf',
      type: 'true_false',
      text: 'El Teorema Fundamental del Cálculo conecta derivación e integración.',
      include: true,
    },
    {
      id: 'q3_oe',
      type: 'open_exercise',
      text: 'Resuelve la integral indefinida: ∫(4x³ - 3x² + 6x - 2) dx',
      include: true,
    },
    {
      id: 'q4_oa',
      type: 'open_analysis',
      text: 'Analiza la siguiente gráfica y elige la interpretación correcta.',
      options: ['La velocidad aumenta', 'El movimiento es uniforme', 'La aceleración es negativa'],
      include: true,
    },
  ];
}
function toSpanishDifficulty(input?: unknown): 'fácil' | 'medio' | 'difícil' {
  const s = String(input ?? 'medio').toLowerCase();
  if (['easy', 'facil', 'fácil'].includes(s)) return 'fácil';
  if (['hard', 'dificil', 'difícil'].includes(s)) return 'difícil';
  return 'medio';
}

function buildQuestionsDto(input: Record<string, unknown> = {}) {
  const subject = String(input.subject ?? input.topic ?? 'Tema general');
  const difficulty = toSpanishDifficulty(input.difficulty);

  const distribution = {
    multiple_choice: Math.max(0, Number((input as any).distribution?.multiple_choice ?? 0) || 0),
    true_false: Math.max(0, Number((input as any).distribution?.true_false ?? 0) || 0),
    open_analysis: Math.max(0, Number((input as any).distribution?.open_analysis ?? 0) || 0),
    open_exercise: Math.max(0, Number((input as any).distribution?.open_exercise ?? 0) || 0),
  };

  const totalQuestions =
    distribution.multiple_choice +
    distribution.true_false +
    distribution.open_analysis +
    distribution.open_exercise;

  if (totalQuestions < 1) {
    throw new Error('La distribución debe contener al menos 1 pregunta en total.');
  }

  const reference =
    input.reference != null ? String(input.reference) : undefined;

  const examId = (input as any).examId ? String((input as any).examId) : undefined;
  const classId = (input as any).classId ? String((input as any).classId) : undefined;

  const dto: any = {
    subject,
    difficulty,        
    totalQuestions,   
    reference,         
    distribution,      
  };
  if (examId) dto.examId = examId;
  if (classId) dto.classId = classId;

  return dto;
}


function looksSpanish(text: string): boolean {
  const t = (text || '').toLowerCase();
  const cues = [' el ', ' la ', ' los ', ' las ', ' de ', ' y ', ' que ', '¿', '¡', 'ción', 'á', 'é', 'í', 'ó', 'ú'];
  return cues.some((c) => t.includes(c));
}
function looksEnglish(text: string): boolean {
  const t = (text || '').toLowerCase();
  const hints = [
    'which of the following', 'true or false', 'explain the', 'following', 'which',
    'statement', 'algorithm', 'always', 'finite', 'time', 'hardware', 'unique solution',
    'dot product', 'determinant', 'matrix', 'gauss', 'explain how',
  ];
  return hints.some((w) => t.includes(w));
}
function forceSpanish<T extends GeneratedQuestion>(q: T, subject: string): T {
  const isTextEs = looksSpanish(q.text) && !looksEnglish(q.text);

  if (q.type === 'multiple_choice') {
    const opts = Array.isArray((q as any).options) ? [...(q as any).options as string[]] : [];
    const optsOk = opts.length && !opts.some(o => looksEnglish(o) && !looksSpanish(o));
    if (isTextEs && optsOk) return { ...q, options: [...opts] } as T;
    return {
      id: q.id,
      type: 'multiple_choice',
      text: isTextEs ? q.text : `¿Cuál de las siguientes afirmaciones es correcta sobre ${subject}?`,
      options: optsOk ? [...opts] : ['Opción A','Opción B','Opción C','Opción D'],
      include: true,
    } as T;
  }
  if (q.type === 'true_false') {
    if (isTextEs) return { ...q } as T;
    return {
      id: q.id,
      type: 'true_false',
      text: `Indica si la siguiente afirmación es verdadera o falsa sobre ${subject}.`,
      include: true,
    } as T;
  }
  if (q.type === 'open_analysis') {
    const opts = Array.isArray((q as any).options) ? [...(q as any).options as string[]] : undefined;
    const optsEs = Array.isArray(opts) ? opts.filter(o => looksSpanish(o) && !looksEnglish(o)) : undefined;
    if (isTextEs && (optsEs?.length ? true : !opts)) {
      return { ...q, options: optsEs } as T;
    }
    return {
      id: q.id,
      type: 'open_analysis',
      text: isTextEs ? q.text : `Analiza el siguiente aspecto de ${subject} y justifica tu razonamiento en español.`,
      options: optsEs && optsEs.length ? optsEs : undefined,
      include: true,
    } as T;
  }

  if (isTextEs) return { ...q } as T;
  return {
    id: q.id,
    type: 'open_exercise',
    text: `Resuelve un ejercicio relacionado con ${subject} y explica cada paso en español.`,
    include: true,
  } as T;
}

function makePlaceholders(opts: {
  type: GeneratedQuestion['type'];
  count: number;
  subject: string;
  startIndex: number;
}): GeneratedQuestion[] {
  const { type, count, subject, startIndex } = opts;
  const out: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const id = `ph_${type}_${startIndex + i}_${Date.now()}`;
    if (type === 'multiple_choice') {
      out.push({
        id,
        type: 'multiple_choice',
        text: `Pregunta de opción múltiple sobre ${subject}.`,
        options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        include: true,
      });
    } else if (type === 'true_false') {
      out.push({
        id,
        type: 'true_false',
        text: `Afirmación de verdadero/falso sobre ${subject}.`,
        include: true,
      });
    } else if (type === 'open_analysis') {
      out.push({
        id,
        type: 'open_analysis',
        text: `Pregunta de análisis abierto acerca de ${subject}.`,
        include: true,
      });
    } else {
      out.push({
        id,
        type: 'open_exercise',
        text: `Ejercicio abierto relacionado con ${subject}.`,
        include: true,
      });
    }
  }
  return out;
}

function orderByType(items: GeneratedQuestion[]) {
  const order = ['multiple_choice','true_false','open_analysis','open_exercise'] as const;
  const idx = (t: GeneratedQuestion['type']) => order.indexOf(t as any);
  return [...items].sort((a, b) => idx(a.type) - idx(b.type));
}

function normalizeItem(q: any, ts: number, i: number, fallbackType?: GeneratedQuestion['type']): GeneratedQuestion {
  const rawType = String(q?.type ?? fallbackType ?? 'open_analysis').trim();
  const type = (rawType === 'boolean' ? 'true_false' : rawType) as GeneratedQuestion['type'];
  const text = pickTextLike(q);
  const imageUrl = q?.imageUrl ?? q?.image_url ?? undefined;
  const options = pickOptionsLike(q);

  const makeId = (idx: number) => `q_${ts}_${type}_${idx}`;

  if (type === 'multiple_choice') {
    return { id: makeId(i), type: 'multiple_choice', text, options: options ?? [], include: true };
  }
  if (type === 'true_false') {
    return { id: makeId(i), type: 'true_false', text, include: true };
  }
  if (type === 'open_exercise') {
    return { id: makeId(i), type: 'open_exercise', text, include: true };
  }
  return { id: makeId(i), type: 'open_analysis', text, imageUrl, options: options ?? undefined, include: true };
}

export async function generateQuestions(input: Record<string, unknown>): Promise<GeneratedQuestion[]> {
  if (USE_MOCK) return mockQuestions();

  const dto = buildQuestionsDto(input ?? {});
  const wanted = dto.distribution;
  const subject = dto.subject;

  const res = await api.post('/api/exams/questions', dto);
  const payload = (res as any)?.data;

  const grouped =
    payload?.questions ??
    payload?.data?.questions ??
    (Array.isArray(payload) ? payload : null);

  if (!grouped) {
    throw new Error(payload?.message ?? 'Respuesta del servidor no válida.');
  }

  const ts = Date.now();
  let normalized: GeneratedQuestion[] = [];

  if (Array.isArray(grouped)) {
    normalized = grouped.map((q: any, i: number) => normalizeItem(q, ts, i));
  } else {
    const mcq = Array.isArray(grouped.multiple_choice) ? grouped.multiple_choice : [];
    const tf = Array.isArray(grouped.true_false) ? grouped.true_false : [];
    const oa = Array.isArray(grouped.open_analysis) ? grouped.open_analysis : [];
    const oe = Array.isArray(grouped.open_exercise) ? grouped.open_exercise : [];

    normalized = [
      ...mcq.map((q: any, i: number) => normalizeItem(q, ts, i, 'multiple_choice')),
      ...tf.map((q: any, i: number) => normalizeItem(q, ts, i, 'true_false')),
      ...oa.map((q: any, i: number) => normalizeItem(q, ts, i, 'open_analysis')),
      ...oe.map((q: any, i: number) => normalizeItem(q, ts, i, 'open_exercise')),
    ];
  }
  const spanish = normalized.map((q) => forceSpanish(q, subject));

  const byType = {
    multiple_choice: spanish.filter((q) => q.type === 'multiple_choice'),
    true_false: spanish.filter((q) => q.type === 'true_false'),
    open_analysis: spanish.filter((q) => q.type === 'open_analysis'),
    open_exercise: spanish.filter((q) => q.type === 'open_exercise'),
  };

  const out: GeneratedQuestion[] = [];

  (['multiple_choice', 'true_false', 'open_analysis', 'open_exercise'] as const).forEach((t) => {
    const want = wanted[t];
    const have = byType[t];
    if (want <= 0) return;

    if (have.length >= want) {
      out.push(...have.slice(0, want));
    } else {
      out.push(...have);
      const missing = want - have.length;
      out.push(...makePlaceholders({ type: t, count: missing, subject, startIndex: have.length }));
    }
  });

  const final = orderByType(out).slice(0, dto.totalQuestions);
  return final;
}

export async function createExam(payload: any): Promise<any> {
  if (USE_MOCK) {
    return { ok: true, data: { id: `exam_${Date.now()}`, ...payload } };
  }

  const classId = payload?.classId ?? null;
  if (!classId) {
    if (payload?.courseId) {
      throw new Error('Desde ahora debes enviar classId (la clase/período) en lugar de courseId.');
    }
    throw new Error('classId es obligatorio para crear el examen.');
  }

  const difficulty = toSpanishDifficulty(payload?.difficulty);
  const body = { ...payload, classId, difficulty };

  const res = await api.post('/api/exams', body);
  return (res as any)?.data ?? res;
}

export type ExamInput = {
  classId?: string;        
  courseId?: string;       
  title: string;
  status?: 'Guardado' | 'Publicado';
  content?: {
    subject?: string;
    difficulty?: string;
    createdAt?: string;
    questions: Array<{
      id: string;
      type: 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';
      text: string;
      options?: string[];
    }>;
  };
  questions?: Array<{
    id: string;
    type: 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';
    text: string;
    options?: string[];
  }>;
};

export type CreateExamApprovedInput = ExamInput;
export type UpdateExamApprovedInput = ExamInput & { examId: string };

export async function createExamApproved(input: CreateExamApprovedInput) {
  const classId = input.classId ?? null;
  if (!classId) {
    if (input.courseId) {
      throw new Error('Debes especificar classId (período/clase). Ya no se acepta courseId en este flujo.');
    }
    throw new Error('classId es obligatorio para crear el examen.');
  }

  const questions =
    input.content?.questions ??
    input.questions ??
    [];

  const createBody = {
    title: input.title,
    classId,
    status: input.status ?? 'Guardado',
    subject: input.content?.subject ?? 'Tema general',
    difficulty: toSpanishDifficulty(input.content?.difficulty ?? 'medio'),
    attempts: 1,
    totalQuestions: Math.max(1, questions.length || 1),
    timeMinutes: 45,
  };

  const createdExam = await createExam(createBody);
  const examId =
  createdExam?.id ??
  createdExam?.data?.id ??
  createdExam?.exam?.id ??
  createdExam?.data?.exam?.id; 

  if (!examId) {
    throw new Error('No se pudo crear el examen (sin id).');
  }

  for (const q of questions) {
    const kind =
      q.type === 'multiple_choice' ? 'MULTIPLE_CHOICE'
      : q.type === 'true_false' ? 'TRUE_FALSE'
      : q.type === 'open_analysis' ? 'OPEN_ANALYSIS'
      : 'OPEN_EXERCISE';

    const dto: any = {
      kind,
      text: String(q.text ?? ''),
      position: 'end',
    };

    if (q.type === 'multiple_choice') {
      dto.options = Array.isArray(q.options) ? q.options.map(String) : ['Opción A','Opción B'];
      dto.correctOptionIndex = 0;
    }
    if (q.type === 'true_false') {
      dto.correctBoolean = true;
    }
    if (q.type === 'open_analysis' || q.type === 'open_exercise') {
      dto.expectedAnswer = undefined;
    }

    await api.post(`/api/exams/${examId}/questions`, dto);
  }

  return createdExam?.data ?? createdExam;
}

export async function updateExamApprovedFull(input: UpdateExamApprovedInput) {
  const { examId } = input;
  
  const questions = await api.get(`/api/exams/${examId}/questions`);
  for (const question of questions.data) {
    await api.delete(`/api/exams/${examId}/questions/${question.id}`);
  }

  await api.put(`/api/exams/${examId}`, {
    title: input.title,
    subject: input.content?.subject ?? 'Tema general',
    difficulty: toSpanishDifficulty(input.content?.difficulty ?? 'medio'),
    attempts: 1,
    totalQuestions: Math.max(1, (input.questions?.length || 1)),
    timeMinutes: 45,
  });

  const newQuestions = input.content?.questions ?? input.questions ?? [];
  for (const q of newQuestions) {
    const kind =
      q.type === 'multiple_choice' ? 'MULTIPLE_CHOICE'
      : q.type === 'true_false' ? 'TRUE_FALSE'
      : q.type === 'open_analysis' ? 'OPEN_ANALYSIS'
      : 'OPEN_EXERCISE';

    const dto: any = {
      kind,
      text: String(q.text ?? ''),
      position: 'end',
    };

    if (q.type === 'multiple_choice') {
      dto.options = Array.isArray(q.options) ? q.options.map(String) : ['Opción A','Opción B'];
      dto.correctOptionIndex = 0;
    }
    if (q.type === 'true_false') {
      dto.correctBoolean = true;
    }
    if (q.type === 'open_analysis' || q.type === 'open_exercise') {
      dto.expectedAnswer = undefined;
    }

    await api.post(`/api/exams/${examId}/questions`, dto);
  }

  return { id: examId };
}

export async function quickSaveExam(p: { title: string; questions: any[]; content?: any; classId?: string; courseId?: string; teacherId?: string }) {
  const classId = p.classId ?? null;
  if (!classId) {
    if (p.courseId) {
      throw new Error('Debes especificar classId (período/clase). Ya no se acepta courseId en este flujo.');
    }
    throw new Error('classId es obligatorio para guardar el examen.');
  }

  const questions = (p.questions ?? []).map((q: any, i: number) => ({
    id: String(q?.id ?? `q_${Date.now()}_${i}`),
    type: String(q?.type),
    text: String(q?.text ?? ''),
    options: Array.isArray(q?.options) ? q.options.map(String) : undefined,
  }));

  const created = await createExam({
    title: p.title,
    classId,
    status: 'Guardado',
    subject: p.content?.subject ?? 'Tema general',
    difficulty: toSpanishDifficulty(p.content?.difficulty ?? 'medio'),
    attempts: 1,
    totalQuestions: Math.max(1, questions.length || 1),
    timeMinutes: 45,
  });

  const examId = created?.data?.id ?? created?.id;
  if (!examId) throw new Error('No se pudo crear el examen (sin id).');

  for (const q of questions) {
    const kind =
      q.type === 'multiple_choice' ? 'MULTIPLE_CHOICE'
      : q.type === 'true_false' ? 'TRUE_FALSE'
      : q.type === 'open_analysis' ? 'OPEN_ANALYSIS'
      : 'OPEN_EXERCISE';

    const dto: any = { kind, text: q.text, position: 'end' };
    if (q.type === 'multiple_choice') {
      dto.options = q.options ?? ['Opción A', 'Opción B'];
      dto.correctOptionIndex = 0;
    }
    if (q.type === 'true_false') dto.correctBoolean = true;

    await api.post(`/api/exams/${examId}/questions`, dto);
  }

  return created?.data ?? created;
}

export type CourseExamRow = {
  id: number | string;
  title: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listClassExams(classId: string): Promise<CourseExamRow[]> {
  const { data } = await api.get(`/api/classes/${classId}/exams`);
  const rows = data?.data ?? data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function listCourseExams(courseId_as_classId: string): Promise<CourseExamRow[]> {
  if (import.meta.env.MODE !== 'production') {
    console.warn('[DEPRECATION] listCourseExams now expects a classId (period). Forwarding to listClassExams.');
  }
  return listClassExams(courseId_as_classId);
}

export async function deleteExamAny(examId: string | number): Promise<void> {
  const id = String(examId);
  await api.delete(`/api/exams/${id}`);
}

export async function deleteCourseExam(classId: string, examId: string | number): Promise<void> {
  await deleteExamAny(examId);
}

export async function deleteExamByCandidates(classId: string, candidates: Array<string | number>) {
  const ids = Array.from(new Set((candidates || []).map((x) => String(x)).filter(Boolean)));
  for (const id of ids) {
    await deleteExamAny(id);
  }
}

export default { generateQuestions, createExam, createExamApproved };