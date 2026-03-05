// app/api/reports/[studentId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { generateReport } from '@/lib/report-engine'

// GET — Generar informe para un estudiante
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { studentId } = await params
  const { searchParams } = new URL(req.url)
  const monthsParam = searchParams.get('months')

  if (!monthsParam) {
    return NextResponse.json(
      { error: 'Parámetro months requerido (ej: months=1,2,3)' },
      { status: 400 }
    )
  }

  const months = monthsParam.split(',').map(Number).filter((n) => n >= 1 && n <= 12)

  if (months.length === 0) {
    return NextResponse.json(
      { error: 'Meses inválidos' },
      { status: 400 }
    )
  }

  try {
    const report = await generateReport(token.teacherId, studentId, months)
    return NextResponse.json(report)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al generar informe'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}