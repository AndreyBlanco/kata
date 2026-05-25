export const ASSISTANT_SYSTEM_PROMPT = `Eres un asistente para docentes de servicios de apoyo educativo en problemas de aprendizaje (PA) en Costa Rica, en el marco del MEP.

Reglas obligatorias:
- Enfoque en diversidad, fortalezas, barreras y apoyos educativos. NO diagnóstico clínico.
- NO uses etiquetas DSM, CIE, ni "diagnosticar" DEA, TDAH, discapacidad intelectual, etc.
- NO sustituyas la decisión profesional del docente.
- Lenguaje claro en español de Costa Rica, respetuoso con estudiantes y familias.
- Las preguntas sugeridas deben ser abiertas y adaptables; indica que son ejemplos, no un guión cerrado.
- Basa tus respuestas SOLO en la información proporcionada; si falta contexto, dilo brevemente.`

export function interviewQuestionsUserPrompt(params: {
  studentName: string
  grade: string
  interviewType: string
  partialJson: string
}): string {
  return `El docente va a realizar una entrevista tipo "${params.interviewType}" con contexto del estudiante ${params.studentName} (sección/grado: ${params.grade}).

Borrador parcial ya anotado (JSON):
${params.partialJson}

Genera preguntas abiertas agrupadas por bloques del marco MEP (saberes: qué conoce, qué sabe hacer, dificultades, estilo, relación, familia, situaciones, apoyos; y dimensiones cognoscitiva, socioafectiva, psicomotriz).

Formato markdown con subtítulos. Máximo 3 preguntas por bloque relevante al tipo de entrevista. Cierra con una línea recordando que son ideas, no lista obligatoria.`
}

export function interviewSynthesisUserPrompt(params: {
  studentName: string
  grade: string
  interviewType: string
  contentJson: string
}): string {
  return `Sintetiza en prosa profesional (para valoración integral) la entrevista tipo "${params.interviewType}" del estudiante ${params.studentName} (${params.grade}).

Contenido registrado:
${params.contentJson}

Entrega:
1) Párrafo breve de síntesis general (máx. 120 palabras).
2) Lista con viñetas "Sugerencia para VI" indicando qué sección podría alimentar (contexto familiar, fortalezas, apoyos requeridos, participantes) sin copiar texto duplicado.`
}

export function observationSynthesisUserPrompt(params: {
  studentName: string
  grade: string
  context: string
  notesJson: string
}): string {
  return `Sintetiza en prosa profesional una observación en contexto "${params.context}" del estudiante ${params.studentName} (${params.grade}).

Notas por dimensión y registro general:
${params.notesJson}

Redacta un borrador para el apartado de contexto de aula/institucional de la valoración integral (máx. 200 palabras). Hechos observables, sin juicios ni diagnósticos.`
}

export function viReviewUserPrompt(params: {
  studentName: string
  grade: string
  intakeType: string | null
  emptySections: string[]
  inconsistencies: string[]
  sectionsComplete: number
  capa2Done: number
  capa2Total: number
  viSnapshotJson: string
}): string {
  return `Revisa la valoración integral (VI) del estudiante ${params.studentName} (${params.grade}) antes de cerrar el expediente.

Tipo de atención: ${params.intakeType ?? 'sin definir'}
Completitud VI: ${params.sectionsComplete}/11 secciones
Capa 2: ${params.capa2Done}/${params.capa2Total} evidencias

Secciones vacías:
${params.emptySections.length ? params.emptySections.map((s) => `- ${s}`).join('\n') : '- (ninguna detectada)'}

Inconsistencias detectadas:
${params.inconsistencies.length ? params.inconsistencies.map((s) => `- ${s}`).join('\n') : '- (ninguna)'}

Snapshot de campos VI (JSON resumido):
${params.viSnapshotJson}

Entrega en markdown:
1) **Resumen** (2-3 oraciones): estado general de la VI.
2) **Prioridades antes de cerrar**: lista numerada de acciones concretas (máx. 6).
3) **Coherencia Capa 2 ↔ VI**: breve párrafo sobre alineación o brechas.

No diagnostiques clínicamente. No sustituyas la decisión del docente.`
}
