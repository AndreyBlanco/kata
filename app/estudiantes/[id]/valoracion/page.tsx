// app/estudiantes/[id]/valoracion/page.tsx

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { INSTRUMENTS_CATALOG } from '@/lib/catalogs'

// ─── Collapsible Section Component ───
function Section({
  title,
  hasContent,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  hasContent: boolean
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {hasContent ? (
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0" />
          ) : (
            <span className="w-2.5 h-2.5 border-2 border-gray-300 rounded-full flex-shrink-0" />
          )}
          <h3 className="text-sm font-semibold text-gray-900 text-left">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Textarea helper ───
function SectionTextarea({
  id,
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
}: {
  id: string
  label?: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  rows?: number
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-md
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   focus:border-transparent text-gray-900 text-sm"
        placeholder={placeholder}
      />
    </div>
  )
}

export default function ValoracionIntegralPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  // Student read-only data
  const [studentName, setStudentName] = useState('')
  const [studentGrade, setStudentGrade] = useState('')
  const [centerName, setCenterName] = useState('')
  const [classroomTeacher, setClassroomTeacher] = useState('')
  const [teacherName, setTeacherName] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['datos']))

  // Assessment fields
  const [elaborationDate, setElaborationDate] = useState('')
  const [bsaReceivedDate, setBsaReceivedDate] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [newParticipant, setNewParticipant] = useState('')
  const [classroomContext, setClassroomContext] = useState('')
  const [institutionalContext, setInstitutionalContext] = useState('')
  const [familyContext, setFamilyContext] = useState('')
  const [strengths, setStrengths] = useState('')
  const [barriers, setBarriers] = useState('')
  const [curricularPerformance, setCurricularPerformance] = useState('')
  const [instruments, setInstruments] = useState<string[]>([])
  const [otherInstrument, setOtherInstrument] = useState('')
  const [integralAnalysis, setIntegralAnalysis] = useState('')
  const [requiredSupports, setRequiredSupports] = useState('')
  const [agreements, setAgreements] = useState('')
  const [followUp, setFollowUp] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch student
        const sRes = await fetch(`/api/students/${studentId}`)
        if (!sRes.ok) throw new Error('No encontrado')
        const student = await sRes.json()
        setStudentName(student.name)
        setStudentGrade(student.grade)
        setClassroomTeacher(student.classroomTeacherName || '')
        setCenterName(student.centerName || '')
        setTeacherName(student.teacherName || '')

        // Fetch existing assessment
        const aRes = await fetch(`/api/assessments/${studentId}`)
        if (aRes.ok) {
          const data = await aRes.json()
          if (data && data.id) {
            setElaborationDate(data.elaborationDate?.split('T')[0] || '')
            setBsaReceivedDate(data.bsaReceivedDate?.split('T')[0] || '')
            setParticipants(data.participants || [])
            setClassroomContext(data.classroomContext || '')
            setInstitutionalContext(data.institutionalContext || '')
            setFamilyContext(data.familyContext || '')
            setStrengths(data.strengths || '')
            setBarriers(data.barriers || '')
            setCurricularPerformance(data.curricularPerformance || '')
            setInstruments(data.instruments || [])
            setIntegralAnalysis(data.integralAnalysis || '')
            setRequiredSupports(data.requiredSupports || '')
            setAgreements(data.agreements || '')
            setFollowUp(data.followUp || '')
          }
        }
      } catch {
        router.push('/estudiantes')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [studentId, router])

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleInstrument = (item: string) => {
    setInstruments((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  const addParticipant = () => {
    const trimmed = newParticipant.trim()
    if (trimmed && !participants.includes(trimmed)) {
      setParticipants([...participants, trimmed])
      setNewParticipant('')
    }
  }

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const addOtherInstrument = () => {
    const trimmed = otherInstrument.trim()
    if (trimmed && !instruments.includes(trimmed)) {
      setInstruments([...instruments, trimmed])
      setOtherInstrument('')
    }
  }

  // Section content checks
  const hasContent = (key: string): boolean => {
    switch (key) {
      case 'participants': return participants.length > 0
      case 'context': return !!(classroomContext || institutionalContext || familyContext)
      case 'strengths': return !!strengths.trim()
      case 'barriers': return !!barriers.trim()
      case 'performance': return !!curricularPerformance.trim()
      case 'instruments': return instruments.length > 0
      case 'analysis': return !!integralAnalysis.trim()
      case 'supports': return !!requiredSupports.trim()
      case 'agreements': return !!agreements.trim()
      case 'followUp': return !!followUp.trim()
      default: return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(`/api/assessments/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elaborationDate: elaborationDate || null,
          bsaReceivedDate: bsaReceivedDate || null,
          participants,
          classroomContext,
          institutionalContext,
          familyContext,
          strengths,
          barriers,
          curricularPerformance,
          instruments,
          integralAnalysis,
          requiredSupports,
          agreements,
          followUp,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
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
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push(`/estudiantes/${studentId}`)}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← {studentName}
          </button>
          <h1 className="text-xl font-bold text-gray-900">Valoración Integral</h1>
          <p className="text-sm text-gray-500">Formato 2026 — Documento fuente</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* ── 1. Datos generales (always visible) ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              1. Datos generales
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Estudiante:</span>
                <span className="font-medium">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nivel / Sección:</span>
                <span className="font-medium">{studentGrade}</span>
              </div>
              {centerName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Centro educativo:</span>
                  <span className="font-medium">{centerName}</span>
                </div>
              )}
              {classroomTeacher && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Docente guía:</span>
                  <span className="font-medium">{classroomTeacher}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
              <div>
                <label htmlFor="bsaDate" className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha recibido BSA
                </label>
                <input
                  id="bsaDate"
                  type="date"
                  value={bsaReceivedDate}
                  onChange={(e) => setBsaReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="elabDate" className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha de elaboración
                </label>
                <input
                  id="elabDate"
                  type="date"
                  value={elaborationDate}
                  onChange={(e) => setElaborationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* ── 2. Participantes ── */}
          <Section
            title="2. Personas participantes en la valoración"
            hasContent={hasContent('participants')}
            isOpen={openSections.has('participants')}
            onToggle={() => toggleSection('participants')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Docentes, familia, profesionales de apoyo y otras personas que participaron.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addParticipant() }
                }}
                placeholder="Nombre del participante..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
              />
              <button
                type="button"
                onClick={addParticipant}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md
                           hover:bg-blue-700 transition-colors"
              >
                Agregar
              </button>
            </div>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {participants.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5
                               bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removeParticipant(i)}
                      className="ml-1 text-blue-400 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* ── 3. Contexto educativo ── */}
          <Section
            title="3. Contexto educativo"
            hasContent={hasContent('context')}
            isOpen={openSections.has('context')}
            onToggle={() => toggleSection('context')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Elementos del contexto que influyen en el proceso educativo.
            </p>
            <div className="space-y-4">
              <SectionTextarea
                id="ctxAula"
                label="a) Contexto de aula"
                placeholder="Describir elementos del aula que influyen en el aprendizaje..."
                value={classroomContext}
                onChange={setClassroomContext}
              />
              <SectionTextarea
                id="ctxInst"
                label="b) Contexto institucional"
                placeholder="Recursos, organización y apoyos del centro educativo..."
                value={institutionalContext}
                onChange={setInstitutionalContext}
              />
              <SectionTextarea
                id="ctxFam"
                label="c) Contexto familiar y comunitario"
                placeholder="Dinámica familiar, recursos comunitarios, apoyos externos..."
                value={familyContext}
                onChange={setFamilyContext}
              />
            </div>
          </Section>

          {/* ── 4. Fortalezas ── */}
          <Section
            title="4. Fortalezas, intereses y recursos"
            hasContent={hasContent('strengths')}
            isOpen={openSections.has('strengths')}
            onToggle={() => toggleSection('strengths')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Fortalezas, intereses, estilos de aprendizaje, habilidades adaptativas,
              comunicativas, sociales y emocionales.
            </p>
            <SectionTextarea
              id="strengths"
              placeholder="Ej: Estilo de aprendizaje kinestésico-visual. Es cooperador y sociable. Mantiene conversación fluida..."
              value={strengths}
              onChange={setStrengths}
              rows={5}
            />
            <p className="text-xs text-amber-600 mt-2">
              💡 Estas fortalezas se copiarán como punto de partida al Plan de Apoyo.
            </p>
          </Section>

          {/* ── 5. Barreras ── */}
          <Section
            title="5. Barreras para el aprendizaje y la participación"
            hasContent={hasContent('barriers')}
            isOpen={openSections.has('barriers')}
            onToggle={() => toggleSection('barriers')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Barreras del contexto, currículo, metodología, evaluación u organización.
              Evitar enfoques centrados en el déficit.
            </p>
            <SectionTextarea
              id="barriers"
              placeholder="Identificar barreras presentes en el entorno educativo..."
              value={barriers}
              onChange={setBarriers}
              rows={5}
            />
          </Section>

          {/* ── 6. Desempeño curricular ── */}
          <Section
            title="6. Desempeño según el currículo"
            hasContent={hasContent('performance')}
            isOpen={openSections.has('performance')}
            onToggle={() => toggleSection('performance')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Desempeño con base en el currículo nacional: aprendizajes por lograr,
              avances y necesidades de apoyo por asignatura.
            </p>
            <SectionTextarea
              id="performance"
              placeholder="Español: [aprendizajes, avances, necesidades]&#10;Matemáticas: [aprendizajes, avances, necesidades]&#10;..."
              value={curricularPerformance}
              onChange={setCurricularPerformance}
              rows={8}
            />
          </Section>

          {/* ── 7. Instrumentos ── */}
          <Section
            title="7. Instrumentos y procedimientos"
            hasContent={hasContent('instruments')}
            isOpen={openSections.has('instruments')}
            onToggle={() => toggleSection('instruments')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Instrumentos utilizados en el proceso de valoración.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {INSTRUMENTS_CATALOG.map((inst) => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => toggleInstrument(inst)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    instruments.includes(inst)
                      ? 'bg-green-100 border-green-400 text-green-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
            {/* Otros */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={otherInstrument}
                onChange={(e) => setOtherInstrument(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addOtherInstrument() }
                }}
                placeholder="Otro instrumento..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-gray-900"
              />
              <button
                type="button"
                onClick={addOtherInstrument}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md
                           hover:bg-gray-50 text-gray-700 transition-colors"
              >
                + Otro
              </button>
            </div>
            {/* Custom instruments (non-catalog) shown as removable chips */}
            {instruments.filter((i) => !(INSTRUMENTS_CATALOG as readonly string[]).includes(i)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {instruments
                  .filter((i) => !(INSTRUMENTS_CATALOG as readonly string[]).includes(i))
                  .map((inst) => (
                    <span
                      key={inst}
                      className="inline-flex items-center gap-1 px-3 py-1.5
                                 bg-green-50 border border-green-200 rounded-full text-sm text-green-800"
                    >
                      {inst}
                      <button
                        type="button"
                        onClick={() => toggleInstrument(inst)}
                        className="ml-1 text-green-400 hover:text-green-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </Section>

          {/* ── 8. Análisis integral ── */}
          <Section
            title="8. Análisis integral del proceso educativo"
            hasContent={hasContent('analysis')}
            isOpen={openSections.has('analysis')}
            onToggle={() => toggleSection('analysis')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Análisis conjunto considerando la interacción entre estudiante,
              contexto, prácticas pedagógicas y apoyos.
            </p>
            <SectionTextarea
              id="analysis"
              placeholder="Análisis integral del proceso educativo del estudiante..."
              value={integralAnalysis}
              onChange={setIntegralAnalysis}
              rows={5}
            />
          </Section>

          {/* ── 9. Apoyos requeridos ── */}
          <Section
            title="9. Apoyos educativos requeridos"
            hasContent={hasContent('supports')}
            isOpen={openSections.has('supports')}
            onToggle={() => toggleSection('supports')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Apoyos personales, curriculares, organizativos, metodológicos,
              evaluativos y materiales/tecnológicos necesarios.
            </p>
            <SectionTextarea
              id="supports"
              placeholder="Ej: Tiempo extra para trabajos. Explicación verbal y escrita. Refuerzo en conciencia fonológica..."
              value={requiredSupports}
              onChange={setRequiredSupports}
              rows={5}
            />
            <p className="text-xs text-amber-600 mt-2">
              💡 Estos apoyos informarán las estrategias del Plan de Apoyo.
            </p>
          </Section>

          {/* ── 10. Acuerdos ── */}
          <Section
            title="10. Acuerdos y recomendaciones"
            hasContent={hasContent('agreements')}
            isOpen={openSections.has('agreements')}
            onToggle={() => toggleSection('agreements')}
          >
            <SectionTextarea
              id="agreements"
              placeholder="Acuerdos construidos de manera colaborativa para mejorar el proceso educativo..."
              value={agreements}
              onChange={setAgreements}
            />
          </Section>

          {/* ── 11. Seguimiento ── */}
          <Section
            title="11. Seguimiento y revisión"
            hasContent={hasContent('followUp')}
            isOpen={openSections.has('followUp')}
            onToggle={() => toggleSection('followUp')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Periodicidad de revisión, personas responsables y ajustes previstos.
            </p>
            <SectionTextarea
              id="followUp"
              placeholder="Periodicidad de revisión y personas responsables..."
              value={followUp}
              onChange={setFollowUp}
            />
          </Section>

          {/* Messages */}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {saved && (
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Valoración integral guardada correctamente
            </p>
          )}

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                       font-medium hover:bg-blue-700 transition-colors
                       disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Valoración Integral'}
          </button>
        </form>
      </div>
    </div>
  )
}