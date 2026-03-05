// app/estudiantes/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Student {
  id: string
  name: string
  age: number
  grade: string
}

export default function EstudiantesPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        setStudents(data)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Estudiantes</h1>
            <p className="text-sm text-gray-500">{students.length} registrados</p>
          </div>
          <Link
            href="/estudiantes/nuevo"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm
                       font-medium hover:bg-blue-700 transition-colors"
          >
            + Nuevo
          </Link>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-lg mx-auto p-4">
        {students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No hay estudiantes registrados</p>
            <Link
              href="/estudiantes/nuevo"
              className="text-blue-600 font-medium hover:underline"
            >
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/estudiantes/${student.id}`}
                className="block bg-white rounded-lg shadow-sm border p-4
                           hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-500">
                      {student.grade} · {student.age} años
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}