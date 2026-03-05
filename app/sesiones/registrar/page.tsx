// app/sesiones/registrar/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Session {
  id: string
  month: number
  weekNumber: number
  plannedType: string
  duration: number
  executedDate: string | null
  attendance: string | null
  outcome: string | null
  supportLevel: number | null
  observationTags: string[]
  freeText: string | null
  student: { name: string; grade: string }
  supportObjective: { macroArea: string; specificGoal: string }
}

const OBSERVATION_TAGS = [
  'Participativo',
  'Requirió repetición',
  'Mostró frustración',
  'Mejoró respecto a sesión anterior',
  'Trabajo colaborativo',
  'Necesitó material concreto',
  'Atención dispersa',
  'Buena disposición',
  'Fatiga observable',
  'Avance notable',
  'Resistencia a la tarea',
  'Siguió instrucciones',
]

const SUPPORT_LEVELS = [
  { value: 1, label: 'Nivel 1', description: 'Independiente — Mínima ayuda' },
  { value: 2, label: 'Nivel 2', description: 'Guía verbal — Indicaciones orales' },
  { value: 3, label: 'Nivel 3', description: 'Modelado — Demostración directa' },
  { value: 4, label: 'Nivel 4', description: 'Físico/total — Apoyo completo' },
]

export default function RegistrarSesionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sessionId = searchParams.get('sessionId')
  const studentIdParam = searchParams.get('studentId')
  const monthParam = searchParams.get('month')

  const [sessions, setSessions] = useState<Session[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Campos del formulario
  const [executedDate, setExecutedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [isAbsent, setIsAbsent] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [supportLevel, setSupportLevel] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')

  useEffect(() => {
    async function loadSessions() {
      try {
        if (sessionId) {
          // Modo sesión individual
          const res = await fetch(`/api/sessions/${sessionId}`)
          if (!res.ok) throw new Error('Sesión no encontrada')
          const data = await res.json()
          setSessions([data])
          loadSessionData(data)
        } else if (studentIdParam && monthParam) {
          // Modo batch: pendientes del estudiante/mes
          const res = await fetch(
            `/api/sessions?studentId=${studentIdParam}&month=${monthParam}&pending=true`
          )
          if (!res.ok) throw new Error('Error cargando sesiones')
          const data = await res.json()
          if (data.length === 0) {
            router.back()
            return
          }
          setSessions(data)
          loadSessionData(data[0])
        }
      } catch {
        router.back()
      } finally {
        setLoading(false)
      }
    }
    loadSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, studentIdParam, monthParam])

  function loadSessionData(session: Session) {
    if (session.executedDate) {
      setExecutedDate(session.executedDate.split('T')[0])
    } else {
      setExecutedDate(new Date().toISOString().split('T')[0])
    }
    setIsAbsent(session.attendance === 'absent')
    setOutcome(session.outcome || '')
    setSupportLevel(session.supportLevel || 0)
    setSelectedTags(session.observationTags || [])
    setFreeText(session.freeText || '')
  }

  const currentSession = sessions[currentIndex]

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleSave = async () => {
    if (!currentSession) return
    setSaving(true)
    setSaved(false)

    const body = {
      executedDate,
      attendance: isAbsent ? 'absent' : 'present',
      outcome: isAbsent ? null : outcome || null,
      supportLevel: isAbsent ? null : supportLevel || null,
      observationTags: isAbsent ? [] : selectedTags,
      freeText: freeText || null,
    }

    const res = await fetch(`/api/sessions/${currentSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)

    if (!res.ok) {
      alert('Error al guardar')
      return
    }

    // Si hay más sesiones pendientes, avanzar
    if (currentIndex < sessions.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      loadSessionData(sessions[nextIndex])
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } else {
      // Última sesión — volver
      setSaved(true)
      setTimeout(() => {
        router.back()
      }, 1000)
    }
  }

  if (loading || !currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compacto */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => router.back()}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Volver
            </button>
            {sessions.length > 1 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {currentIndex + 1} / {sessions.length}
              </span>
            )}
          </div>
          <h2 className="font-bold text-gray-900">
            {currentSession.student.name}
          </h2>
          <p className="text-xs text-gray-500">
            {currentSession.supportObjective.macroArea} ·{' '}
            {currentSession.plannedType} · Semana {currentSession.weekNumber}
          </p>
        </div>
      </div>

      {/* Objetivo */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-600 font-medium">Objetivo</p>
          <p className="text-sm text-blue-900">
            {currentSession.supportObjective.specificGoal}
          </p>
        </div>

        {/* Formulario rápido */}
        <div className="space-y-4">
          {/* Fecha + Ausente */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={executedDate}
                onChange={(e) => setExecutedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           text-gray-900 focus:outline-none focus:ring-2
                           focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAbsent}
                onChange={(e) => setIsAbsent(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-red-600
                           focus:ring-red-500"
              />
              <span className="text-sm text-red-600 font-medium">Ausente</span>
            </label>
          </div>

          {/* Si está presente, mostrar campos */}
          {!isAbsent && (
            <>
              {/* Resultado */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Resultado
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'achieved', label: '✅ Logrado', color: 'green' },
                    { value: 'partial', label: '🔶 Parcial', color: 'yellow' },
                    { value: 'notAchieved', label: '❌ No logrado', color: 'red' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOutcome(opt.value)}
                      className={`flex-1 py-2.5 rounded-md border text-xs font-medium
                        transition-colors ${
                          outcome === opt.value
                            ? opt.color === 'green'
                              ? 'bg-green-100 border-green-400 text-green-800'
                              : opt.color === 'yellow'
                                ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                : 'bg-red-100 border-red-400 text-red-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel de apoyo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Nivel de apoyo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORT_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setSupportLevel(level.value)}
                      className={`p-2 rounded-md border text-left transition-colors ${
                        supportLevel === level.value
                          ? 'bg-purple-100 border-purple-400'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className={`text-xs font-medium ${
                        supportLevel === level.value
                          ? 'text-purple-800'
                          : 'text-gray-700'
                      }`}>
                        {level.label}
                      </p>
                      <p className={`text-xs ${
                        supportLevel === level.value
                          ? 'text-purple-600'
                          : 'text-gray-400'
                      }`}>
                        {level.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones (chips) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {OBSERVATION_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs border
                        transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-100 border-blue-400 text-blue-800'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Texto libre (opcional) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nota adicional (opcional)
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             text-gray-900 focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                  placeholder="Observación específica..."
                />
              </div>
            </>
          )}

          {/* Mensaje guardado */}
          {saved && (
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Guardado
            </p>
          )}

          {/* Botón guardar */}
          <button
            onClick={handleSave}
            disabled={saving || (!isAbsent && !outcome)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                       font-medium hover:bg-blue-700 transition-colors
                       disabled:bg-blue-300 disabled:cursor-not-allowed
                       text-base"
          >
            {saving
              ? 'Guardando...'
              : currentIndex < sessions.length - 1
                ? `Guardar y siguiente (${sessions.length - currentIndex - 1} más)`
                : 'Guardar'}
          </button>
        </div>

        {/* Espacio inferior para mobile */}
        <div className="h-8" />
      </div>
    </div>
  )
}