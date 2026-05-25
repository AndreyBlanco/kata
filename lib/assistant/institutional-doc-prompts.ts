/**
 * lib/assistant/institutional-doc-prompts.ts
 *
 * Prompts para extraer el Plan de Acción Anual (Anexo 2 — Líneas de acción
 * MEP 2023) desde el texto plano de un documento subido por el docente.
 *
 * La IA recibe:
 *  1. Un system prompt con contexto MEP y rol del asistente.
 *  2. Un user prompt con: esquema JSON destino + reglas + texto del doc.
 *
 * La salida esperada es **estrictamente JSON** que cumpla con
 * `ActionPlanAnnualPayload` (lib/institutional-document-types.ts).
 */

import { SERVICE_CATEGORIES } from '@/lib/schedule-template'

export const INSTITUTIONAL_DOC_SYSTEM_PROMPT = `Eres un asistente experto del MEP de Costa Rica especializado en servicios de apoyo educativo en problemas de aprendizaje. Tu tarea es analizar documentos institucionales de los servicios de apoyo y devolver información estructurada útil para que el docente pueda planificar sus acciones mensuales.

Reglas estrictas:
- Respondes SIEMPRE en español de Costa Rica.
- Tu salida es SIEMPRE JSON válido (objeto único), sin texto antes ni después, sin Markdown, sin backticks.
- No inventes datos: si un campo no aparece en el documento, devolvelo vacío ("") o como array vacío [].
- No agregues campos fuera del esquema solicitado.
- Si el documento no parece ser un Plan de Acción Anual de un servicio de apoyo educativo, devolvé el objeto con notes explicando por qué.`

/**
 * Construye el user prompt para extraer un Plan de Acción Anual (Anexo 2).
 */
