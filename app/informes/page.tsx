// app/informes/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  grade: string
}

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function InformesPage() {
  const router = useRouter()

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        setStudents(data)
        setLoading(false)
      })
  }, [])

  const toggleMonth = (month: number) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== month))
    } else {
      setSelectedMonths([...selectedMonths, month].sort((a, b) => a - b))
    }
  }

  const handleGenerate = () => {
    if (!selectedStudent || selectedMonths.length === 0) return
    router.push(
      `/informes/${selectedStudent}?months=${selectedMonths.join(',')}`
    )
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
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 mb-2 hover:underline"
          >
            ← Inicio
          </button>
          <h1 className="text-xl font-bold text-gray-900">Generar Informe</h1>
          <p className="text-sm text-gray-500">Selecciona estudiante y periodo</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">

        {/* Seleccionar estudiante */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Estudiante
          </label>
          <div className="space-y-2">
            {students.map((student) => (
              <label
                key={student.id}
                className={`flex items-center p-3 rounded-md border cursor-pointer
                  transition-colors ${
                    selectedStudent === student.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <input
                  type="radio"
                  name="student"
                  value={student.id}
                  checked={selectedStudent === student.id}
                  onChange={() => setSelectedStudent(student.id)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm text-gray-900">{student.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{student.grade}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Seleccionar meses */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Meses del periodo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.slice(1).map((name, i) => {
              const month = i + 1
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => toggleMonth(month)}
                  className={`py-2 px-3 rounded-md border text-sm font-medium
                    transition-colors ${
                      selectedMonths.includes(month)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
          {selectedMonths.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              {selectedMonths.map((m) => MONTH_NAMES[m]).join(', ')}
            </p>
          )}
        </div>

        {/* Generar */}
        <button
          onClick={handleGenerate}
          disabled={!selectedStudent || selectedMonths.length === 0}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                     font-medium hover:bg-blue-700 transition-colors
                     disabled:bg-blue-300 disabled:cursor-not-allowed text-base"
        >
          Generar Informe
        </button>
      </div>
    </div>
  )
}