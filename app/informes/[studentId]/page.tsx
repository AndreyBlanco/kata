// app/informes/[studentId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

interface ReportData {
  administrative: {
    studentName: string
    age: number
    grade: string
    teacherName: string
    centerName: string
    circuit: string
    specialty: string
    reportPeriod: string
    generatedDate: string
  }
  annualFramework: {
    planTypeLabel: string
    activeDifficulties: string[]
    priorityProcesses: string[]
    narrative: string
  }
  periodSynthesis: {
    objectivesWorked: number
    totalSessions: number
    sessionsAttended: number
    sessionsAbsent: number
    completionRate: number
    narrative: string
  }
  objectiveDevelopment: Array<{
    macroArea: string
    specificGoal: string
    totalSessions: number
    attendedSessions: number
    achievedPercentage: number
    progressLevel: string
    averageSupportLevel: number
    narrative: string
  }>
  supports: {
    strategies: string[]
    narrative: string
  }
  recommendations: {
    suggested: string[]
    editable: string
  }
}

const PROGRESS_COLORS: Record<string, string> = {
  'avances significativos': 'bg-green-100 text-green-700',
  'avances progresivos': 'bg-yellow-100 text-yellow-700',
  'en proceso de adquisición': 'bg-orange-100 text-orange-700',
}

export default function InformePreviewPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const months = searchParams.get('months') || ''

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editableRecommendations, setEditableRecommendations] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(
          `/api/reports/${studentId}?months=${months}`
        )

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Error al generar informe')
          setLoading(false)
          return
        }

        const data = await res.json()
        setReport(data)
        setEditableRecommendations(data.recommendations.editable)
      } catch {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [studentId, months])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(
        `/api/reports/export/${studentId}?months=${months}&recommendations=${encodeURIComponent(editableRecommendations)}`
      )

      if (!res.ok) {
        alert('Error al exportar')
        setExporting(false)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Informe_${report?.administrative.studentName.replace(/\s+/g, '_')}.docx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Error al descargar')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Generando informe...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  if (!report) return null

  const { administrative, annualFramework, periodSynthesis, objectiveDevelopment, supports } = report

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Volver
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Informe — {administrative.studentName}
            </h1>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm
                       font-medium hover:bg-green-700 transition-colors
                       disabled:bg-green-300"
          >
            {exporting ? 'Exportando...' : '📥 Exportar Word'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* 1. PARTE ADMINISTRATIVA */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">
            1. Datos Administrativos
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Estudiante:</span>
              <p className="font-medium text-gray-900">{administrative.studentName}</p>
            </div>
            <div>
              <span className="text-gray-500">Edad:</span>
              <p className="font-medium text-gray-900">{administrative.age} años</p>
            </div>
            <div>
              <span className="text-gray-500">Grado:</span>
              <p className="font-medium text-gray-900">{administrative.grade}</p>
            </div>
            <div>
              <span className="text-gray-500">Periodo:</span>
              <p className="font-medium text-gray-900">{administrative.reportPeriod}</p>
            </div>
            <div>
              <span className="text-gray-500">Docente de apoyo:</span>
              <p className="font-medium text-gray-900">{administrative.teacherName}</p>
            </div>
            <div>
              <span className="text-gray-500">Centro educativo:</span>
              <p className="font-medium text-gray-900">{administrative.centerName}</p>
            </div>
            <div>
              <span className="text-gray-500">Circuito:</span>
              <p className="font-medium text-gray-900">{administrative.circuit}</p>
            </div>
            <div>
              <span className="text-gray-500">Especialidad:</span>
              <p className="font-medium text-gray-900">{administrative.specialty}</p>
            </div>
          </div>
        </section>

        {/* 2. MARCO ANUAL */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">
            2. Marco Anual — Plan de Apoyo
          </h2>
          <div className="mb-3">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {annualFramework.planTypeLabel}
            </span>
          </div>
          {annualFramework.activeDifficulties.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Dificultades:</p>
              <div className="flex flex-wrap gap-1">
                {annualFramework.activeDifficulties.map((d) => (
                  <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {annualFramework.priorityProcesses.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Procesos:</p>
              <div className="flex flex-wrap gap-1">
                {annualFramework.priorityProcesses.map((p) => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {annualFramework.narrative}
          </p>
        </section>

        {/* 3. SÍNTESIS DEL PERIODO */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">
            3. Síntesis del Periodo
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {periodSynthesis.totalSessions}
              </p>
              <p className="text-xs text-gray-500">Sesiones</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                {periodSynthesis.sessionsAttended}
              </p>
              <p className="text-xs text-gray-500">Atendidas</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {periodSynthesis.completionRate}%
              </p>
              <p className="text-xs text-gray-500">Completado</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {periodSynthesis.narrative}
          </p>
        </section>

        {/* 4. DESARROLLO POR OBJETIVO */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">
            4. Desarrollo por Objetivo
          </h2>
          <div className="space-y-6">
            {objectiveDevelopment.map((obj, i) => (
              <div key={i} className="border-l-4 border-blue-300 pl-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-gray-500">{obj.macroArea}</span>
                    <p className="text-sm font-medium text-gray-900">
                      {obj.specificGoal}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                    PROGRESS_COLORS[obj.progressLevel] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {obj.progressLevel}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 mb-2">
                  <span>{obj.totalSessions} sesiones</span>
                  <span>{obj.attendedSessions} atendidas</span>
                  <span>{obj.achievedPercentage}% logrado</span>
                  {obj.averageSupportLevel > 0 && (
                    <span>Apoyo: {obj.averageSupportLevel}</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {obj.narrative}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. APOYOS IMPLEMENTADOS */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">
            5. Apoyos Implementados
          </h2>
          {supports.strategies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {supports.strategies.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                  {s}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-700 leading-relaxed">
            {supports.narrative}
          </p>
        </section>

        {/* 6. RECOMENDACIONES (Editable) */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-base font-bold text-gray-900 mb-2 border-b pb-2">
            6. Recomendaciones
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Puedes editar las recomendaciones antes de exportar
          </p>
          <textarea
            value={editableRecommendations}
            onChange={(e) => setEditableRecommendations(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                       text-gray-900 focus:outline-none focus:ring-2
                       focus:ring-blue-500 leading-relaxed"
          />
        </section>

        {/* Botón exportar fijo abajo */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 px-4 bg-green-600 text-white rounded-md
                     font-medium hover:bg-green-700 transition-colors
                     disabled:bg-green-300 text-base"
        >
          {exporting ? 'Exportando...' : '📥 Exportar a Word'}
        </button>

        <div className="h-8" />
      </div>
    </div>
  )
}