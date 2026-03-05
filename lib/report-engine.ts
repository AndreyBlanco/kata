// lib/report-engine.ts

import { prisma } from './prisma'
import { calculateAge } from './utils'

// =============================================
// TIPOS
// =============================================

interface ReportData {
  administrative: AdministrativeSection
  annualFramework: AnnualFrameworkSection
  periodSynthesis: PeriodSynthesisSection
  objectiveDevelopment: ObjectiveDevelopmentSection[]
  supports: SupportsSection
  recommendations: RecommendationsSection
}

interface AdministrativeSection {
  studentName: string
  age: number
  grade: string
  teacherName: string
  centerName: string
  circuit: string
  specialty: string
  reportPeriod: string
  generatedDate: string
}

interface AnnualFrameworkSection {
  planType: string
  planTypeLabel: string
  activeDifficulties: string[]
  priorityProcesses: string[]
  annualFocusSummary: string
  permanentAdjustments: string
  annualObservations: string
  narrative: string
}

interface PeriodSynthesisSection {
  objectivesWorked: number
  totalSessions: number
  sessionsAula: number
  sessionsPersonalizada: number
  sessionsAttended: number
  sessionsAbsent: number
  sessionsExtraordinary: number
  completionRate: number
  processesInvolved: string[]
  narrative: string
}

interface ObjectiveDevelopmentSection {
  macroArea: string
  specificGoal: string
  totalSessions: number
  attendedSessions: number
  achievedCount: number
  partialCount: number
  notAchievedCount: number
  achievedPercentage: number
  predominantOutcome: string
  averageSupportLevel: number
  observationTags: string[]
  progressLevel: string
  narrative: string
}

interface SupportsSection {
  strategies: string[]
  narrative: string
}

interface RecommendationsSection {
  suggested: string[]
  editable: string
}

// =============================================
// LABELS
// =============================================

const PLAN_TYPE_LABELS: Record<string, string> = {
  difficulty: 'Dificultades específicas del aprendizaje',
  process: 'Procesos implicados en el aprendizaje',
  both: 'Dificultades específicas y procesos implicados en el aprendizaje',
}

const MONTH_NAMES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// =============================================
// GENERADOR PRINCIPAL
// =============================================

export async function generateReport(
  teacherId: string,
  studentId: string,
  months: number[]
): Promise<ReportData> {
  // Cargar datos
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId },
    include: { supportPlan: true },
  })

  if (!student) throw new Error('Estudiante no encontrado')
  if (!student.supportPlan) throw new Error('Plan de apoyo no configurado')

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  })

  if (!teacher) throw new Error('Docente no encontrado')

  // Objetivos del estudiante
  const objectives = await prisma.supportObjective.findMany({
    where: {
      teacherId,
      studentIds: { has: studentId },
    },
  })

  // Sesiones del periodo
  const sessions = await prisma.generatedSession.findMany({
    where: {
      studentId,
      month: { in: months },
    },
    include: {
      supportObjective: true,
    },
  })

  const plan = student.supportPlan

  // ── 1. PARTE ADMINISTRATIVA ──
  const periodLabel = months.length === 1
    ? MONTH_NAMES[months[0]]
    : `${MONTH_NAMES[months[0]]} a ${MONTH_NAMES[months[months.length - 1]]}`

  const administrative: AdministrativeSection = {
    studentName: student.name,
    age: calculateAge(student.birthDate),
    grade: student.grade,
    teacherName: teacher.name,
    centerName: teacher.centerName,
    circuit: teacher.circuit,
    specialty: teacher.specialty,
    reportPeriod: periodLabel,
    generatedDate: new Date().toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }

  // ── 2. MARCO ANUAL ──
  const annualFramework = buildAnnualFramework(plan)

  // ── 3. SÍNTESIS DEL PERIODO ──
  const periodSynthesis = buildPeriodSynthesis(sessions, objectives)

  // ── 4. DESARROLLO POR OBJETIVO ──
  const objectiveDevelopment = buildObjectiveDevelopment(sessions, objectives)

  // ── 5. APOYOS IMPLEMENTADOS ──
  const supports = buildSupports(sessions)

  // ── 6. RECOMENDACIONES ──
  const recommendations = buildRecommendations(objectiveDevelopment, plan)

  return {
    administrative,
    annualFramework,
    periodSynthesis,
    objectiveDevelopment,
    supports,
    recommendations,
  }
}

// =============================================
// CONSTRUCTORES DE SECCIONES
// =============================================

