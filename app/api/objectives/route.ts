// app/api/objectives/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Listar objetivos del docente (opcionalmente filtrados por studentId)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')

  const where: Record<string, unknown> = { teacherId: token.teacherId }

  if (studentId) {
    where.studentIds = { has: studentId }
  }

  const objectives = await prisma.supportObjective.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(objectives)
}

// POST — Asignar objetivo del catálogo a un estudiante
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    studentId,
    catalogId,
    macroArea,
    specificGoal,
    frequencyPerWeek,
    duration,
    interventionType,
    linkedProcesses,
    linkedDifficulties,
  } = body

  // Validaciones básicas
  if (!studentId || !catalogId || !macroArea || !specificGoal) {
    return NextResponse.json(
      { error: 'Datos incompletos' },
      { status: 400 }
    )
  }

  if (!frequencyPerWeek || frequencyPerWeek < 1 || frequencyPerWeek > 3) {
    return NextResponse.json(
      { error: 'Frecuencia debe ser entre 1 y 3' },
      { status: 400 }
    )
  }

  if (![20, 40, 60].includes(duration)) {
    return NextResponse.json(
      { error: 'Duración debe ser 20, 40 o 60 minutos' },
      { status: 400 }
    )
  }

  // Verificar que el estudiante pertenece al docente
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId },
  })

  if (!student) {
    return NextResponse.json(
      { error: 'Estudiante no encontrado' },
      { status: 404 }
    )
  }

  // Si no se envían procesos/dificultades, intentar precargar del Plan
  let finalProcesses = linkedProcesses || []
  let finalDifficulties = linkedDifficulties || []

  if (finalProcesses.length === 0 || finalDifficulties.length === 0) {
    const plan = await prisma.studentSupportPlan.findUnique({
      where: { studentId },
      select: {
        priorityProcesses: true,
        executiveSubprocesses: true,
        activeDifficulties: true,
      },
    })

    if (plan) {
      if (finalProcesses.length === 0) {
        finalProcesses = [
          ...plan.priorityProcesses,
          ...plan.executiveSubprocesses,
        ]
      }
      if (finalDifficulties.length === 0) {
        finalDifficulties = plan.activeDifficulties
      }
    }
  }

  const objective = await prisma.supportObjective.create({
    data: {
      teacherId: token.teacherId,
      studentIds: [studentId],
      macroArea,
      subArea: macroArea,
      specificGoal,
      frequencyPerWeek,
      duration,
      interventionType,
      linkedProcesses: finalProcesses,
      linkedDifficulties: finalDifficulties,
      active: true,
    },
  })

  return NextResponse.json(objective, { status: 201 })
}