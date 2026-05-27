/**
 * POST /api/signup
 *
 * Crea un Teacher nuevo para el piloto (alta de cuenta desde /login).
 *
 * Nota: en producción real esto debería estar protegido (invites, allowlist
 * por dominio, captcha, etc.). Para el piloto lo dejamos abierto.
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

interface SignupBody {
  email?: string
  password?: string
  name?: string
  activeSchoolPeriod?: string | null
}

function normEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SignupBody

  const email = typeof body.email === 'string' ? normEmail(body.email) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const activeSchoolPeriod =
    typeof body.activeSchoolPeriod === 'string'
      ? body.activeSchoolPeriod.trim()
      : null

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 8 caracteres.' },
      { status: 400 },
    )
  }
  if (!name) return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 })

  const existing = await prisma.teacher.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json(
      { error: 'Ya existe una cuenta con ese correo.' },
      { status: 409 },
    )
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const teacher = await prisma.teacher.create({
    data: {
      email,
      passwordHash,
      name,
      // Estos campos son obligatorios en el schema actual, pero para el piloto
      // los llenamos como pendientes y se editan luego en /perfil.
      centerName: 'Pendiente',
      circuit: 'Pendiente',
      specialty: 'Problemas de Aprendizaje',
      activeSchoolPeriod: activeSchoolPeriod || null,
      // workModality default FIJO (schema)
    },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json({ ok: true, teacher }, { status: 201 })
}

