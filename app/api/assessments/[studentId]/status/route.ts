// app/api/assessments/[studentId]/status/route.ts
//
// PATCH — Cambiar el estado del expediente de valoración y/o registrar la
//         decisión de ingreso al sistema de apoyo.
//
// Body (todos opcionales — solo se actualizan los campos enviados):
//   status:          "active" | "completed"
//   requiresSupport: boolean | null
//
// Casos de uso:
//   { status: "completed" }                      → finalizar valoración
//   { status: "active" }                         → reabrir expediente
//   { requiresSupport: true }                    → registrar decisión de apoyo
//   { requiresSupport: false }                   → registrar decisión de no apoyo
//   { status: "completed", requiresSupport: true } → cerrar y registrar en una llamada
//   { bsaReceivedDate: "2026-05-01" }            → registrar recepción BSA (ISO date)
//   { bsaReceivedDate: null }                      → limpiar registro BSA
//   { serviceIntakeType: "nuevo_ingreso" | "continuidad" }

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['active', 'completed'] as const

export async function PATCH(
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
    select: { id: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const { status, requiresSupport, bsaReceivedDate, serviceIntakeType } = body

  // Validar status si viene en el body
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validar requiresSupport si viene en el body
  if (
    requiresSupport !== undefined &&
    requiresSupport !== null &&
    typeof requiresSupport !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'requiresSupport debe ser boolean o null' },
      { status: 400 }
    )
  }

  if (
    serviceIntakeType !== undefined &&
    serviceIntakeType !== null &&
    serviceIntakeType !== 'nuevo_ingreso' &&
    serviceIntakeType !== 'continuidad'
  ) {
    return NextResponse.json(
      { error: 'serviceIntakeType inválido. Valores: nuevo_ingreso, continuidad' },
      { status: 400 },
    )
  }

  // Construir solo los campos que vienen en el body
  const patch: Record<string, unknown> = {}
  if (status !== undefined) patch.status = status
  if (requiresSupport !== undefined) patch.requiresSupport = requiresSupport
  if (bsaReceivedDate !== undefined) {
    patch.bsaReceivedDate = bsaReceivedDate ? new Date(bsaReceivedDate) : null
  }
  if (serviceIntakeType !== undefined) patch.serviceIntakeType = serviceIntakeType
  // Al completar → registrar fecha de elaboración automáticamente
  if (status === 'completed') patch.elaborationDate = new Date()
  // Al reabrir → limpiar la fecha de elaboración
  if (status === 'active') patch.elaborationDate = null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Se requiere al menos un campo: status, requiresSupport, bsaReceivedDate o serviceIntakeType' },
      { status: 400 }
    )
  }

  // Upsert: crea el registro si todavía no existe (puede ocurrir si el docente
  // intenta cerrar sin haber guardado ninguna sección aún)
  const assessment = await prisma.integralAssessment.upsert({
    where: { studentId },
    create: { studentId, ...patch },
    update: patch,
  })

  return NextResponse.json(assessment)
}
