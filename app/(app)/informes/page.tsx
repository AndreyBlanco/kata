'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { SchoolPeriodSelect } from '@/components/ui/school-period-select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import {
  getSchoolPeriod,
  MONTH_NAMES,
  monthsLabel,
  resolveSchoolPeriodId,
  type SchoolPeriodDefinition,
} from '@/lib/school-periods'

interface Student {
  id: string
  name: string
  grade: string
}

export default function InformesPage() {
  const router = useRouter()

  const [students, setStudents] = useState<Student[]>([])
  const [periods, setPeriods] = useState<SchoolPeriodDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPeriod, setSavingPeriod] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState('')
  const [schoolPeriodId, setSchoolPeriodId] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

  const applyPeriodMonths = useCallback((periodId: string, list: SchoolPeriodDefinition[]) => {
    const def = list.find((p) => p.id === periodId) ?? getSchoolPeriod(periodId)
    if (def) setSelectedMonths([...def.months])
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const [studentsRes, periodsRes, profileRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/school-periods'),
          fetch('/api/profile'),
        ])

        const studentsData = studentsRes.ok ? await studentsRes.json() : []
        setStudents(studentsData)

        if (periodsRes.ok) {
          const periodsData = await periodsRes.json()
          const list: SchoolPeriodDefinition[] = periodsData.periods ?? []
          setPeriods(list)

          let activeId = periodsData.defaultPeriodId as string
          if (profileRes.ok) {
            const profile = await profileRes.json()
            activeId = resolveSchoolPeriodId(profile.activeSchoolPeriod)
          }
          setSchoolPeriodId(activeId)
          applyPeriodMonths(activeId, list)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [applyPeriodMonths])

  const handlePeriodChange = async (periodId: string) => {
    setSchoolPeriodId(periodId)
    applyPeriodMonths(periodId, periods)
    setSavingPeriod(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeSchoolPeriod: periodId }),
      })
    } finally {
      setSavingPeriod(false)
    }
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month).sort((a, b) => a - b)
        : [...prev, month].sort((a, b) => a - b),
    )
  }

  const handleGenerate = () => {
    if (!selectedStudent || selectedMonths.length === 0 || !schoolPeriodId) return
    const q = new URLSearchParams({
      schoolPeriod: schoolPeriodId,
      months: selectedMonths.join(','),
    })
    router.push(`/informes/${selectedStudent}?${q.toString()}`)
  }

  const periodDef = getSchoolPeriod(schoolPeriodId)

  if (loading) {
    return <LoadingState />
  }

  return (
    <>
      <PageHeader
        title="Generar informe"
        subtitle="Periodo lectivo MEP y meses del informe"
      />

      <div className="mx-auto max-w-lg space-y-6 p-4">
        <Card>
          <label className="mb-3 block text-sm font-semibold text-gray-900">
            Periodo lectivo
          </label>
          <SchoolPeriodSelect
            periods={periods}
            value={schoolPeriodId}
            onChange={handlePeriodChange}
            disabled={savingPeriod}
          />
          {periodDef && (
            <p className="mt-2 text-xs text-gray-500">
              Meses sugeridos: {monthsLabel(periodDef.months)}. Puede ajustarlos abajo.
            </p>
          )}
        </Card>

        <Card>
          <label className="mb-3 block text-sm font-semibold text-gray-900">
            Estudiante
          </label>
          <div className="space-y-2">
            {students.map((student) => (
              <label
                key={student.id}
                className={cn(
                  'flex cursor-pointer items-center rounded-md border p-3 transition-colors',
                  selectedStudent === student.id
                    ? 'border-kata-primary bg-kata-primary/5'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <input
                  type="radio"
                  name="student"
                  value={student.id}
                  checked={selectedStudent === student.id}
                  onChange={() => setSelectedStudent(student.id)}
                  className="mr-3 text-kata-primary focus:ring-kata-primary"
                />
                <div>
                  <span className="text-sm text-gray-900">{student.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{student.grade}</span>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <label className="mb-3 block text-sm font-semibold text-gray-900">
            Meses incluidos en el informe
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.slice(1).map((name, i) => {
              const month = i + 1
              const inPeriod = periodDef?.months.includes(month)
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => toggleMonth(month)}
                  className={cn(
                    'rounded-md border py-2 px-3 text-sm font-medium transition-colors',
                    selectedMonths.includes(month)
                      ? 'border-kata-primary bg-kata-primary text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                    inPeriod && !selectedMonths.includes(month) && 'ring-1 ring-kata-primary/30',
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
          {selectedMonths.length > 0 && (
            <p className="mt-2 text-xs text-kata-primary-dark">
              {monthsLabel(selectedMonths)}
            </p>
          )}
        </Card>

        <Button
          fullWidth
          disabled={!selectedStudent || selectedMonths.length === 0 || !schoolPeriodId}
          onClick={handleGenerate}
        >
          Generar informe
        </Button>
      </div>
    </>
  )
}
