// app/estudiantes/[id]/plan/page.tsx

// app/estudiantes/[id]/plan/page.tsx (CONTINUACIÓN — archivo completo)

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  DIFFICULTIES_CATALOG,
  PROCESSES_CATALOG,
  EXECUTIVE_FUNCTIONS_SUBPROCESSES,
} from '@/lib/catalogs'

export default function PlanDeApoyoPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [planExists, setPlanExists] = useState(false)

  // Plan fields
  const [elaborationDate, setElaborationDate] = useState('')
  const [activeDifficulties, setActiveDifficulties] = useState<string[]>([])
  const [priorityProcesses, setPriorityProcesses] = useState<string[]>([])
  const [executiveSubprocesses, setExecutiveSubprocesses] = useState<string[]>([])
  const [strengths, setStrengths] = useState('')
  const [mediationStrategies, setMediationStrategies] = useState('')
  const [homeStrategies, setHomeStrategies] = useState('')
  const [specificStrategies, setSpecificStrategies] = useState('')

  // UI state
  const [strengthsSource, setStrengthsSource] = useState<'plan' | 'assessment' | null>(null)
  const [hasAssessment, setHasAssessment] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [draftMeta, setDraftMeta] = useState<{
    difficultiesFound: number
    failedObjectivesCount: number
    barrierCodesUsed: number
    supportCodesUsed: number
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const studentRes = await fetch(`/api/students/${studentId}`)
        if (!studentRes.ok) throw new Error('No encontrado')
        const studentData = await studentRes.json()
        setStudentName(studentData.name)

        // Check if assessment exists
        const assessmentRes = await fetch(`/api/assessments/${studentId}`)
        if (assessmentRes.ok) {
          const assessmentData = await assessmentRes.json()
          if (assessmentData && assessmentData.id) {
            setHasAssessment(true)
          }
        }

        // Fetch existing plan
        const planRes = await fetch(`/api/support-plans/${studentId}`)
        if (planRes.ok) {
          const planData = await planRes.json()
          if (planData && planData.id) {
            setPlanExists(true)
            setElaborationDate(planData.elaborationDate?.split('T')[0] || '')
            setActiveDifficulties(planData.activeDifficulties || [])

            const allProcs: string[] = planData.priorityProcesses || []
            const mainProcs = allProcs.filter((p: string) =>
              (PROCESSES_CATALOG as readonly string[]).includes(p)
            )
            setPriorityProcesses(mainProcs)
            setExecutiveSubprocesses(planData.executiveSubprocesses || [])

            setStrengths(planData.strengths || '')
            setMediationStrategies(planData.mediationStrategies || '')
            setHomeStrategies(planData.homeStrategies || '')
            setSpecificStrategies(planData.specificStrategies || '')

            if (planData._strengthsSource === 'assessment') {
              setStrengthsSource('assessment')
            } else {
              setStrengthsSource('plan')
            }
          } else if (planData && planData._strengthsSource === 'assessment') {
            setStrengths(planData.strengths || '')
            setStrengthsSource('assessment')
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

  const toggleItem = (
    item: string,
    list: string[],
    setter: (val: string[]) => void
  ) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item))
    } else {
      setter([...list, item])
    }
  }

  const toggleProcess = (proc: string) => {
    if (priorityProcesses.includes(proc)) {
      setPriorityProcesses(priorityProcesses.filter((p) => p !== proc))
      if (proc === 'Funciones ejecutivas') {
        setExecutiveSubprocesses([])
      }
    } else {
      setPriorityProcesses([...priorityProcesses, proc])
    }
  }

  const showExecutiveSubs = priorityProcesses.includes('Funciones ejecutivas')

  const handleGenerate = async () => {
    setGenerateError('')
    setGenerating(true)
    try {
      const res = await fetch(`/api/support-plans/${studentId}/generate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setGenerateError(data.error || 'Error al generar el borrador')
        return
      }
      const draft = await res.json()

      // Pre-marcar automáticamente todos los campos
      setActiveDifficulties(draft.activeDifficulties ?? [])

      const mainProcs = (draft.priorityProcesses ?? []).filter((p: string) =>
        (PROCESSES_CATALOG as readonly string[]).includes(p)
      )
      setPriorityProcesses(mainProcs)
      setExecutiveSubprocesses(draft.executiveSubprocesses ?? [])

      setStrengths(draft.strengths ?? '')
      setMediationStrategies(draft.mediationStrategies ?? '')
      setHomeStrategies(draft.homeStrategies ?? '')
      setSpecificStrategies(draft.specificStrategies ?? '')

      setStrengthsSource('assessment')
      setDraftMeta(draft._meta ?? null)
    } catch {
      setGenerateError('Error de conexión al generar el borrador')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/support-plans/${studentId}/export`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al exportar')
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `plan_apoyo_${studentName.replace(/\s+/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error de conexión al exportar')
    } finally {
      setExporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(`/api/support-plans/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elaborationDate: elaborationDate || null,
          activeDifficulties,
          priorityProcesses,
          executiveSubprocesses,
          strengths,
          mediationStrategies,
          homeStrategies,
          specificStrategies,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
        return
      }

      setSaved(true)
      setPlanExists(true)
      setStrengthsSource('plan')
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
          <h1 className="text-xl font-bold text-gray-900">Plan de Apoyo</h1>
          <p className="text-sm text-gray-500">
            Servicio de Apoyo Educativo Fijo en el Aprendizaje
          </p>
        </div>
      </div>

      {/* Assessment hint / generate button */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {!hasAssessment ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Sugerencia:</strong> Completar primero la{' '}
              <button
                onClick={() => router.push(`/estudiantes/${studentId}/valoracion`)}
                className="text-amber-900 underline hover:no-underline font-medium"
              >
                Valoración Integral
              </button>{' '}
              para generar el borrador automáticamente.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  Generar borrador desde Valoración Integral
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Pre-marca dificultades y procesos, y sugiere estrategias basadas en los
                  resultados de las herramientas diagnósticas, fortalezas y barreras identificadas.
                </p>
                {draftMeta && (
                  <p className="text-xs text-blue-600 mt-1">
                    Última generación: {draftMeta.difficultiesFound} dificultad(es) ·{' '}
                    {draftMeta.failedObjectivesCount} objetivo(s) por desarrollar ·{' '}
                    {draftMeta.barrierCodesUsed} barrera(s) · {draftMeta.supportCodesUsed} apoyo(s)
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-md
                           font-medium hover:bg-blue-700 transition-colors
                           disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {generating ? 'Generando...' : 'Generar borrador'}
              </button>
            </div>
            {generateError && (
              <p className="text-xs text-red-600 mt-2">{generateError}</p>
            )}
          </div>
        )}

        {/* Banner post-generación */}
        {draftMeta && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-green-600 text-sm font-bold shrink-0">✓</span>
            <p className="text-sm text-green-800">
              Borrador generado. Revisa y edita libremente cada sección antes de guardar.
              Los campos marcados con <span className="font-semibold">VI</span> fueron
              pre-llenados desde la Valoración Integral.
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Fecha de elaboración ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label htmlFor="planDate" className="block text-sm font-semibold text-gray-900 mb-1">
              Fecha de elaboración
            </label>
            <input
              id="planDate"
              type="date"
              value={elaborationDate}
              onChange={(e) => setElaborationDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900"
            />
          </div>

          {/* ── Procesos Implicados ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-900">
                Procesos Implicados en el Aprendizaje
              </label>
              {draftMeta && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  VI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona los procesos que aplican al estudiante
            </p>
            <div className="flex flex-wrap gap-2">
              {PROCESSES_CATALOG.map((proc) => (
                <button
                  key={proc}
                  type="button"
                  onClick={() => toggleProcess(proc)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    priorityProcesses.includes(proc)
                      ? 'bg-purple-100 border-purple-400 text-purple-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {proc}
                </button>
              ))}
            </div>
            {priorityProcesses.length > 0 && (
              <p className="text-xs text-purple-600 mt-2">
                {priorityProcesses.length} seleccionado(s)
              </p>
            )}

            {/* Subprocesos Funciones Ejecutivas */}
            {showExecutiveSubs && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Subprocesos de Funciones Ejecutivas
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Enriquecen la narrativa del informe
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXECUTIVE_FUNCTIONS_SUBPROCESSES.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() =>
                        toggleItem(sub, executiveSubprocesses, setExecutiveSubprocesses)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        executiveSubprocesses.includes(sub)
                          ? 'bg-violet-100 border-violet-400 text-violet-800'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Dificultades Específicas ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-900">
                Dificultades Específicas del Aprendizaje
              </label>
              {draftMeta && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  VI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona las que aplican al estudiante
            </p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES_CATALOG.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() =>
                    toggleItem(diff, activeDifficulties, setActiveDifficulties)
                  }
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    activeDifficulties.includes(diff)
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
            {activeDifficulties.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                {activeDifficulties.length} seleccionada(s)
              </p>
            )}
          </div>

          {/* ── Validation hint ── */}
          {activeDifficulties.length === 0 && priorityProcesses.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                ⚠️ Se requiere al menos un proceso o una dificultad para guardar el plan.
              </p>
            </div>
          )}

          {/* ── Separator: Tabla de 4 columnas ── */}
          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tabla del Plan de Apoyo
              </span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
          </div>

          {/* ── Fortalezas ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="strengths" className="block text-sm font-semibold text-gray-900">
                Fortalezas
              </label>
              {(strengthsSource === 'assessment' || draftMeta) && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  VI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Fortalezas, intereses, estilo de aprendizaje y habilidades del estudiante.
              Puedes editar libremente.
            </p>
            <textarea
              id="strengths"
              value={strengths}
              onChange={(e) => {
                setStrengths(e.target.value)
                if (strengthsSource === 'assessment') setStrengthsSource('plan')
              }}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900 text-sm"
              placeholder="Ej: Estilo de aprendizaje kinestésico-visual. Es cooperador y sociable..."
            />
          </div>

          {/* ── Estrategias para la Mediación ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="mediation" className="block text-sm font-semibold text-gray-900">
                Estrategias para la Mediación
              </label>
              {draftMeta && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  VI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Actividades y estrategias para el trabajo en aula: inicio de clase,
              pausas activas, por dificultad, etc.
            </p>
            <textarea
              id="mediation"
              value={mediationStrategies}
              onChange={(e) => setMediationStrategies(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900 text-sm"
              placeholder={`Ej:\n\nAl inicio de la clase:\n- TikTok o vídeo corto sobre el tema\n- Lectura de fragmento\n\nPausas activas:\n- Adivina adivinanza\n- Stop\n\nDisortografía:\n- Taller de creación de cuentos\n- Paquete ortográfico semanal`}
            />
          </div>

          {/* ── Estrategias de Apoyo para la Casa ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="home" className="block text-sm font-semibold text-gray-900">
                Estrategias de Apoyo para la Casa
              </label>
              {draftMeta && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  VI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Actividades y recomendaciones para que la familia apoye en el hogar.
            </p>
            <textarea
              id="home"
              value={homeStrategies}
              onChange={(e) => setHomeStrategies(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900 text-sm"
              placeholder="Ej: Lugar tranquilo sin distracciones. Horario de estudio. Diario de consejos familiares..."
            />
          </div>

          {/* ── Estrategias Específicas ── */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="specific" className="block text-sm font-semibold text-gray-900">
                Estrategias Específicas
              </label>
              {draftMeta && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  VI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Actividades específicas del docente de apoyo: cuadernos de refuerzo,
              materiales especializados, ejercicios dirigidos.
            </p>
            <textarea
              id="specific"
              value={specificStrategies}
              onChange={(e) => setSpecificStrategies(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent text-gray-900 text-sm"
              placeholder="Ej: Cuaderno de ortografía 6°. Tablero matemático. Tarjetas resuelve el enigma. Cuaderno de caligrafía 6°..."
            />
          </div>

          {/* Messages */}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {saved && (
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Plan de apoyo guardado correctamente
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={
                saving ||
                (activeDifficulties.length === 0 && priorityProcesses.length === 0)
              }
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-md
                         font-medium hover:bg-blue-700 transition-colors
                         disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Plan de Apoyo'}
            </button>

            {planExists && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-md
                           font-medium hover:bg-emerald-700 transition-colors
                           disabled:bg-emerald-300 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exportando...' : 'Exportar Plan (.docx)'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}