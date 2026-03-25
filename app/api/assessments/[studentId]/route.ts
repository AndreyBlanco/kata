// app/api/assessments/[studentId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Obtener valoración integral de un estudiante
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

  const assessment = await prisma.integralAssessment.findUnique({
    where: { studentId },
  })

  return NextResponse.json(assessment)
}

// PUT — Crear o actualizar valoración integral
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
    bsaReceivedDate,
    participants,
    classroomContext,
    institutionalContext,
    familyContext,
    strengths,
    strengthCodes,
    barriers,
    barrierCodes,
    curricularPerformance,
    instruments,
    integralAnalysis,
    requiredSupports,
    supportCodes,
    agreements,
    followUp,
    followupCodes,
  } = body

  const data = {
    elaborationDate: elaborationDate ? new Date(elaborationDate) : null,
    bsaReceivedDate: bsaReceivedDate ? new Date(bsaReceivedDate) : null,
    participants:           participants           ?? [],
    classroomContext:       classroomContext       ?? '',
    institutionalContext:   institutionalContext   ?? '',
    familyContext:          familyContext          ?? '',
    strengths:              strengths              ?? '',
    strengthCodes:          strengthCodes          ?? [],
    barriers:               barriers               ?? '',
    barrierCodes:           barrierCodes           ?? [],
    curricularPerformance:  curricularPerformance  ?? '',
    instruments:            instruments            ?? [],
    integralAnalysis:       integralAnalysis       ?? '',
    requiredSupports:       requiredSupports       ?? '',
    supportCodes:           supportCodes           ?? [],
    agreements:             agreements             ?? '',
    followUp:               followUp               ?? '',
    followupCodes:          followupCodes          ?? [],
  }

  const assessment = await prisma.integralAssessment.upsert({
    where: { studentId },
    create: { studentId, ...data },
    update: data,
  })

  return NextResponse.json(assessment)
}