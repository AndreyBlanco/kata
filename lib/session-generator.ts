// lib/session-generator.ts

import { prisma } from './prisma'

interface GenerateParams {
  teacherId: string
  studentId: string
  month: number    // 1–12
  year: number
}

interface GenerationResult {
  created: number
  skipped: number
  objectives: string[]
}

export async function generateMonthlySessions(
  params: GenerateParams
): Promise<GenerationResult> {
  const { teacherId, studentId, month } = params

  // Verificar que el estudiante pertenece al docente
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId },
  })

  if (!student) {
    throw new Error('Estudiante no encontrado')
  }

  // Obtener objetivos activos del estudiante
  const objectives = await prisma.supportObjective.findMany({
    where: {
      teacherId,
      studentIds: { has: studentId },
      active: true,
    },
  })

  if (objectives.length === 0) {
    throw new Error('No hay objetivos activos para este estudiante')
  }

  // Verificar si ya existen sesiones para este mes
  const existingSessions = await prisma.generatedSession.count({
    where: {
      studentId,
      month,
      isExtraordinary: false,
    },
  })

  if (existingSessions > 0) {
    return {
      created: 0,
      skipped: existingSessions,
      objectives: objectives.map((o) => o.specificGoal),
    }
  }

  // Generar sesiones
  const sessionsToCreate = []

  for (const objective of objectives) {
    // Determinar tipo de sesión planificada
    const sessionTypes: string[] = []
    if (objective.interventionType === 'aula') {
      sessionTypes.push('aula')
    } else if (objective.interventionType === 'personalizada') {
      sessionTypes.push('personalizada')
    } else {
      // ambas: alternar semanas
      sessionTypes.push('personalizada', 'aula')
    }

    for (let week = 1; week <= 4; week++) {
      for (let f = 0; f < objective.frequencyPerWeek; f++) {
        // Determinar tipo para esta sesión
        const typeIndex = (week - 1 + f) % sessionTypes.length
        const plannedType = sessionTypes[typeIndex]

        sessionsToCreate.push({
          studentId,
          supportObjectiveId: objective.id,
          month,
          weekNumber: week,
          plannedType: plannedType as 'aula' | 'personalizada',
          duration: objective.duration,
          isExtraordinary: false,
        })
      }
    }
  }

  // Crear todas las sesiones
  await prisma.generatedSession.createMany({
    data: sessionsToCreate,
  })

  return {
    created: sessionsToCreate.length,
    skipped: 0,
    objectives: objectives.map((o) => o.specificGoal),
  }
}