function buildAnnualFramework(plan: {
  activeDifficulties: string[]
  priorityProcesses: string[]
  strengths: string
  mediationStrategies: string
  homeStrategies: string
  specificStrategies: string
}): AnnualFrameworkSection {
  // Adaptación temporal: no existe un campo planType en el modelo,
  // asumimos un tipo genérico basado en dificultades específicas.
  const planType = 'difficulty'
  const planTypeLabel = PLAN_TYPE_LABELS[planType] || 'Dificultades específicas del aprendizaje'

  let narrative = `El plan de apoyo se orienta hacia ${planTypeLabel.toLowerCase()}. `

  if (plan.activeDifficulties.length > 0) {
    narrative += `Las dificultades identificadas son: ${plan.activeDifficulties.join(', ')}. `
  }

  if (plan.priorityProcesses.length > 0) {
    narrative += `Los procesos prioritarios de intervención incluyen: ${plan.priorityProcesses.join(', ')}. `
  }

  const annualFocusSummary = plan.mediationStrategies || ''
  const permanentAdjustments = plan.specificStrategies || ''
  const annualObservations = ''

  if (annualFocusSummary) {
    narrative += `\n\nEnfoque anual: ${annualFocusSummary} `
  }

  if (permanentAdjustments) {
    narrative += `\n\nAdecuaciones permanentes: ${permanentAdjustments} `
  }

  if (annualObservations) {
    narrative += `\n\nObservaciones: ${annualObservations}`
  }

  return {
    planType,
    planTypeLabel,
    activeDifficulties: plan.activeDifficulties,
    priorityProcesses: plan.priorityProcesses,
    annualFocusSummary,
    permanentAdjustments,
    annualObservations,
    narrative: narrative.trim(),
  }
}

function buildPeriodSynthesis(
  sessions: Array<{
    plannedType: string
    attendance: string | null
    outcome: string | null
    isExtraordinary: boolean
    supportObjective: {
      linkedProcesses: string[]
      macroArea: string
    }
  }>,
  objectives: Array<{ id: string; specificGoal: string }>
): PeriodSynthesisSection {
  const totalSessions = sessions.length
  const sessionsAula = sessions.filter((s) => s.plannedType === 'aula').length
  const sessionsPersonalizada = sessions.filter((s) => s.plannedType === 'personalizada').length
  const sessionsAttended = sessions.filter((s) => s.attendance === 'present').length
  const sessionsAbsent = sessions.filter((s) => s.attendance === 'absent').length
  const sessionsExtraordinary = sessions.filter((s) => s.isExtraordinary).length
  const sessionsWithOutcome = sessions.filter((s) => s.outcome).length
  const completionRate = totalSessions > 0
    ? Math.round((sessionsWithOutcome / totalSessions) * 100)
    : 0

  // Procesos involucrados (únicos)
  const allProcesses = sessions.flatMap((s) => s.supportObjective.linkedProcesses)
  const processesInvolved = [...new Set(allProcesses)]

  // Áreas trabajadas
  const areasWorked = [...new Set(sessions.map((s) => s.supportObjective.macroArea))]

  let narrative = `Durante el periodo se trabajaron ${objectives.length} objetivo(s) `
  narrative += `a través de ${totalSessions} sesiones planificadas`

  if (sessionsAula > 0 && sessionsPersonalizada > 0) {
    narrative += ` (${sessionsAula} en aula y ${sessionsPersonalizada} personalizadas)`
  } else if (sessionsAula > 0) {
    narrative += ` (${sessionsAula} en aula)`
  } else if (sessionsPersonalizada > 0) {
    narrative += ` (${sessionsPersonalizada} personalizadas)`
  }

  narrative += `. `

  if (sessionsAbsent > 0) {
    narrative += `Se registraron ${sessionsAbsent} ausencia(s). `
  }

  if (areasWorked.length > 0) {
    narrative += `Las áreas de intervención abordadas fueron: ${areasWorked.join(', ')}. `
  }

  if (processesInvolved.length > 0) {
    narrative += `Los procesos implicados incluyen: ${processesInvolved.join(', ')}.`
  }

  return {
    objectivesWorked: objectives.length,
    totalSessions,
    sessionsAula,
    sessionsPersonalizada,
    sessionsAttended,
    sessionsAbsent,
    sessionsExtraordinary,
    completionRate,
    processesInvolved,
    narrative: narrative.trim(),
  }
}

