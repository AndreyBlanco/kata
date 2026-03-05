// app/estudiantes/[id]/objetivos/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { OBJECTIVES_CATALOG, MACRO_AREAS } from '@/lib/catalogs'
import type { CatalogObjective } from '@/lib/catalogs'

interface AssignedObjective {
  id: string
  macroArea: string
  specificGoal: string
  frequencyPerWeek: number
  duration: number
  interventionType: string
  linkedProcesses: string[]
  linkedDifficulties: string[]
  active: boolean
}

interface PlanContext {
  activeDifficulties: string[]
  priorityProcesses: string[]
  executiveSubprocesses: string[]
}

type Step = 'list' | 'select-area' | 'select-goal' | 'configure'

export default function ObjetivosEstudiantePage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [studentName, setStudentName] = useState('')
  const [objectives, setObjectives] = useState<AssignedObjective[]>([])
  const [planContext, setPlanContext] = useState<PlanContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Assignment flow
  const [step, setStep] = useState<Step>('list')
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<CatalogObjective | null>(null)
  const [frequency, setFrequency] = useState(2)
  const [duration, setDuration] = useState(40)
  const [interventionType, setInterventionType] = useState('personalizada')

  const activeObjectives = objectives.filter((o) => o.active)

  useEffect(() => {
    async function loadData() {
      try {
        // Student
        const studentRes = await fetch(`/api/students/${studentId}`)
        if (!studentRes.ok) {
          router.push('/estudiantes')
          return
        }
        const studentData = await studentRes.json()
        setStudentName(studentData.name)

        // Plan context (for hints)
        const planRes = await fetch(`/api/support-plans/${studentId}`)
        if (planRes.ok) {
          const planData = await planRes.json()
          if (planData && planData.id) {
            setPlanContext({
              activeDifficulties: planData.activeDifficulties || [],
              priorityProcesses: planData.priorityProcesses || [],
              executiveSubprocesses: planData.executiveSubprocesses || [],
            })
          }
        }

        // Objectives
        const objRes = await fetch(`/api/objectives?studentId=${studentId}`)
        if (objRes.ok) {
          const objData = await objRes.json()
          setObjectives(objData)
        } else {
          setObjectives([])
        }
      } catch (err) {
        console.error('Error cargando datos:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [studentId, router])

  const handleSelectArea = (area: string) => {
    setSelectedArea(area)
    setStep('select-goal')
  }

  const handleSelectGoal = (goal: CatalogObjective) => {
    setSelectedGoal(goal)
    setStep('configure')
  }

  const handleAssign = async () => {
    if (!selectedGoal) return
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          catalogId: selectedGoal.id,
          macroArea: selectedGoal.macroArea,
          specificGoal: selectedGoal.specificGoal,
          frequencyPerWeek: frequency,
          duration,
          interventionType,
          // API will auto-link from Plan if empty
          linkedProcesses: [],
          linkedDifficulties: [],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al asignar')
        return
      }

      const newObj = await res.json()
      setObjectives([newObj, ...objectives])
      resetFlow()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (obj: AssignedObjective) => {
    const res = await fetch(`/api/objectives/${obj.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !obj.active }),
    })

    if (res.ok) {
      const updated = await res.json()
      setObjectives(objectives.map((o) => (o.id === obj.id ? updated : o)))
    }
  }

  const handleDelete = async (objId: string) => {
    if (!confirm('¿Eliminar este objetivo y todas sus sesiones asociadas?')) return

    const res = await fetch(`/api/objectives/${objId}`, { method: 'DELETE' })
    if (res.ok) {
      setObjectives(objectives.filter((o) => o.id !== objId))
    }
  }

  const resetFlow = () => {
    setStep('list')
    setSelectedArea('')
    setSelectedGoal(null)
    setFrequency(2)
    setDuration(40)
    setInterventionType('personalizada')
    setError('')
  }

  const goalsForArea = OBJECTIVES_CATALOG.filter(
    (o) => o.macroArea === selectedArea
  )

  // Already assigned goal texts (to disable in catalog)
  const assignedGoalTexts = objectives.map((o) => o.specificGoal)

  // Suggested areas based on plan context
  const getSuggestedAreas = (): Set<string> => {
    const suggested = new Set<string>()
    if (!planContext) return suggested

    const { activeDifficulties, priorityProcesses } = planContext

    // Map difficulties to relevant macro areas
    if (activeDifficulties.includes('Dislexia')) {
      suggested.add('Lectoescritura')
      suggested.add('Percepción Visual')
    }
    if (activeDifficulties.includes('Disortografía')) {
      suggested.add('Ortografía')
      suggested.add('Lectoescritura')
    }
    if (activeDifficulties.includes('Disgrafía')) {
      suggested.add('Grafía')
      suggested.add('Motricidad')
    }
    if (activeDifficulties.includes('Discalculia')) {
      suggested.add('Matemáticas')
    }
    if (activeDifficulties.includes('Dispraxia')) {
      suggested.add('Motricidad')
    }
    if (activeDifficulties.includes('TDA')) {
      suggested.add('Contexto de Aula')
      suggested.add('Madurez Socioemocional')
    }

    // Map processes
    if (priorityProcesses.includes('Percepción')) {
      suggested.add('Percepción Visual')
      suggested.add('Percepción Auditiva')
    }
    if (priorityProcesses.includes('Atención')) {
      suggested.add('Contexto de Aula')
    }
    if (priorityProcesses.includes('Memoria')) {
      suggested.add('Lectoescritura')
      suggested.add('Matemáticas')
    }
    if (priorityProcesses.includes('Emoción') || priorityProcesses.includes('Motivación')) {
      suggested.add('Madurez Socioemocional')
    }

    return suggested
  }

  const suggestedAreas = getSuggestedAreas()

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
        <div className="max-w-lg mx-auto">
          <button
            onClick={() =>
              step === 'list'
                ? router.push(`/estudiantes/${studentId}`)
                : resetFlow()
            }
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← {step === 'list' ? studentName : 'Volver'}
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'list' && 'Objetivos de Apoyo'}
            {step === 'select-area' && 'Seleccionar Área'}
            {step === 'select-goal' && selectedArea}
            {step === 'configure' && 'Configurar Objetivo'}
          </h1>
          {step === 'list' && (
            <p className="text-sm text-gray-500">
              {activeObjectives.length} activo(s)
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">

        {/* ── LIST VIEW ── */}
        {step === 'list' && (
          <div className="space-y-4">

            {/* Plan context banner */}
            {planContext && (planContext.activeDifficulties.length > 0 || planContext.priorityProcesses.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1.5">
                  Contexto del Plan de Apoyo
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {planContext.priorityProcesses.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {p}
                    </span>
                  ))}
                  {planContext.activeDifficulties.map((d) => (
                    <span key={d} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* No plan warning */}
            {!planContext && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  💡 <strong>Sugerencia:</strong> Completar el{' '}
                  <button
                    onClick={() => router.push(`/estudiantes/${studentId}/plan`)}
                    className="text-amber-900 underline hover:no-underline font-medium"
                  >
                    Plan de Apoyo
                  </button>{' '}
                  para recibir sugerencias de áreas relevantes.
                </p>
              </div>
            )}

            {/* Add button */}
            <button
              onClick={() => setStep('select-area')}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                         font-medium hover:bg-blue-700 transition-colors"
            >
              + Asignar Objetivo
            </button>

            {/* Objectives list */}
            {objectives.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No hay objetivos asignados</p>
                <p className="text-xs text-gray-400 mt-1">
                  Asigna objetivos del catálogo para comenzar a registrar sesiones
                </p>
              </div>
            ) : (
              objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`bg-white rounded-lg shadow-sm border p-4 ${
                    !obj.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {obj.macroArea}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        obj.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {obj.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {obj.specificGoal}
                  </p>

                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span>{obj.frequencyPerWeek}x/semana</span>
                    <span>{obj.duration} min</span>
                    <span className="capitalize">{obj.interventionType}</span>
                  </div>

                  {/* Linked tags */}
                  {(obj.linkedProcesses.length > 0 || obj.linkedDifficulties.length > 0) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {obj.linkedProcesses.map((p) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                          {p}
                        </span>
                      ))}
                      {obj.linkedDifficulties.map((d) => (
                        <span key={d} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(obj)}
                      className="text-xs px-3 py-1 rounded border border-gray-300
                                 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {obj.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(obj.id)}
                      className="text-xs px-3 py-1 rounded border border-red-200
                                 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SELECT AREA ── */}
        {step === 'select-area' && (
          <div className="space-y-2">
            {/* Suggested areas first */}
            {suggestedAreas.size > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Sugeridas según el Plan de Apoyo
                </p>
                {MACRO_AREAS.filter((a) => suggestedAreas.has(a)).map((area) => {
                  const count = OBJECTIVES_CATALOG.filter(
                    (o) => o.macroArea === area
                  ).length
                  return (
                    <button
                      key={area}
                      onClick={() => handleSelectArea(area)}
                      className="w-full text-left bg-green-50 rounded-lg border border-green-200 p-4
                                 hover:border-green-400 transition-colors mb-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{area}</h3>
                          <p className="text-xs text-gray-500">{count} objetivos</p>
                        </div>
                        <span className="text-green-500">→</span>
                      </div>
                    </button>
                  )
                })}

                <div className="flex items-center gap-3 my-3">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs text-gray-400">Todas las áreas</span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              </div>
            )}

            {/* All areas */}
            {MACRO_AREAS.filter((a) => !suggestedAreas.has(a)).map((area) => {
              const count = OBJECTIVES_CATALOG.filter(
                (o) => o.macroArea === area
              ).length
              return (
                <button
                  key={area}
                  onClick={() => handleSelectArea(area)}
                  className="w-full text-left bg-white rounded-lg shadow-sm border p-4
                             hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{area}</h3>
                      <p className="text-xs text-gray-500">{count} objetivos</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── SELECT GOAL ── */}
        {step === 'select-goal' && (
          <div className="space-y-2">
            {goalsForArea.map((goal) => {
              const isAssigned = assignedGoalTexts.includes(goal.specificGoal)
              return (
                <button
                  key={goal.id}
                  onClick={() => !isAssigned && handleSelectGoal(goal)}
                  disabled={isAssigned}
                  className={`w-full text-left bg-white rounded-lg shadow-sm border p-4
                    transition-colors ${
                      isAssigned
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-blue-300'
                    }`}
                >
                  <p className="text-sm text-gray-900">{goal.specificGoal}</p>
                  {isAssigned && (
                    <p className="text-xs text-gray-400 mt-1">Ya asignado</p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {step === 'configure' && selectedGoal && (
          <div className="space-y-4">
            {/* Selected goal summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium">{selectedGoal.macroArea}</p>
              <p className="text-sm text-blue-900 font-medium mt-1">
                {selectedGoal.specificGoal}
              </p>
            </div>

            {/* Plan context reminder */}
            {planContext && (planContext.activeDifficulties.length > 0 || planContext.priorityProcesses.length > 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1.5">
                  Se vincularán automáticamente del Plan:
                </p>
                <div className="flex flex-wrap gap-1">
                  {planContext.priorityProcesses.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                      {p}
                    </span>
                  ))}
                  {planContext.activeDifficulties.map((d) => (
                    <span key={d} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Frequency */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Frecuencia por semana
              </label>
              <div className="flex gap-3">
                {[1, 2, 3].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium
                      transition-colors ${
                        frequency === f
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {f}x
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Duración por sesión
              </label>
              <div className="flex gap-3">
                {[20, 40, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium
                      transition-colors ${
                        duration === d
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Intervention type */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Tipo de intervención
              </label>
              <div className="space-y-2">
                {[
                  { value: 'aula', label: 'En aula (con grupo)' },
                  { value: 'personalizada', label: 'Personalizada (individual)' },
                  { value: 'ambas', label: 'Ambas modalidades' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center p-3 rounded-md border cursor-pointer
                      transition-colors ${
                        interventionType === opt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="interventionType"
                      value={opt.value}
                      checked={interventionType === opt.value}
                      onChange={(e) => setInterventionType(e.target.value)}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            {/* Assign button */}
            <button
              onClick={handleAssign}
              disabled={saving}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                         font-medium hover:bg-blue-700 transition-colors
                         disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Asignando...' : 'Asignar Objetivo'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}