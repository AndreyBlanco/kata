// app/api/students/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Obtener un estudiante
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const student = await prisma.student.findFirst({
    where: { id, teacherId: token.teacherId },
    include: {
      teacher: {
        select: { name: true, centerName: true },
      },
    },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  // Return flat object with teacher info for convenience
  return NextResponse.json({
    ...student,
    teacherName: student.teacher.name,
    centerName: student.teacher.centerName,
  })
}

// PUT — Actualizar estudiante
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.student.findFirst({
    where: { id, teacherId: token.teacherId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const {
    name,
    birthDate,
    grade,
    cedula,
    medicalDiagnosis,
    classroomTeacherName,
    guardianName,
    guardianPhone,
  } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  if (!birthDate) {
    return NextResponse.json({ error: 'La fecha de nacimiento es requerida' }, { status: 400 })
  }

  const parsedBirthDate = new Date(birthDate)
  if (isNaN(parsedBirthDate.getTime())) {
    return NextResponse.json({ error: 'Fecha de nacimiento inválida' }, { status: 400 })
  }

  if (!grade || !grade.trim()) {
    return NextResponse.json({ error: 'La sección es requerida' }, { status: 400 })
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      name: name.trim(),
      birthDate: parsedBirthDate,
      grade: grade.trim(),
      cedula: cedula?.trim() || null,
      medicalDiagnosis: medicalDiagnosis?.trim() || 'NO APLICA',
      classroomTeacherName: classroomTeacherName?.trim() || null,
      guardianName: guardianName?.trim() || null,
      guardianPhone: guardianPhone?.trim() || null,
    },
  })

  return NextResponse.json(student)
}

// DELETE — Eliminar estudiante
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.student.findFirst({
    where: { id, teacherId: token.teacherId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  await prisma.student.delete({ where: { id } })

  return NextResponse.json({ success: true })
}