function buildObjectiveDevelopment(
  sessions: Array<{
    supportObjectiveId: string
    attendance: string | null
    outcome: string | null
    supportLevel: number | null
    observationTags: string[]
    supportObjective: {
      id: string
      macroArea: string
      specificGoal: string
    }
  }>,
  objectives: Array<{
    id: string
    macroArea: string
    specificGoal: string
  }>
): ObjectiveDevelopmentSection[] {
  return objectives.map((objective) => {
    const objSessions = sessions.filter(
      (s) => s.supportObjectiveId === objective.id
    )

    const attendedSessions = objSessions.filter((s) => s.attendance === 'present')
    const achievedCount = attendedSessions.filter((s) => s.outcome === 'achieved').length
    const partialCount = attendedSessions.filter((s) => s.outcome === 'partial').length
    const notAchievedCount = attendedSessions.filter((s) => s.outcome === 'notAchieved').length
    const totalWithOutcome = achievedCount + partialCount + notAchievedCount

    const achievedPercentage = totalWithOutcome > 0
      ? Math.round((achievedCount / totalWithOutcome) * 100)
      : 0

    // Nivel de apoyo promedio
    const supportLevels = attendedSessions
      .map((s) => s.supportLevel)
      .filter((l): l is number => l !== null)
    const averageSupportLevel = supportLevels.length > 0
      ? Math.round((supportLevels.reduce((a, b) => a + b, 0) / supportLevels.length) * 10) / 10
      : 0

    // Tags consolidados
    const allTags = attendedSessions.flatMap((s) => s.observationTags)
    const tagCounts = allTags.reduce(
      (acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag)

    // Determinar resultado predominante
    let predominantOutcome = 'sin datos'
    if (totalWithOutcome > 0) {
      if (achievedCount >= partialCount && achievedCount >= notAchievedCount) {
        predominantOutcome = 'achieved'
      } else if (partialCount >= achievedCount && partialCount >= notAchievedCount) {
        predominantOutcome = 'partial'
      } else {
        predominantOutcome = 'notAchieved'
      }
    }

    // Nivel de progreso según reglas del documento
    let progressLevel: string
    if (achievedPercentage >= 60) {
      progressLevel = 'avances significativos'
    } else if (predominantOutcome === 'partial') {
      progressLevel = 'avances progresivos'
    } else {
      progressLevel = 'en proceso de adquisición'
    }

    // Narrativa
    let narrative = `En el objetivo "${objective.specificGoal}" (${objective.macroArea}), `

    if (totalWithOutcome === 0) {
      narrative += `no se registraron resultados durante el periodo.`
    } else {
      narrative += `se realizaron ${objSessions.length} sesiones, `
      narrative += `de las cuales ${attendedSessions.length} fueron atendidas. `

      if (progressLevel === 'avances significativos') {
        narrative += `El estudiante muestra avances significativos, alcanzando el logro en el ${achievedPercentage}% de las sesiones. `
      } else if (progressLevel === 'avances progresivos') {
        narrative += `El estudiante muestra avances progresivos, con logros parciales predominantes. `
      } else {
        narrative += `El objetivo se encuentra en proceso de adquisición. `
      }

      if (averageSupportLevel > 0) {
        const levelDesc = averageSupportLevel <= 1.5
          ? 'mínimo'
          : averageSupportLevel <= 2.5
            ? 'moderado (guía verbal)'
            : averageSupportLevel <= 3.5
              ? 'alto (modelado)'
              : 'máximo (apoyo completo)'
        narrative += `El nivel de apoyo requerido fue ${levelDesc} (promedio: ${averageSupportLevel}). `
      }

      if (topTags.length > 0) {
        narrative += `Se observó: ${topTags.join(', ')}.`
      }
    }

    return {
      macroArea: objective.macroArea,
      specificGoal: objective.specificGoal,
      totalSessions: objSessions.length,
      attendedSessions: attendedSessions.length,
      achievedCount,
      partialCount,
      notAchievedCount,
      achievedPercentage,
      predominantOutcome,
      averageSupportLevel,
      observationTags: topTags,
      progressLevel,
      narrative: narrative.trim(),
    }
  })
}

function buildSupports(
  sessions: Array<{
    observationTags: string[]
    plannedType: string
  }>
): SupportsSection {
  // Consolidar todas las estrategias/tags
  const allTags = sessions.flatMap((s) => s.observationTags)
  const uniqueTags = [...new Set(allTags)]

  const types = [...new Set(sessions.map((s) => s.plannedType))]
  const typeLabels = types.map((t) =>
    t === 'aula' ? 'intervención en aula' : 'atención personalizada'
  )

  let narrative = `Los apoyos implementados durante el periodo incluyeron: ${typeLabels.join(' y ')}. `

  if (uniqueTags.length > 0) {
    narrative += `Las estrategias y observaciones registradas fueron: ${uniqueTags.join(', ')}.`
  }

  return {
    strategies: uniqueTags,
    narrative: narrative.trim(),
  }
}

function buildRecommendations(
  objectiveDevelopment: ObjectiveDevelopmentSection[],
  plan: {
    activeDifficulties: string[]
    specificStrategies: string
  }
): RecommendationsSection {
  const suggested: string[] = []

  // Sugerencias basadas en progreso
  for (const obj of objectiveDevelopment) {
    if (obj.progressLevel === 'en proceso de adquisición') {
      suggested.push(
        `Continuar trabajando el objetivo "${obj.specificGoal}" con mayor frecuencia o ajuste de estrategias.`
      )
    }
    if (obj.averageSupportLevel >= 3) {
      suggested.push(
        `Evaluar estrategias adicionales para "${obj.specificGoal}" dado el alto nivel de apoyo requerido.`
      )
    }
    if (obj.progressLevel === 'avances significativos') {
      suggested.push(
        `Considerar avanzar hacia objetivos más complejos en el área de ${obj.macroArea}.`
      )
    }
  }

  if (plan.specificStrategies) {
    suggested.push(`Mantener las adecuaciones específicas del plan: ${plan.specificStrategies}`)
  }

  suggested.push(
    'Continuar el trabajo colaborativo entre docente de apoyo y docente de grado.',
    'Comunicar avances a la familia para reforzar desde el hogar.'
  )

  return {
    suggested,
    editable: suggested.join('\n\n'),
  }
}