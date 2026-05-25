// app/estudiantes/nuevo/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateAge } from '@/lib/utils'

export default function NuevoEstudiantePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [grade, setGrade] = useState('')
  const [cedula, setCedula] = useState('')
  const [medicalDiagnosis, setMedicalDiagnosis] = useState('')
  const [classroomTeacherName, setClassroomTeacherName] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Calculated age preview
  const calculatedAge = birthDate ? calculateAge(birthDate) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          birthDate,
          grade,
          cedula: cedula || undefined,
          medicalDiagnosis: medicalDiagnosis || undefined,
          classroomTeacherName: classroomTeacherName || undefined,
          guardianName: guardianName || undefined,
          guardianPhone: guardianPhone || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al crear estudiante')
        return
      }

      const student = await res.json()
      router.push(`/estudiantes/${student.id}`)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/estudiantes')}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← Estudiantes
          </button>
          <h1 className="text-xl font-bold text-gray-900">Nuevo Estudiante</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-1">
              Nombre completo *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900"
              placeholder="Nombre completo del estudiante"
            />
          </div>

          {/* Fecha de nacimiento + Sección */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="birthDate" className="block text-sm font-semibold text-gray-900 mb-1">
                  Fecha de nacimiento *
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                />
                {calculatedAge !== null && (
                  <p className="text-xs text-blue-600 mt-1">
                    Edad actual: <strong>{calculatedAge} años</strong>
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold text-gray-900 mb-1">
                  Sección *
                </label>
                <input
                  id="grade"
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                  placeholder="Ej: 4-A"
                />
              </div>
            </div>
          </div>

          {/* Cédula + Diagnóstico */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cedula" className="block text-sm font-semibold text-gray-900 mb-1">
                  Identificación
                </label>
                <input
                  id="cedula"
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                  placeholder="Ej: 2-1008-0939"
                />
              </div>
              <div>
                <label htmlFor="diagnosis" className="block text-sm font-semibold text-gray-900 mb-1">
                  Diagnóstico médico
                </label>
                <input
                  id="diagnosis"
                  type="text"
                  value={medicalDiagnosis}
                  onChange={(e) => setMedicalDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                  placeholder="NO APLICA"
                />
              </div>
            </div>
          </div>

          {/* Docente guía */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label htmlFor="classroomTeacher" className="block text-sm font-semibold text-gray-900 mb-1">
              Docente guía
            </label>
            <input
              id="classroomTeacher"
              type="text"
              value={classroomTeacherName}
              onChange={(e) => setClassroomTeacherName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900"
              placeholder="Nombre del docente guía"
            />
          </div>

          {/* Encargado */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Persona encargada
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="guardianName" className="block text-xs text-gray-500 mb-1">
                  Nombre
                </label>
                <input
                  id="guardianName"
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                  placeholder="Nombre del encargado"
                />
              </div>
              <div>
                <label htmlFor="guardianPhone" className="block text-xs text-gray-500 mb-1">
                  Teléfono
                </label>
                <input
                  id="guardianPhone"
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                  placeholder="8888-8888"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/estudiantes')}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md
                         font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !birthDate || !grade.trim()}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-md
                         font-medium hover:bg-blue-700 transition-colors
                         disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Creando...' : 'Crear Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}