export function actionPlanAnnualUserPrompt(args: {
  documentText: string
  declaredSchoolYear: number
  declaredTitle: string
}): string {
  const { documentText, declaredSchoolYear, declaredTitle } = args

  const categoryHint = SERVICE_CATEGORIES.map((c) => `"${c.code}" (${c.shortLabel})`).join(', ')

  return `Estás procesando un documento de PLAN DE ACCIÓN ANUAL (Anexo 2 — Líneas de acción MEP 2023) de un servicio de apoyo educativo en problemas de aprendizaje.

Datos declarados por el docente al subir el archivo:
  - Título: ${declaredTitle}
  - Año lectivo: ${declaredSchoolYear}

ESQUEMA JSON DE SALIDA (obligatorio, sin desviaciones):
{
  "schoolName": "string | null",          // nombre del centro si aparece
  "schoolYear": ${declaredSchoolYear},     // o el año real que indique el documento
  "serviceArea": "string | null",          // ej. "Problemas de Aprendizaje"
  "responsibleTeachers": ["nombre1", ...], // docentes PA firmantes / participantes
  "generalObjective": "string | null",     // si hay objetivo general
  "axes": [
    {
      "id": "E1",                          // identificador local correlativo (E1, E2, ...)
      "title": "string",
      "description": "string | null"
    }
  ],
  "objectives": [
    {
      "id": "O1",                          // correlativo (O1, O2, ...)
      "title": "string",                   // título corto del objetivo (≤120 chars)
      "description": "string | null",      // formulación completa si existe
      "targetPopulation": "string | null", // ej. "estudiantes activos PA", "familias", "docentes de aula"
      "expectedOutcomes": ["resultado 1", "resultado 2"],
      "axis": "string | null"              // referencia al título del eje (no al id)
    }
  ],
  "activities": [
    {
      "id": "A1",                          // correlativo (A1, A2, ...)
      "title": "string",                   // título corto
      "description": "string | null",
      "objectiveIds": ["O1", "O3"],        // qué objetivos atiende (referencia a objectives[].id)
      "scheduleText": "string | null",     // texto literal del cronograma del documento
      "months": [3, 4, 5],                 // meses (1=enero..12=diciembre) que vos infieras del cronograma. [] si no hay
      "responsibles": ["nombre o rol"],
      "suggestedCategory": "AULA_REGULAR | OTROS_ESPACIOS | ARTICULACION | COMUNIDAD_EDUCATIVA | FAMILIAS | SERVICIO_PROPIAS | null",
      "suggestedProcess": "IDENTIFICACION | IMPLEMENTACION | REFLEXION | null"
    }
  ],
  "notes": "string | null"                  // observaciones tuyas relevantes (1-2 líneas máximo)
}

REGLAS DE EXTRACCIÓN:
1. Identificá los OBJETIVOS y ACTIVIDADES tal como aparecen en el Anexo 2. Pueden venir en tabla, lista numerada o párrafos.
2. Si un objetivo no tiene actividades asociadas, agregalo de todos modos a objectives[] (sin actividades).
3. Para cada actividad, intentá inferir:
   - meses[]: a partir del cronograma. Si dice "I periodo", asumí [2,3,4,5,6,7]. Si dice "II periodo", asumí [7,8,9,10,11,12]. Si dice "todo el año" usá [2,3,4,5,6,7,8,9,10,11,12]. Si dice un mes específico usá ese número.
   - suggestedCategory: mapeala a una de las categorías Anexo 1 (cuadro 1/2): ${categoryHint}.
     - Aula regular / acompañamiento al estudiantado en aula → AULA_REGULAR.
     - Otros espacios del centro (biblioteca, gimnasio, recreo, etc.) → OTROS_ESPACIOS.
     - Trabajo conjunto con docentes de grado, comités, evaluación → ARTICULACION.
     - Talleres, conversatorios, jornadas con comunidad educativa o personal del centro → COMUNIDAD_EDUCATIVA.
     - Trabajo con familias / encargados → FAMILIAS.
     - Planificación, autoevaluación, registros, informes (lecciones propias del servicio) → SERVICIO_PROPIAS.
     - Si no estás seguro, dejá null.
   - suggestedProcess (de los 3 procesos MEP):
     - IDENTIFICACION: autoevaluación, diagnóstico, valoración integral, identificación de barreras/recursos.
     - IMPLEMENTACION: ejecución de apoyos, talleres, mediaciones, acompañamiento en aula u otros espacios.
     - REFLEXION: revisión de planificación, análisis de resultados, informes, retroalimentación, ajustes.
4. Si el documento es claramente otra cosa (no es un Plan de Acción Anual), igualmente devolvé el objeto con arrays vacíos y poné en notes: "El documento no parece un Plan de Acción Anual MEP" + breve descripción de lo que sí es.
5. No copies textualmente párrafos largos: resumí en máximo 240 caracteres por campo de descripción.
6. NUNCA devuelvas texto fuera del JSON.

TEXTO DEL DOCUMENTO (entre delimitadores):
<<<DOC
${truncate(documentText, 60000)}
DOC>>>

Devolvé ahora el JSON.`
}

/**
 * Trunca el texto del documento para que no se exceda el contexto del modelo.
 * 60K caracteres ≈ 15K tokens en español; deja margen para el prompt y la salida.
 */
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n\n[... documento truncado por longitud — ${text.length - maxChars} caracteres adicionales no procesados]`
}

export const ACTION_PLAN_SUMMARY_SYSTEM_PROMPT = `Eres un asistente del MEP. Vas a recibir un Plan de Acción Anual ya estructurado en JSON y debés devolver un resumen ejecutivo de 3 a 5 líneas, en español de Costa Rica, sin Markdown.

El resumen debe destacar: cantidad de objetivos, ejes principales y meses con mayor concentración de actividades. Es para que el docente sepa "de un vistazo" qué contiene el plan.`

export function actionPlanSummaryUserPrompt(args: { payloadJson: string }): string {
  return `Resumí este Plan de Acción Anual extraído:

${args.payloadJson}

Devolvé sólo el texto del resumen (3–5 líneas).`
}
