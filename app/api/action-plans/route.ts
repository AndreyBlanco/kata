/**
 * GET  /api/action-plans?schoolPeriod=2026-I
 *   Lista los planes mensuales del docente para el periodo (con estado y conteos).
 *
 * POST /api/action-plans
 *   Body: { year: number; month: number; schoolPeriod?: string }
 *   Crea un plan mensual vacío. Falla si ya existe uno para (docente, year, month).
 *   El mes debe pertenecer al `schoolPeriod` (validado).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher, resolvePeriodForRequest } from '@/lib/student-access'
import { prisma } from '@/lib/prisma'
import { isMonthInSchoolPeriod, monthLabel } from '@/lib/action-plan-validation'

export async function GET(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolPeriod = await resolvePeriodForRequest(
    auth.teacherId,
    searchParams.get('schoolPeriod'),
  )

  const plans = await prisma.actionPlan.findMany({
    where: { teacherId: auth.teacherId, schoolPeriod },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    include: {
      _count: { select: { lines: true } },
    },
  })

  return NextResponse.json({
    schoolPeriod,
    plans: plans.map((p) => ({
      id: p.id,
      year: p.year,
      month: p.month,
      label: monthLabel(p.month, p.year),
      status: p.status,
      approvedAt: p.approvedAt,
      linesCount: p._count.lines,
      updatedAt: p.updatedAt,
    })),
  })
}

interface PostBody {
  year?: number
  month?: number
  schoolPeriod?: string
}

export async function POST(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as PostBody
  const schoolPeriod = await resolvePeriodForRequest(auth.teacherId, body.schoolPeriod)

  const year = Number(body.year)
  const month = Number(body.month)
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json(
      { error: 'year y month son requeridos (enteros)' },
      { status: 400 },
    )
  }

  const periodCheck = isMonthInSchoolPeriod(schoolPeriod, year, month)
  if (!periodCheck.valid) {
    return NextResponse.json({ error: periodCheck.reason }, { status: 400 })
  }

  // Verifica duplicado
  const existing = await prisma.actionPlan.findUnique({
    where: { teacherId_year_month: { teacherId: auth.teacherId, year, month } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un plan para ${monthLabel(month, year)}`, existingId: existing.id },
      { status: 409 },
    )
  }

  const plan = await prisma.actionPlan.create({
    data: {
      teacherId: auth.teacherId,
      schoolPeriod,
      year,
      month,
      status: 'BORRADOR',
    },
  })

  return NextResponse.json({ id: plan.id, year, month, status: plan.status }, { status: 201 })
}
