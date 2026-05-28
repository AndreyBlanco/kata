'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateAge } from '@/lib/utils'
import type { StudentBsaFields } from '@/lib/bsa-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function NuevoEstudiantePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [grade, setGrade] = useState('')
  const [cedula, setCedula] = useState('')
  const [medicalDiagnosis, setMedicalDiagnosis] = useState('')
  const [classroomTeacherName, setClassroomTeacherName] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')

  const [bsaFields, setBsaFields] = useState<StudentBsaFields | null>(null)
  const [bsaFileName, setBsaFileName] = useState<string | null>(null)
  const [bsaWarnings, setBsaWarnings] = useState<string[]>([])
  const [bsaParsing, setBsaParsing] = useState(false)
  const [bsaParseError, setBsaParseError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const calculatedAge = birthDate ? calculateAge(birthDate) : null

  const applyStudentPreview = (preview: {
    name: string
    birthDate: string
    grade: string
    cedula?: string
    classroomTeacherName?: string
    guardianName?: string
    guardianPhone?: string
  }) => {
    if (preview.name) setName(preview.name)
    if (preview.birthDate) setBirthDate(preview.birthDate)
    if (preview.grade) setGrade(preview.grade)
    if (preview.cedula) setCedula(preview.cedula)
    if (preview.classroomTeacherName) setClassroomTeacherName(preview.classroomTeacherName)
    if (preview.guardianName) setGuardianName(preview.guardianName)
    if (preview.guardianPhone) setGuardianPhone(preview.guardianPhone)
  }

  const handleBsaFile = async (file: File | null) => {
    if (!file) return
    setBsaParseError(null)
    setBsaWarnings([])
    setBsaParsing(true)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/students/parse-bsa', {
        method: 'POST',
        body: form,
      })

      const data = await res.json()
      if (!res.ok) {
        setBsaParseError(data.error || 'No se pudo leer la BSA')
        setBsaFields(null)
        setBsaFileName(null)
        return
      }

      setBsaFields(data.fields)
      setBsaFileName(data.sourceFileName ?? file.name)
      setBsaWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      if (data.studentPreview) applyStudentPreview(data.studentPreview)
    } catch {
      setBsaParseError('Error de conexión al procesar la BSA')
      setBsaFields(null)
      setBsaFileName(null)
    } finally {
      setBsaParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearBsa = () => {
    setBsaFields(null)
    setBsaFileName(null)
    setBsaWarnings([])
    setBsaParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
          bsaFields: bsaFields ?? undefined,
          sourceFileName: bsaFileName ?? undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al crear estudiante')
        return
      }

      const student = await res.json()
      router.push(`/estudiantes/${student.id}/expediente`)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => router.push('/estudiantes')}
            className="text-sm text-kata-primary mb-2 hover:underline"
          >
            ← Estudiantes
          </button>
          <h1 className="text-xl font-bold text-gray-900">Nuevo Estudiante</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">

          <Card className="border-kata-primary/20 bg-kata-primary/5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Boleta de Solicitud (BSA)</p>
                <p className="mt-1 text-xs text-gray-600">
                  Subí el .docx para archivar la solicitud y pre-llenar el expediente.
                  Solo se guarda el contenido extraído, no el archivo.
                </p>
              </div>
              {bsaFields && (
                <Badge tone="primary">Lista</Badge>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => void handleBsaFile(e.target.files?.[0] ?? null)}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={bsaParsing}
                onClick={() => fileInputRef.current?.click()}
              >
                {bsaParsing ? 'Leyendo BSA…' : bsaFields ? 'Cambiar BSA' : 'Subir BSA (.docx)'}
              </Button>
              {bsaFields && (
                <Button type="button" variant="ghost" onClick={clearBsa}>
                  Quitar
                </Button>
              )}
            </div>

            {bsaFileName && !bsaParseError && (
              <p className="mt-2 text-xs text-gray-600">
                Archivo: <span className="font-medium">{bsaFileName}</span>
              </p>
            )}

            {bsaParseError && (
              <p className="mt-2 text-xs text-red-600">{bsaParseError}</p>
            )}

            {bsaWarnings.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {bsaWarnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
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
                         focus:outline-none focus:ring-2 focus:ring-kata-primary
                         focus:border-transparent text-gray-900"
              placeholder="Nombre completo del estudiante"
            />
          </Card>

          <Card>
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
                             focus:outline-none focus:ring-2 focus:ring-kata-primary
                             focus:border-transparent text-gray-900"
                />
                {calculatedAge !== null && (
                  <p className="text-xs text-kata-primary mt-1">
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
                             focus:outline-none focus:ring-2 focus:ring-kata-primary
                             focus:border-transparent text-gray-900"
                  placeholder="Ej: Quinto, 4-A"
                />
              </div>
            </div>
          </Card>

          <Card>
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
                             focus:outline-none focus:ring-2 focus:ring-kata-primary
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
                             focus:outline-none focus:ring-2 focus:ring-kata-primary
                             focus:border-transparent text-gray-900"
                  placeholder="NO APLICA"
                />
              </div>
            </div>
          </Card>

          <Card>
            <label htmlFor="classroomTeacher" className="block text-sm font-semibold text-gray-900 mb-1">
              Docente guía
            </label>
            <input
              id="classroomTeacher"
              type="text"
              value={classroomTeacherName}
              onChange={(e) => setClassroomTeacherName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-kata-primary
                         focus:border-transparent text-gray-900"
              placeholder="Nombre del docente guía"
            />
          </Card>

          <Card>
            <p className="block text-sm font-semibold text-gray-900 mb-3">
              Persona encargada
            </p>
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
                             focus:outline-none focus:ring-2 focus:ring-kata-primary
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
                             focus:outline-none focus:ring-2 focus:ring-kata-primary
                             focus:border-transparent text-gray-900"
                  placeholder="8888-8888"
                />
              </div>
            </div>
          </Card>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => router.push('/estudiantes')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              fullWidth
              disabled={saving || !name.trim() || !birthDate || !grade.trim()}
            >
              {saving ? 'Creando…' : 'Crear Estudiante'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
