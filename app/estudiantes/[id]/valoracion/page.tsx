// app/estudiantes/[id]/valoracion/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { INSTRUMENTS_CATALOG } from '@/lib/catalogs'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AssessmentStatus = 'active' | 'completed'

type ParticipantRoleItem = {
  code: string; label: string; category: string; isCore: boolean
}

type CatalogItem = {
  code: string; label: string; isCore?: boolean
}

type CurricularRow = {
  id?: string
  subject: string
  goalsToAchieve: string
  progress: string
  supportNeeds: string
  sortOrder: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PARTICIPANT_CATEGORY_LABELS: Record<string, string> = {
  docente:        'Docentes',
  servicio_apoyo: 'Servicios de Apoyo',
  institucional:  'Personal Institucional',
  familia:        'Familia',
  estudiante:     'Persona Estudiante',
  salud_apoyo:    'Salud y Apoyo Externo',
  otro:           'Otros',
}

const STRENGTH_CATEGORY_LABELS: Record<string, string> = {
  academica:        'Académicas',
  cognitiva:        'Cognitivas',
  socioemocional:   'Socioemocionales',
  interes:          'Intereses',
  recurso_familia:  'Recursos Familiares',
  recurso_escolar:  'Recursos Escolares',
}

const BARRIER_CATEGORY_LABELS: Record<string, string> = {
  contexto_aula:          'Contexto del aula',
  contexto_institucional: 'Contexto institucional',
  contexto_familiar:      'Contexto familiar',
  curriculo:              'Currículo',
  metodologia:            'Metodología',
  evaluacion:             'Evaluación',
  organizacion:           'Organización',
  actitudinal:            'Actitudinal',
}

const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  personal:            'Apoyos personales (docente de apoyo)',
  curricular:          'Adaptaciones curriculares',
  metodologico:        'Apoyos metodológicos',
  evaluativo:          'Apoyos evaluativos',
  organizativo:        'Apoyos organizativos',
  material_tecnologico:'Material y tecnología',
}

const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
  periodicidad: 'Periodicidad',
  modalidad:    'Modalidad de seguimiento',
  responsable:  'Personas responsables',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title, hasContent, isOpen, onToggle, children,
}: {
  title: string; hasContent: boolean; isOpen: boolean
  onToggle: () => void; children: React.ReactNode
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
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
          ) : (
            <span className="w-2.5 h-2.5 border-2 border-gray-300 rounded-full shrink-0" />
          )}
          <h3 className="text-sm font-semibold text-gray-900 text-left">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>
      )}
    </div>
  )
}

function SectionTextarea({
  id, label, placeholder, value, onChange, rows = 4,
}: {
  id: string; label?: string; placeholder: string
  value: string; onChange: (v: string) => void; rows?: number
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
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
        placeholder={placeholder}
      />
    </div>
  )
}

