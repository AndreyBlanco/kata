// app/api/assessments/[studentId]/results/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ studentId: string }> }

/**
 * GET /api/assessments/[studentId]/results
 *
 * Devuelve los resultados de valoración guardados para un estudiante.
 *
 * Query params opcionales:
 *   ?difficulty=DISGRAFIA   → filtra solo los resultados de esa dificultad
 *   ?withObjective=true     → incluye los datos completos del objetivo en cada resultado
 */
export async function GET(req: NextRequest, { params }: Params) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params
  const { searchParams } = new URL(req.url)
  const difficulty    = searchParams.get('difficulty')    ?? undefined
  const withObjective = searchParams.get('withObjective') === 'true'

  // Verificar que el estudiante pertenece al docente
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId as string },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const results = await prisma.studentAssessmentResult.findMany({
    where: {
      studentId,
      ...(difficulty
        ? { objective: { difficulty } }
        : {}),
    },
    select: {
      id:         true,
      objectiveId: true,
      result:     true,
      scaleValue: true,
      notes:      true,
      assessedAt: true,
      ...(withObjective
        ? {
            objective: {
              select: {
                code:           true,
                difficulty:     true,
                difficultyLabel: true,
                areaCode:       true,
                areaLabel:      true,
                level:          true,
                levelLabel:     true,
                levelType:      true,
                levelSort:      true,
                itemOrder:      true,
                description:    true,
              },
            },
          }
        : {}),
    },
    orderBy: { assessedAt: 'desc' },
  })

  return NextResponse.json(results)
}

/**
 * POST /api/assessments/[studentId]/results
 *
 * Guarda o actualiza un lote de resultados de valoración.
 * Usa upsert por (studentId + objectiveId) — sobreescribe el resultado anterior.
 *
 * Body: Array de resultados
 * [
 *   {
 *     objectiveId: string,
 *     result: "yes" | "no" | "withSupport",
 *     scaleValue?: number,   // solo para levelType=scale (1-5)
 *     notes?: string
 *   }
 * ]
 */
export async function POST(req: NextRequest, { params }: Params) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params

  // Verificar que el estudiante pertenece al docente
  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId as string },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json(
      { error: 'El cuerpo debe ser un array de resultados no vacío' },
      { status: 400 },
    )
  }

  const VALID_RESULTS = ['yes', 'no', 'withSupport']
  const errors: string[] = []

  for (let i = 0; i < body.length; i++) {
    const item = body[i]
    if (!item.objectiveId) errors.push(`[${i}] objectiveId requerido`)
    if (!VALID_RESULTS.includes(item.result)) {
      errors.push(`[${i}] result debe ser: yes | no | withSupport`)
    }
    if (item.scaleValue !== undefined) {
      const v = Number(item.scaleValue)
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        errors.push(`[${i}] scaleValue debe ser entero entre 1 y 5`)
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Datos inválidos', details: errors }, { status: 422 })
  }

  const now = new Date()
  const saved = await Promise.all(
    body.map((item: {
      objectiveId: string
      result: 'yes' | 'no' | 'withSupport'
      scaleValue?: number
      notes?: string
    }) =>
      prisma.studentAssessmentResult.upsert({
        where: {
          studentId_objectiveId: {
            studentId,
            objectiveId: item.objectiveId,
          },
        },
        update: {
          result:     item.result,
          scaleValue: item.scaleValue ?? null,
          notes:      item.notes ?? null,
          assessedAt: now,
        },
        create: {
          studentId,
          objectiveId: item.objectiveId,
          result:      item.result,
          scaleValue:  item.scaleValue ?? null,
          notes:       item.notes ?? null,
          assessedAt:  now,
        },
        select: {
          id:         true,
          objectiveId: true,
          result:     true,
          scaleValue: true,
          assessedAt: true,
        },
      }),
    ),
  )

  return NextResponse.json({ saved: saved.length, results: saved }, { status: 200 })
}

/**
 * DELETE /api/assessments/[studentId]/results?objectiveId=XXX
 *
 * Elimina el resultado de un objetivo específico para un estudiante,
 * efectivamente marcando ese objetivo como "sin evaluar".
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params
  const { searchParams } = new URL(req.url)
  const objectiveId = searchParams.get('objectiveId')

  if (!objectiveId) {
    return NextResponse.json(
      { error: 'Se requiere el parámetro objectiveId' },
      { status: 400 }
    )
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: token.teacherId as string },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  await prisma.studentAssessmentResult.deleteMany({
    where: { studentId, objectiveId },
  })

  return NextResponse.json({ ok: true })
}
