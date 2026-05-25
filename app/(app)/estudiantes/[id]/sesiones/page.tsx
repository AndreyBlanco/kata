// app/estudiantes/[id]/sesiones/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

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
  isExtraordinary: boolean
  supportObjective: {
    macroArea: string
    specificGoal: string
  }
}

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const OUTCOME_LABELS: Record<string, string> = {
  achieved: '✅ Logrado',
  partial: '🔶 Parcial',
  notAchieved: '❌ No logrado',
}

export default function SesionesEstudiantePage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [studentName, setStudentName] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, selectedMonth])

  async function loadData() {
    setLoading(true)
    try {
      const studentRes = await fetch(`/api/students/${studentId}`)
      if (!studentRes.ok) {
        router.push('/estudiantes')
        return
      }
      const studentData = await studentRes.json()
      setStudentName(studentData.name)

      const sessionsRes = await fetch(
        `/api/sessions?studentId=${studentId}&month=${selectedMonth}`
      )
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData)
      } else {
        setSessions([])
      }
    } catch {
      console.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setError('')
    setSuccess('')
    setGenerating(true)

    const res = await fetch('/api/sessions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        month: selectedMonth,
        year: currentYear,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al generar')
      setGenerating(false)
      return
    }

    if (data.skipped > 0) {
      setSuccess(`Ya existen ${data.skipped} sesiones para este mes`)
    } else {
      setSuccess(`✓ ${data.created} sesiones generadas`)
    }

    setGenerating(false)
    loadData()
  }

  const pendingCount = sessions.filter((s) => !s.outcome).length
  const completedCount = sessions.filter((s) => s.outcome).length

  // Agrupar por semana
  const sessionsByWeek = sessions.reduce(
    (acc, session) => {
      const week = session.weekNumber
      if (!acc[week]) acc[week] = []
      acc[week].push(session)
      return acc
    },
    {} as Record<number, Session[]>
  )

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
            onClick={() => router.push(`/estudiantes/${studentId}`)}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← {studentName}
          </button>
          <h1 className="text-xl font-bold text-gray-900">Sesiones</h1>
          <div className="flex items-center gap-4 mt-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm
                         text-gray-900 focus:outline-none focus:ring-2
                         focus:ring-blue-500"
            >
              {MONTH_NAMES.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {completedCount}/{sessions.length} registradas
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Sin sesiones */}
        {sessions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">
              No hay sesiones para {MONTH_NAMES[selectedMonth]}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium
                         hover:bg-blue-700 transition-colors
                         disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {generating
                ? 'Generando...'
                : `Generar sesiones de ${MONTH_NAMES[selectedMonth]}`}
            </button>
          </div>
        )}

        {/* Pendientes rápido */}
        {sessions.length > 0 && pendingCount > 0 && (
          <button
            onClick={() =>
              router.push(
                `/sesiones/registrar?studentId=${studentId}&month=${selectedMonth}`
              )
            }
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                       font-medium hover:bg-blue-700 transition-colors"
          >
            📝 Registrar pendientes ({pendingCount})
          </button>
        )}

        {/* Sesiones agrupadas por semana */}
        {Object.entries(sessionsByWeek).map(([week, weekSessions]) => (
          <div key={week}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Semana {week}
            </h3>
            <div className="space-y-2">
              {weekSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() =>
                    router.push(`/sesiones/registrar?sessionId=${session.id}`)
                  }
                  className={`w-full text-left bg-white rounded-lg shadow-sm border p-3
                    transition-colors ${
                      session.outcome
                        ? 'border-green-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.supportObjective.specificGoal}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {session.plannedType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {session.duration} min
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 text-right">
                      {session.attendance === 'absent' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full
                                         bg-red-50 text-red-500">
                          Ausente
                        </span>
                      ) : session.outcome ? (
                        <span className="text-xs">
                          {OUTCOME_LABELS[session.outcome]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 px-2 py-0.5 
                                         rounded-full bg-gray-100">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}