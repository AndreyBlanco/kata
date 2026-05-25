'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditarEstudiantePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [name, setName] = useState('')
  const [cedula, setCedula] = useState('')
  const [age, setAge] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [gradeGroup, setGradeGroup] = useState('')
  const [medicalDiagnosis, setMedicalDiagnosis] = useState('')
  const [classroomTeacherName, setClassroomTeacherName] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('No encontrado')
        return res.json()
      })
      .then((data) => {
        setName(data.name)
        setCedula(data.cedula || '')
        setAge(String(data.age))
        setMedicalDiagnosis(data.medicalDiagnosis === 'NO APLICA' ? '' : data.medicalDiagnosis || '')
        setClassroomTeacherName(data.classroomTeacherName || '')
        setGuardianName(data.guardianName || '')
        setGuardianPhone(data.guardianPhone || '')

        if (data.grade === 'Preescolar') {
          setGradeLevel('Preescolar')
          setGradeGroup('')
        } else if (data.grade && data.grade.includes('-')) {
          const [level, group] = data.grade.split('-')
          setGradeLevel(level)
          setGradeGroup(group)
        } else {
          setGradeLevel(data.grade || '')
          setGradeGroup('')
        }

        setLoading(false)
      })
      .catch(() => {
        router.push('/estudiantes')
      })
  }, [id, router])

  useEffect(() => {
    if (gradeLevel === 'Preescolar') {
      setGradeGroup('')
    }
  }, [gradeLevel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        cedula: cedula || null,
        age: Number(age),
        grade: gradeLevel === 'Preescolar' ? 'Preescolar' : `${gradeLevel}-${gradeGroup}`,
        medicalDiagnosis: medicalDiagnosis || 'NO APLICA',
        classroomTeacherName: classroomTeacherName || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al guardar')
      setSaving(false)
      return
    }

    router.push(`/estudiantes/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-gray-900">Editar Estudiante</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-800 border-b pb-1 w-full">
              Datos del estudiante
            </legend>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cedula" className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula de identidad
                </label>
                <input
                  id="cedula"
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                  Edad *
                </label>
                <input
                  id="age"
                  type="number"
                  min="3"
                  max="18"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Grado *
                </label>
                <select
                  id="gradeLevel"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                >
                  <option value="">Seleccionar</option>
                  <option value="Preescolar">Preescolar</option>
                  <option value="1">1°</option>
                  <option value="2">2°</option>
                  <option value="3">3°</option>
                  <option value="4">4°</option>
                  <option value="5">5°</option>
                  <option value="6">6°</option>
                </select>
              </div>

              <div>
                <label htmlFor="gradeGroup" className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo {gradeLevel && gradeLevel !== 'Preescolar' ? '*' : ''}
                </label>
                <select
                  id="gradeGroup"
                  value={gradeGroup}
                  onChange={(e) => setGradeGroup(e.target.value)}
                  required={gradeLevel !== '' && gradeLevel !== 'Preescolar'}
                  disabled={gradeLevel === '' || gradeLevel === 'Preescolar'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900
                             disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Seleccionar</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="medicalDiagnosis" className="block text-sm font-medium text-gray-700 mb-1">
                Diagnóstico médico
              </label>
              <input
                id="medicalDiagnosis"
                type="text"
                value={medicalDiagnosis}
                onChange={(e) => setMedicalDiagnosis(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
                placeholder="Dejar vacío si no aplica"
              />
              <p className="text-xs text-gray-400 mt-1">Si no hay diagnóstico, se registrará como &quot;NO APLICA&quot;</p>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-800 border-b pb-1 w-full">
              Contexto escolar
            </legend>

            <div>
              <label htmlFor="classroomTeacherName" className="block text-sm font-medium text-gray-700 mb-1">
                Docente a cargo
              </label>
              <input
                id="classroomTeacherName"
                type="text"
                value={classroomTeacherName}
                onChange={(e) => setClassroomTeacherName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
                placeholder="Docente de I/II Ciclo o Preescolar"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-800 border-b pb-1 w-full">
              Persona encargada
            </legend>

            <div>
              <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del encargado
              </label>
              <input
                id="guardianName"
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Número de contacto
              </label>
              <input
                id="guardianPhone"
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
              />
            </div>
          </fieldset>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md
                       font-medium hover:bg-blue-700 transition-colors
                       disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}