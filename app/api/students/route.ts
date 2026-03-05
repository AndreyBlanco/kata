// app/api/students/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET — Listar estudiantes del docente
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const students = await prisma.student.findMany({
    where: { teacherId: token.teacherId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(students)
}

// POST — Crear estudiante
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify teacher exists
  const teacher = await prisma.teacher.findUnique({
    where: { id: token.teacherId },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: 'Docente no encontrado. Cierre sesión e inicie de nuevo.' },
      { status: 404 }
    )
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

  // Validaciones
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

  const student = await prisma.student.create({
    data: {
      name: name.trim(),
      birthDate: parsedBirthDate,
      grade: grade.trim(),
      cedula: cedula?.trim() || null,
      medicalDiagnosis: medicalDiagnosis?.trim() || 'NO APLICA',
      classroomTeacherName: classroomTeacherName?.trim() || null,
      guardianName: guardianName?.trim() || null,
      guardianPhone: guardianPhone?.trim() || null,
      teacherId: token.teacherId,
    },
  })

  return NextResponse.json(student, { status: 201 })
}