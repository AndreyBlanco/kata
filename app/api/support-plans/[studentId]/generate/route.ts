// app/api/support-plans/[studentId]/generate/route.ts
//
// POST — Genera un borrador del Plan de Apoyo a partir de:
//   • La Valoración Integral del estudiante (fortalezas, texto libre)
//   • Los StudentAssessmentResult con resultado "no" o "withSupport"
//
// El borrador se devuelve sin guardar; el docente lo edita y lo confirma
// mediante PUT /api/support-plans/[studentId].

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { generateSupportPlanDraft } from '@/lib/support-plan-generator'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  // Verificar propiedad del estudiante
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId },
    select: { id: true, name: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const draft = await generateSupportPlanDraft(studentId)

  return NextResponse.json(draft)
}
