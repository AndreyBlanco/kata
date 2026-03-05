// app/api/support-plans/[studentId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Obtener plan de apoyo (incluye fortalezas de VI si el plan no tiene propias)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const plan = await prisma.studentSupportPlan.findUnique({
    where: { studentId },
  })

  // Si el plan existe pero no tiene fortalezas propias,
  // intentar precargar desde la Valoración Integral
  if (plan && !plan.strengths) {
    const assessment = await prisma.integralAssessment.findUnique({
      where: { studentId },
      select: { strengths: true },
    })
    if (assessment?.strengths) {
      return NextResponse.json({
        ...plan,
        strengths: assessment.strengths,
        _strengthsSource: 'assessment', // Flag para UI
      })
    }
  }

  return NextResponse.json(plan)
}

// PUT — Crear o actualizar plan de apoyo
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const {
    elaborationDate,
    activeDifficulties,
    priorityProcesses,
    executiveSubprocesses,
    strengths,
    mediationStrategies,
    homeStrategies,
    specificStrategies,
  } = body

  // Validación mínima: al menos 1 dificultad o 1 proceso
  const hasDifficulties = activeDifficulties && activeDifficulties.length > 0
  const hasProcesses = priorityProcesses && priorityProcesses.length > 0

  if (!hasDifficulties && !hasProcesses) {
    return NextResponse.json(
      { error: 'Se requiere al menos una dificultad o un proceso' },
      { status: 400 }
    )
  }

  const data = {
    elaborationDate: elaborationDate ? new Date(elaborationDate) : null,
    activeDifficulties: activeDifficulties || [],
    priorityProcesses: priorityProcesses || [],
    executiveSubprocesses: executiveSubprocesses || [],
    strengths: strengths || '',
    mediationStrategies: mediationStrategies || '',
    homeStrategies: homeStrategies || '',
    specificStrategies: specificStrategies || '',
    lastUpdated: new Date(),
  }

  const plan = await prisma.studentSupportPlan.upsert({
    where: { studentId },
    create: { studentId, ...data },
    update: data,
  })

  return NextResponse.json(plan)
}