function ConfirmModal({
  open, title, body, confirmLabel, confirmClass, onConfirm, onCancel, loading,
}: {
  open: boolean; title: string; body: string; confirmLabel: string
  confirmClass?: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-5">{body}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors
                        disabled:opacity-50 ${confirmClass ?? 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CatalogCheckboxGroup — reutilizable en secciones 4, 5, 9, 11
// ─────────────────────────────────────────────────────────────────────────────

function CatalogCheckboxGroup({
  items, categoryLabels, selectedCodes, onToggle, colorClass = 'indigo',
}: {
  items: Record<string, CatalogItem[]>
  categoryLabels: Record<string, string>
  selectedCodes: string[]
  onToggle: (code: string) => void
  colorClass?: 'indigo' | 'violet' | 'sky' | 'teal'
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 border-indigo-400 text-indigo-800',
    violet: 'bg-violet-100 border-violet-400 text-violet-800',
    sky:    'bg-sky-100    border-sky-400    text-sky-800',
    teal:   'bg-teal-100   border-teal-400   text-teal-800',
  }
  const selected = colors[colorClass]

  return (
    <div className="space-y-3 mb-4">
      {Object.entries(items).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {categoryLabels[cat] ?? cat}
          </p>
          <div className="flex flex-wrap gap-2">
            {catItems.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onToggle(item.code)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedCodes.includes(item.code)
                    ? selected
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SubjectCard — editor de una fila de la tabla curricular (Sección 6)
// ─────────────────────────────────────────────────────────────────────────────

function SubjectCard({
  row, index, onChange, onDelete,
}: {
  row: CurricularRow
  index: number
  onChange: (idx: number, field: keyof CurricularRow, value: string) => void
  onDelete: (idx: number) => void
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
      {/* Header: subject input + delete */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={row.subject}
          onChange={(e) => onChange(index, 'subject', e.target.value)}
          placeholder="Asignatura (ej: Español, Matemáticas...)"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        />
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
          title="Eliminar asignatura"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Three columns as stacked fields */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Aprendizajes por lograr
        </label>
        <textarea
          value={row.goalsToAchieve}
          onChange={(e) => onChange(index, 'goalsToAchieve', e.target.value)}
          rows={2}
          placeholder="Indicadores o aprendizajes que el estudiante debe lograr este periodo..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Avances
        </label>
        <textarea
          value={row.progress}
          onChange={(e) => onChange(index, 'progress', e.target.value)}
          rows={2}
          placeholder="Logros y avances observados hasta el momento..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Necesidades de apoyo
        </label>
        <textarea
          value={row.supportNeeds}
          onChange={(e) => onChange(index, 'supportNeeds', e.target.value)}
          rows={2}
          placeholder="Apoyos específicos que requiere en esta asignatura..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ValoracionIntegralPage() {
  const router  = useRouter()
  const params  = useParams()
  const studentId = params.id as string

  // ── Student read-only ──────────────────────────────────────────────────────
  const [studentName, setStudentName]         = useState('')
  const [studentGrade, setStudentGrade]       = useState('')
  const [centerName, setCenterName]           = useState('')
  const [classroomTeacher, setClassroomTeacher] = useState('')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  const [saved, setSaved]                   = useState(false)
  const [isDirty, setIsDirty]               = useState(false)
  const [openSections, setOpenSections]     = useState<Set<string>>(new Set(['datos']))
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [finalizing, setFinalizing]         = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)

  // ── Catalog state ─────────────────────────────────────────────────────────
  const [participantRoles, setParticipantRoles] = useState<Record<string, ParticipantRoleItem[]>>({})
  const [strengthCatalog,  setStrengthCatalog]  = useState<Record<string, CatalogItem[]>>({})
  const [barrierCatalog,   setBarrierCatalog]   = useState<Record<string, CatalogItem[]>>({})
  const [supportCatalog,   setSupportCatalog]   = useState<Record<string, CatalogItem[]>>({})
  const [followupCatalog,  setFollowupCatalog]  = useState<Record<string, CatalogItem[]>>({})

  // ── Assessment status ─────────────────────────────────────────────────────
  const [assessmentStatus, setAssessmentStatus]     = useState<AssessmentStatus>('active')
  const [requiresSupport, setRequiresSupport]       = useState<boolean | null>(null)
  const [completedAt, setCompletedAt]               = useState<string>('')   // ISO string para mostrar fecha

  // ── Curricular table (section 6, separate API) ────────────────────────────
  const [curricularSubjects,  setCurricularSubjects]  = useState<CurricularRow[]>([])
  const [curricularDirty,     setCurricularDirty]     = useState(false)
  const [savingCurricular,    setSavingCurricular]    = useState(false)
  const [curricularSaved,     setCurricularSaved]     = useState(false)
  const [curricularError,     setCurricularError]     = useState('')

  // ── Assessment content fields ─────────────────────────────────────────────
  const [elaborationDate, setElaborationDate]       = useState('')
  const [bsaReceivedDate, setBsaReceivedDate]       = useState('')
  const [participants, setParticipants]             = useState<string[]>([])
  const [newParticipant, setNewParticipant]         = useState('')
  const [classroomContext, setClassroomContext]     = useState('')
  const [institutionalContext, setInstitutionalContext] = useState('')
  const [familyContext, setFamilyContext]           = useState('')
  const [strengths, setStrengths]                   = useState('')
  const [strengthCodes, setStrengthCodes]           = useState<string[]>([])
  const [barriers, setBarriers]                     = useState('')
  const [barrierCodes, setBarrierCodes]             = useState<string[]>([])
  const [instruments, setInstruments]               = useState<string[]>([])
  const [otherInstrument, setOtherInstrument]       = useState('')
  const [integralAnalysis, setIntegralAnalysis]     = useState('')
  const [requiredSupports, setRequiredSupports]     = useState('')
  const [supportCodes, setSupportCodes]             = useState<string[]>([])
  const [agreements, setAgreements]                 = useState('')
  const [followUp, setFollowUp]                     = useState('')
  const [followupCodes, setFollowupCodes]           = useState<string[]>([])

  // ── Mark dirty on any content change ──────────────────────────────────────
  const mark = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value)
      setIsDirty(true)
    }, [])

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [sRes, aRes, rolesRes, strengthRes, barrierRes, supportRes, followupRes, curricularRes] =
          await Promise.all([
            fetch(`/api/students/${studentId}`),
            fetch(`/api/assessments/${studentId}`),
            fetch('/api/catalogs/participant-roles?grouped=true'),
            fetch('/api/catalogs/strength-items?grouped=true'),
            fetch('/api/catalogs/barriers?grouped=true'),
            fetch('/api/catalogs/support-items?grouped=true'),
            fetch('/api/catalogs/followup-schedules?grouped=true'),
            fetch(`/api/assessments/${studentId}/curricular-subjects`),
          ])

        if (!sRes.ok) throw new Error('Estudiante no encontrado')
        const student = await sRes.json()
        setStudentName(student.name)
        setStudentGrade(student.grade)
        setClassroomTeacher(student.classroomTeacherName || '')
        setCenterName(student.centerName || student.teacher?.centerName || '')

        if (rolesRes.ok)      setParticipantRoles(await rolesRes.json())
        if (strengthRes.ok)   setStrengthCatalog(await strengthRes.json())
        if (barrierRes.ok)    setBarrierCatalog(await barrierRes.json())
        if (supportRes.ok)    setSupportCatalog(await supportRes.json())
        if (followupRes.ok)   setFollowupCatalog(await followupRes.json())
        if (curricularRes.ok) setCurricularSubjects(await curricularRes.json())

        if (aRes.ok) {
          const data = await aRes.json()
          if (data?.id) {
            setAssessmentStatus(data.status ?? 'active')
            setRequiresSupport(data.requiresSupport ?? null)
            setCompletedAt(data.updatedAt || '')
            setElaborationDate(data.elaborationDate?.split('T')[0] || '')
            setBsaReceivedDate(data.bsaReceivedDate?.split('T')[0] || '')
            setParticipants(data.participants || [])
            setClassroomContext(data.classroomContext || '')
            setInstitutionalContext(data.institutionalContext || '')
            setFamilyContext(data.familyContext || '')
            setStrengths(data.strengths || '')
            setStrengthCodes(data.strengthCodes || [])
            setBarriers(data.barriers || '')
            setBarrierCodes(data.barrierCodes || [])
            setInstruments(data.instruments || [])
            setIntegralAnalysis(data.integralAnalysis || '')
            setRequiredSupports(data.requiredSupports || '')
            setSupportCodes(data.supportCodes || [])
            setAgreements(data.agreements || '')
            setFollowUp(data.followUp || '')
            setFollowupCodes(data.followupCodes || [])
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key) else next.add(key)
      return next
    })
  }, [])

  const hasContent = (key: string): boolean => {
    switch (key) {
      case 'datos':        return !!(elaborationDate || bsaReceivedDate)
      case 'participants': return participants.length > 0
      case 'context':      return !!(classroomContext || institutionalContext || familyContext)
      case 'strengths':    return !!(strengths.trim() || strengthCodes.length)
      case 'barriers':     return !!(barriers.trim() || barrierCodes.length)
      case 'performance':  return curricularSubjects.length > 0
      case 'instruments':  return instruments.length > 0
      case 'analysis':     return !!integralAnalysis.trim()
      case 'supports':     return !!(requiredSupports.trim() || supportCodes.length)
      case 'agreements':   return !!agreements.trim()
      case 'followUp':     return !!(followUp.trim() || followupCodes.length)
      default:             return false
    }
  }

  const sectionsComplete = [
    'datos','participants','context','strengths','barriers',
    'performance','instruments','analysis','supports','agreements','followUp',
  ].filter(hasContent).length

  // ── Curricular table handlers ─────────────────────────────────────────────
  const addCurricularRow = () => {
    setCurricularSubjects((prev) => [
      ...prev,
      { subject: '', goalsToAchieve: '', progress: '', supportNeeds: '', sortOrder: prev.length },
    ])
    setCurricularDirty(true)
  }

  const updateCurricularRow = (idx: number, field: keyof CurricularRow, value: string) => {
    setCurricularSubjects((prev) =>
      prev.map((row, i) => i === idx ? { ...row, [field]: value } : row)
    )
    setCurricularDirty(true)
  }

  const deleteCurricularRow = (idx: number) => {
    setCurricularSubjects((prev) => prev.filter((_, i) => i !== idx))
    setCurricularDirty(true)
  }

  const saveCurricularSubjects = async () => {
    setSavingCurricular(true)
    setCurricularError('')
    setCurricularSaved(false)
    try {
      const payload = curricularSubjects
        .filter((r) => r.subject.trim())
        .map((r, i) => ({ ...r, sortOrder: i }))

      const res = await fetch(`/api/assessments/${studentId}/curricular-subjects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      setCurricularSubjects(saved)
      setCurricularDirty(false)
      setCurricularSaved(true)
      setTimeout(() => setCurricularSaved(false), 3000)
    } catch {
      setCurricularError('Error al guardar la tabla curricular')
    } finally {
      setSavingCurricular(false)
    }
  }

  // ── Generic catalog code toggle ───────────────────────────────────────────
  const makeCodeToggler = (
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => (code: string) => {
    setter((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
    setIsDirty(true)
  }

  const toggleStrengthCode  = makeCodeToggler(setStrengthCodes)
  const toggleBarrierCode   = makeCodeToggler(setBarrierCodes)
  const toggleSupportCode   = makeCodeToggler(setSupportCodes)
  const toggleFollowupCode  = makeCodeToggler(setFollowupCodes)

  // ── Participant toggle (catalog) ──────────────────────────────────────────
  const toggleParticipantRole = (label: string) => {
    setParticipants((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
    )
    setIsDirty(true)
  }

  const addCustomParticipant = () => {
    const trimmed = newParticipant.trim()
    if (trimmed && !participants.includes(trimmed)) {
      setParticipants((prev) => [...prev, trimmed])
      setNewParticipant('')
      setIsDirty(true)
    }
  }

  const removeParticipant = (label: string) => {
    setParticipants((prev) => prev.filter((p) => p !== label))
    setIsDirty(true)
  }

  // ── Instrument toggle ─────────────────────────────────────────────────────
  const toggleInstrument = (item: string) => {
    setInstruments((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
    setIsDirty(true)
  }

  const addOtherInstrument = () => {
    const trimmed = otherInstrument.trim()
    if (trimmed && !instruments.includes(trimmed)) {
      setInstruments((prev) => [...prev, trimmed])
      setOtherInstrument('')
      setIsDirty(true)
    }
  }

  // ── Save content ──────────────────────────────────────────────────────────
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(`/api/assessments/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elaborationDate:     elaborationDate || null,
          bsaReceivedDate:     bsaReceivedDate || null,
          participants,
          classroomContext,
          institutionalContext,
          familyContext,
          strengths,
          strengthCodes,
          barriers,
          barrierCodes,
          instruments,
          integralAnalysis,
          requiredSupports,
          supportCodes,
          agreements,
          followUp,
          followupCodes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
        return
      }

      setSaved(true)
      setIsDirty(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ── Finalize assessment ───────────────────────────────────────────────────
  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      // Save pending changes first
      if (isDirty) await handleSave()

      const res = await fetch(`/api/assessments/${studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAssessmentStatus('completed')
      setCompletedAt(data.updatedAt || new Date().toISOString())
      setShowFinalizeModal(false)
    } catch {
      setError('Error al finalizar la valoración')
    } finally {
      setFinalizing(false)
    }
  }

  // ── Reopen assessment ─────────────────────────────────────────────────────
  const handleReopen = async () => {
    try {
      const res = await fetch(`/api/assessments/${studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) throw new Error()
      setAssessmentStatus('active')
    } catch {
      setError('Error al reabrir el expediente')
    }
  }

  // ── Support decision ──────────────────────────────────────────────────────
  const handleSupportDecision = async (decision: boolean) => {
    if (decision) {
      setGeneratingPlan(true)
      try {
        await fetch(`/api/assessments/${studentId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requiresSupport: true }),
        })
        await fetch(`/api/support-plans/${studentId}/generate`, { method: 'POST' })
        router.push(`/estudiantes/${studentId}/plan`)
      } catch {
        setError('Error al generar el Plan de Apoyo')
        setGeneratingPlan(false)
      }
    } else {
      await fetch(`/api/assessments/${studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiresSupport: false }),
      })
      setRequiresSupport(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Cargando...</p>
      </div>
    )
  }

  const isCompleted = assessmentStatus === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Finalize modal ── */}
      <ConfirmModal
        open={showFinalizeModal}
        title="Finalizar valoración"
        body="¿Confirma que la valoración está lista para generar el informe oficial? Puede reabrir el expediente y hacer correcciones en cualquier momento."
        confirmLabel="Sí, finalizar"
        confirmClass="bg-green-600 hover:bg-green-700"
        onConfirm={handleFinalize}
        onCancel={() => setShowFinalizeModal(false)}
        loading={finalizing}
      />

      {/* ── Header ── */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push(`/estudiantes/${studentId}`)}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← {studentName}
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Valoración Integral</h1>
              <p className="text-xs text-gray-500 mt-0.5">Formato 2026 — {sectionsComplete}/11 secciones con contenido</p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Completada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  En proceso
                </span>
              )}

              {!isCompleted && (
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium
                             rounded-lg hover:bg-green-700 transition-colors"
                >
                  Finalizar valoración
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Post-completion panel ── */}
      {isCompleted && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
            {/* Date + download */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-green-800">
                  ✓ Valoración finalizada
                </p>
                {completedAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {new Date(completedAt).toLocaleDateString('es-CR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <a
                href={`/api/assessments/${studentId}/export`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white
                           text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Informe .docx
              </a>
            </div>

            {/* Support decision */}
            <div className="border-t border-green-200 pt-3">
              <p className="text-sm font-medium text-gray-800 mb-3">
                ¿El estudiante requiere ingreso al sistema de apoyo educativo?
              </p>

              {requiresSupport === null && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleSupportDecision(true)}
                    disabled={generatingPlan}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                               hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {generatingPlan ? 'Generando...' : 'Sí, generar Plan de Apoyo'}
                  </button>
                  <button
                    onClick={() => handleSupportDecision(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm
                               font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    No, archivar
                  </button>
                </div>
              )}

              {requiresSupport === true && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-blue-700 font-medium">
                    ✓ Plan de Apoyo activo
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/estudiantes/${studentId}/plan`)}
                      className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300
                                 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Ver Plan de Apoyo
                    </button>
                    <button
                      onClick={() => handleSupportDecision(false)}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cambiar decisión
                    </button>
                  </div>
                </div>
              )}

              {requiresSupport === false && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-gray-600">
                    Archivado — no requiere apoyo adicional
                  </span>
                  <button
                    onClick={() => setRequiresSupport(null)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cambiar decisión
                  </button>
                </div>
              )}
            </div>

            {/* Reopen link */}
            <div className="border-t border-green-200 pt-2">
              <button
                onClick={handleReopen}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                Reabrir expediente para editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSave} className="space-y-3">

          {/* ── 1. Datos generales ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-3">
              {hasContent('datos') ? (
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
              ) : (
                <span className="w-2.5 h-2.5 border-2 border-gray-300 rounded-full shrink-0" />
              )}
              <h3 className="text-sm font-semibold text-gray-900">1. Datos generales</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div>
                <label htmlFor="bsaDate" className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha recibido BSA
                </label>
                <input
                  id="bsaDate" type="date" value={bsaReceivedDate}
                  onChange={(e) => { setBsaReceivedDate(e.target.value); setIsDirty(true) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="elabDate" className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha de elaboración
                </label>
                <input
                  id="elabDate" type="date" value={elaborationDate}
                  onChange={(e) => { setElaborationDate(e.target.value); setIsDirty(true) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* ── 2. Participantes (catalog) ── */}
          <Section
            title="2. Personas participantes en la valoración"
            hasContent={hasContent('participants')}
            isOpen={openSections.has('participants')}
            onToggle={() => toggleSection('participants')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Seleccione los roles que participaron. Puede agregar personas adicionales con nombre específico.
            </p>

            {/* Catalog checkboxes grouped by category */}
            {Object.entries(participantRoles).map(([cat, roles]) => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {PARTICIPANT_CATEGORY_LABELS[cat] ?? cat}
                </p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const selected = participants.includes(role.label)
                    return (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => toggleParticipantRole(role.label)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selected
                            ? 'bg-blue-100 border-blue-400 text-blue-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {role.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Custom participant input */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomParticipant() } }}
                placeholder="Nombre de otro participante..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <button
                type="button"
                onClick={addCustomParticipant}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md
                           hover:bg-gray-50 text-gray-700 transition-colors"
              >
                + Agregar
              </button>
            </div>

            {/* Selected chips */}
            {participants.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Participantes seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-3 py-1.5
                                 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p)}
                        className="ml-1 text-blue-400 hover:text-blue-600 text-base leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
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
                id="ctxAula" label="a) Contexto de aula"
                placeholder="Describir elementos del aula que influyen en el aprendizaje..."
                value={classroomContext}
                onChange={mark(setClassroomContext)}
              />
              <SectionTextarea
                id="ctxInst" label="b) Contexto institucional"
                placeholder="Recursos, organización y apoyos del centro educativo..."
                value={institutionalContext}
                onChange={mark(setInstitutionalContext)}
              />
              <SectionTextarea
                id="ctxFam" label="c) Contexto familiar y comunitario"
                placeholder="Dinámica familiar, recursos comunitarios, apoyos externos..."
                value={familyContext}
                onChange={mark(setFamilyContext)}
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
              Seleccione las fortalezas identificadas y complemente con una descripción narrativa.
            </p>

            {Object.keys(strengthCatalog).length > 0 && (
              <CatalogCheckboxGroup
                items={strengthCatalog}
                categoryLabels={STRENGTH_CATEGORY_LABELS}
                selectedCodes={strengthCodes}
                onToggle={toggleStrengthCode}
                colorClass="indigo"
              />
            )}

            <SectionTextarea
              id="strengths"
              label="Descripción narrativa (opcional)"
              placeholder="Ej: Estilo de aprendizaje kinestésico-visual. Es cooperador y sociable. Mantiene conversación fluida..."
              value={strengths}
              onChange={mark(setStrengths)}
              rows={4}
            />
            <p className="text-xs text-amber-600 mt-2">
              Las fortalezas seleccionadas se usarán como punto de partida en el Plan de Apoyo.
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
              Seleccione las barreras identificadas en el contexto. Evitar enfoques centrados en el déficit.
            </p>

            {Object.keys(barrierCatalog).length > 0 && (
              <CatalogCheckboxGroup
                items={barrierCatalog}
                categoryLabels={BARRIER_CATEGORY_LABELS}
                selectedCodes={barrierCodes}
                onToggle={toggleBarrierCode}
                colorClass="violet"
              />
            )}

            <SectionTextarea
              id="barriers"
              label="Descripción narrativa (opcional)"
              placeholder="Ampliar el contexto de las barreras identificadas..."
              value={barriers}
              onChange={mark(setBarriers)}
              rows={4}
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
              Registre el desempeño por asignatura: aprendizajes por lograr, avances
              y necesidades de apoyo. Conforme el periodo avanza puede actualizar esta tabla.
            </p>

            {/* Subject cards */}
            <div className="space-y-3 mb-3">
              {curricularSubjects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                  Sin asignaturas registradas. Use el botón para agregar.
                </p>
              )}
              {curricularSubjects.map((row, idx) => (
                <SubjectCard
                  key={row.id ?? idx}
                  row={row}
                  index={idx}
                  onChange={updateCurricularRow}
                  onDelete={deleteCurricularRow}
                />
              ))}
            </div>

            {/* Add row */}
            <button
              type="button"
              onClick={addCurricularRow}
              className="w-full py-2 border border-dashed border-gray-300 rounded-lg
                         text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600
                         transition-colors flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar asignatura
            </button>

            {/* Feedback */}
            {curricularError && (
              <p className="text-xs text-red-600 mb-2">{curricularError}</p>
            )}
            {curricularSaved && (
              <p className="text-xs text-green-600 mb-2">✓ Tabla curricular guardada</p>
            )}

            {/* Save button (only when there are rows or dirty) */}
            {(curricularSubjects.length > 0 || curricularDirty) && (
              <button
                type="button"
                onClick={saveCurricularSubjects}
                disabled={savingCurricular || !curricularDirty}
                className={`w-full py-2 px-4 text-sm font-medium rounded-md transition-colors
                           flex items-center justify-center gap-2
                           ${curricularDirty
                             ? 'bg-blue-600 text-white hover:bg-blue-700'
                             : 'bg-gray-100 text-gray-400 cursor-default'
                           }
                           disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {curricularDirty && !savingCurricular && (
                  <span className="w-2 h-2 bg-amber-400 rounded-full" />
                )}
                {savingCurricular ? 'Guardando...' : curricularDirty ? 'Guardar tabla curricular' : 'Tabla guardada'}
              </button>
            )}
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
                  key={inst} type="button"
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
            <div className="flex gap-2">
              <input
                type="text" value={otherInstrument}
                onChange={(e) => setOtherInstrument(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOtherInstrument() } }}
                placeholder="Otro instrumento..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <button
                type="button" onClick={addOtherInstrument}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md
                           hover:bg-gray-50 text-gray-700 transition-colors"
              >
                + Otro
              </button>
            </div>
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
                      <button type="button" onClick={() => toggleInstrument(inst)}
                        className="ml-1 text-green-400 hover:text-green-600">×</button>
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
              onChange={mark(setIntegralAnalysis)}
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
              Seleccione los apoyos necesarios. Fuente: Líneas de Acción MEP 2023.
            </p>

            {Object.keys(supportCatalog).length > 0 && (
              <CatalogCheckboxGroup
                items={supportCatalog}
                categoryLabels={SUPPORT_CATEGORY_LABELS}
                selectedCodes={supportCodes}
                onToggle={toggleSupportCode}
                colorClass="sky"
              />
            )}

            <SectionTextarea
              id="supports"
              label="Aclaraciones o apoyos adicionales (opcional)"
              placeholder="Especificar frecuencia, condiciones o apoyos no listados..."
              value={requiredSupports}
              onChange={mark(setRequiredSupports)}
              rows={3}
            />
            <p className="text-xs text-amber-600 mt-2">
              Los apoyos seleccionados informarán las estrategias del Plan de Apoyo.
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
              onChange={mark(setAgreements)}
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

            {Object.keys(followupCatalog).length > 0 && (
              <CatalogCheckboxGroup
                items={followupCatalog}
                categoryLabels={FOLLOWUP_TYPE_LABELS}
                selectedCodes={followupCodes}
                onToggle={toggleFollowupCode}
                colorClass="teal"
              />
            )}

            <SectionTextarea
              id="followUp"
              label="Observaciones adicionales de seguimiento (opcional)"
              placeholder="Ajustes previstos, condiciones especiales de revisión..."
              value={followUp}
              onChange={mark(setFollowUp)}
              rows={3}
            />
          </Section>

          {/* ── Feedback ── */}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {saved && (
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Valoración guardada
            </p>
          )}

          {/* ── Save button ── */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                       font-medium hover:bg-blue-700 transition-colors
                       disabled:bg-blue-300 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isDirty && !saving && (
              <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0" />
            )}
            {saving ? 'Guardando...' : isDirty ? 'Guardar cambios' : 'Guardar Valoración Integral'}
          </button>
        </form>
      </div>
    </div>
  )
}
