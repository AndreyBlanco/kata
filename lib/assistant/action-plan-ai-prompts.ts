/**
 * lib/assistant/action-plan-ai-prompts.ts
 *
 * Prompts para la generación IA del plan mensual de acciones (Sesión F-2).
 *
 * Hay dos prompts distintos:
 *  1. `buildAnnualPayloadFromRecordsPrompt`
 *     → Se usa cuando NO existe documento institucional para el año.
 *       La IA infiere un Plan de Acción Anual SUPLENTE a partir de los
 *       hallazgos en expedientes (estudiantes activos + objetivos derivados).
 *       Salida: `ActionPlanAnnualPayload`.
 *
 *  2. `buildMonthlyLinesFromAnnualPrompt`
 *     → Se usa SIEMPRE (Modo A y Modo B). Recibe el payload anual (oficial
 *       o suplente) + contexto del mes + estudiantes y cupos y devuelve las
 *       líneas del plan mensual con `lessonCount` por categoría exacto.
 *     → La IA NO asigna slots (eso lo hace el assigner determinístico).
 */

import { SERVICE_CATEGORIES } from '@/lib/schedule-template'
import { summarizeContextForPrompt, type ActionPlanGenerationContext } from '@/lib/action-plan-context'
import type { ActionPlanAnnualPayload } from '@/lib/institutional-document-types'

// ─────────────────────────────────────────────────────────────────────────────
// System prompt común
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_PLAN_AI_SYSTEM_PROMPT = `Eres un asistente experto del MEP de Costa Rica que apoya a docentes de servicios de apoyo educativo en problemas de aprendizaje. Tu rol es producir insumos prácticos, alineados al Anexo 1 (Líneas de Acción MEP 2023) y respetuosos del trabajo del docente.

Reglas estrictas:
- Respondes SIEMPRE en español de Costa Rica.
- Tu salida es SIEMPRE JSON válido (un único objeto), sin texto antes ni después, sin Markdown, sin backticks.
- No inventes estudiantes ni objetivos: trabajá únicamente con los que aparecen en el contexto.
- No agregues campos fuera del esquema solicitado.
- Cuando se te piden cupos exactos por categoría, debés respetarlos al lessón. Si no llegás, completá con líneas de Servicio/Articulación; si te sobran, recortá descripciones (no líneas) para que cuadre.`

// ─────────────────────────────────────────────────────────────────────────────
// Prompt 1: Plan Anual SUPLENTE desde expedientes
// ─────────────────────────────────────────────────────────────────────────────

