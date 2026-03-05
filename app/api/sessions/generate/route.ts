// app/api/sessions/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { generateMonthlySessions } from '@/lib/session-generator'

// POST — Generar sesiones mensuales para un estudiante
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { studentId, month, year } = body

  if (!studentId || !month || !year) {
    return NextResponse.json(
      { error: 'studentId, month y year son requeridos' },
      { status: 400 }
    )
  }

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { error: 'El mes debe ser entre 1 y 12' },
      { status: 400 }
    )
  }

  try {
    const result = await generateMonthlySessions({
      teacherId: token.teacherId,
      studentId,
      month,
      year,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al generar'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}