export function buildAnnualPayloadFromRecordsPrompt(args: {
  context: ActionPlanGenerationContext
}): string {
  const { context } = args
  const ctxSummary = summarizeContextForPrompt(context)

  const categoryHint = SERVICE_CATEGORIES
    .map((c) => `"${c.code}" (${c.shortLabel})`)
    .join(', ')

  return `Estás generando un **Plan de Acción Anual SUPLENTE** para el servicio de apoyo de un docente PA que NO tiene aún el documento oficial del centro. Debés inferir objetivos y actividades anuales razonables a partir de los expedientes de sus estudiantes activos.

CONTEXTO DEL SERVICIO:
${ctxSummary}

ESQUEMA JSON DE SALIDA (obligatorio, idéntico al Anexo 2 oficial):
{
  "schoolName": "${context.teacher.centerName}",
  "schoolYear": ${context.plan.year},
  "serviceArea": "${context.teacher.specialty}",
  "responsibleTeachers": ["${context.teacher.name}"],
  "generalObjective": "string (1 oración)",  // objetivo general derivado de patrones detectados
  "axes": [
    { "id": "E1", "title": "string", "description": "string|null" }
  ],
  "objectives": [
    {
      "id": "O1",
      "title": "string (≤120 chars)",
      "description": "string|null",
      "targetPopulation": "estudiantes activos PA|familias|docentes de aula|comunidad educativa",
      "expectedOutcomes": ["resultado 1", "resultado 2"],
      "axis": "string|null"        // título del eje
    }
  ],
  "activities": [
    {
      "id": "A1",
      "title": "string (≤120 chars)",
      "description": "string|null",
      "objectiveIds": ["O1"],       // referencia a objectives[].id
      "scheduleText": "I y II periodo",  // texto humano del cronograma
      "months": [2,3,4,5,6,7,8,9,10,11,12],   // meses (1..12) en que aplica
      "responsibles": ["${context.teacher.name}"],
      "suggestedCategory": "AULA_REGULAR|OTROS_ESPACIOS|ARTICULACION|COMUNIDAD_EDUCATIVA|FAMILIAS|SERVICIO_PROPIAS|null",
      "suggestedProcess": "IDENTIFICACION|IMPLEMENTACION|REFLEXION|null"
    }
  ],
  "notes": "Documento suplente generado por Katà desde expedientes. Reemplazar cuando esté disponible el Plan oficial del centro."
}

REGLAS:
1. Detectá patrones en los objetivos derivados: dificultades comunes (ej. dislexia/conciencia fonológica/lectura), grados involucrados, cantidad de estudiantes con cada dificultad.
2. Agrupá los hallazgos en 3-5 OBJETIVOS anuales coherentes. Cada objetivo debe ser accionable durante el año lectivo completo.
3. Generá 6-12 ACTIVIDADES asociadas a los objetivos. Distribuilas razonablemente entre categorías Anexo 1: ${categoryHint}.
4. Asegurate de cubrir las 6 categorías al menos con UNA actividad cada una a lo largo del año (cada categoría tiene cupos semanales obligatorios).
5. Para los meses, asumí el año lectivo CR: febrero–diciembre (meses 2..12). Algunas actividades pueden ser anuales (todos los meses), otras puntuales.
6. La población meta debe ser realista para servicios PA: mayoritariamente estudiantes activos; al menos 1 objetivo para familias y 1 para comunidad/docentes de aula.
7. responsibles[] siempre incluye al docente actual. Para FAMILIAS y COMUNIDAD_EDUCATIVA podés agregar "familias", "docentes de aula" si tiene sentido.
8. NO inventes nombres de estudiantes en las descripciones; usá categorías ("estudiantes con dificultades en lectura", "estudiantes de primer ciclo", etc.).
9. La salida debe ser un único objeto JSON. Sin texto antes ni después.

Devolvé ahora el JSON.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt 2: Plan MENSUAL desde plan anual
// ─────────────────────────────────────────────────────────────────────────────

export function buildMonthlyLinesFromAnnualPrompt(args: {
  context: ActionPlanGenerationContext
  annualPayload: ActionPlanAnnualPayload
  isSurrogate: boolean
}): string {
  const { context, annualPayload, isSurrogate } = args
  const ctxSummary = summarizeContextForPrompt(context)

  // Filtramos actividades del plan anual cuyo `months[]` incluye este mes,
  // o que no especifican mes (asumimos anual). Esto reduce ruido y tokens.
  const month = context.plan.month
  const relevantActivities = annualPayload.activities
    .filter((a) => a.months.length === 0 || a.months.includes(month))
    .slice(0, 30)

  const annualSummary = JSON.stringify(
    {
      generalObjective: annualPayload.generalObjective,
      objectives: annualPayload.objectives.map((o) => ({
        id: o.id,
        title: o.title,
        targetPopulation: o.targetPopulation,
      })),
      activities: relevantActivities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        objectiveIds: a.objectiveIds,
        months: a.months,
        suggestedCategory: a.suggestedCategory,
        suggestedProcess: a.suggestedProcess,
      })),
    },
    null,
    2,
  )

  const cuposLines = context.quotas
    .map((q) => `  - "${q.code}" (${q.shortLabel}): ${q.monthlyQuota} lecciones (${q.weeklyQuota}/semana × ${context.plan.weeksInMonth} semanas)`)
    .join('\n')

  const categoryEnumStr = SERVICE_CATEGORIES.map((c) => c.code).join('|')

  const sourceLabel = isSurrogate
    ? 'PLAN DE ACCIÓN ANUAL SUPLENTE (inferido desde expedientes — no es oficial del centro)'
    : 'PLAN DE ACCIÓN ANUAL OFICIAL del centro'

  return `Vas a generar las LÍNEAS del plan mensual de acciones del docente PA. Esto se entrega al inicio de cada mes a la Dirección como Anexo 5.

CONTEXTO:
${ctxSummary}

INSUMO ANUAL (${sourceLabel}):
${annualSummary}

CUPOS OBLIGATORIOS PARA ${context.plan.monthLabel} (Anexo 1, modalidad ${context.teacher.workModality}):
${cuposLines}

ESQUEMA JSON DE SALIDA (obligatorio):
{
  "lines": [
    {
      "category": "${categoryEnumStr}",
      "mepProcess": "IDENTIFICACION|IMPLEMENTACION|REFLEXION",
      "description": "string (1-2 oraciones describiendo la acción a realizar en sesión)",
      "lessonCount": 4,        // # de lecciones de este mes que cubre esta línea
      "studentId": "string|null",   // SOLO si la línea aplica a un estudiante específico del contexto
      "linkedItemIds": ["itemId1"], // SOLO si la línea cubre objetivos derivados específicos
      "linkedAnnualActivityId": "A3|null"   // id de la actividad del plan anual de la que se desprende
    }
  ],
  "notes": "string|null"       // resumen humano (1-2 líneas) de cómo armaste el plan
}

REGLAS CRÍTICAS:
1. La suma de \`lessonCount\` POR CATEGORÍA debe ser EXACTAMENTE igual a la cuota mensual indicada. Verificalo dos veces.
2. Si una categoría no tiene actividad anual relevante para este mes, igualmente generá líneas para cubrir su cuota (ej. para SERVICIO_PROPIAS: "Registro y seguimiento del plan mensual" / "Actualización de expedientes"; para ARTICULACION: "Coordinación con docentes de grado").
3. Para AULA_REGULAR y OTROS_ESPACIOS preferí líneas con \`studentId\` (acciones específicas por estudiante o pequeño grupo). Una misma línea puede tener varias lecciones (\`lessonCount > 1\`).
4. Para COMUNIDAD_EDUCATIVA, FAMILIAS, ARTICULACION, SERVICIO_PROPIAS, \`studentId\` suele ser null (acciones generales).
5. Vinculá a actividades del plan anual cuando aplique (\`linkedAnnualActivityId\`). Si no calza con ninguna, dejá null.
6. Vinculá a objetivos derivados de los estudiantes con \`linkedItemIds\` cuando la línea trabaja un objetivo específico mencionado en el contexto.
7. El proceso MEP (\`mepProcess\`) debe responder a:
   - IDENTIFICACION: diagnóstico, valoración, identificación de barreras/recursos, autoevaluación.
   - IMPLEMENTACION: ejecución del apoyo, talleres, mediaciones, acompañamiento.
   - REFLEXION: revisión de avances, informes, ajustes, retroalimentación, planificación.
8. Mantené 8-25 líneas en total. Líneas con \`lessonCount\` grande (>6) deben describir bien la actividad — son varias sesiones.
9. NO inventes \`studentId\` ni \`itemId\` — usá sólo los que aparecen en el contexto. Si dudás, dejá null o array vacío.
10. La salida debe ser un único objeto JSON. Sin texto antes ni después.

Devolvé ahora el JSON.`
}
