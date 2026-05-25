'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ServiceLessonCategory, WorkModality } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { ScheduleGrid, type ScheduleSlotView } from '@/components/schedule/schedule-grid'
import { SERVICE_CATEGORIES } from '@/lib/schedule-template'

interface ScheduleResponse {
  id: string
  schoolPeriod: string
  modality: WorkModality
  approvedAt: string | null
  notes: string | null
  slots: ScheduleSlotView[]
}

export default function HorarioPage() {
  const [data, setData] = useState<ScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const res = await fetch('/api/schedule')
    if (!res.ok) {
      setError('No se pudo cargar el horario')
      return
    }
    const json: ScheduleResponse = await res.json()
    setData(json)
    setDirty(false)
  }, [])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  const onCategoryChange = (slotId: string, next: ServiceLessonCategory | null) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            slots: prev.slots.map((s) => (s.id === slotId ? { ...s, category: next } : s)),
          }
        : prev,
    )
    setDirty(true)
  }

  async function save(approve = false) {
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: data.slots
            .filter((s) => s.blockType === 'LESSON')
            .map((s) => ({ id: s.id, category: s.category })),
          approve: approve === true ? true : undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Error al guardar')
      }
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const cupos = useMemo(() => {
    if (!data) return []
    return SERVICE_CATEGORIES.map((c) => {
      const assigned = data.slots.filter(
        (s) => s.blockType === 'LESSON' && s.category === c.code,
      ).length
      const cupo = c.weeklyLessons[data.modality]
      return {
        code: c.code,
        label: c.shortLabel,
        color: c.color,
        assigned,
        cupo,
        status: assigned === cupo ? 'ok' : assigned < cupo ? 'under' : 'over',
      }
    })
  }, [data])

  const totalAsigned = cupos.reduce((s, c) => s + c.assigned, 0)
  const totalCupo = cupos.reduce((s, c) => s + c.cupo, 0)

  if (loading) return <LoadingState message="Cargando horario…" />
  if (!data) return <div className="p-4 text-sm text-red-600">{error ?? 'Sin datos'}</div>

  return (
    <>
      <PageHeader title="Horario base" subtitle={`Periodo ${data.schoolPeriod}`} backHref="/" />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="rounded-xl border bg-white p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-gray-700">
              <strong>Modalidad:</strong> {data.modality === 'FIJO' ? 'Fijo (40 lec/sem)' : 'Itinerante (44 lec/sem)'}
              {' · '}
              <strong>{totalAsigned}/{totalCupo}</strong> lecciones asignadas
            </p>
            <p className="text-gray-500">
              {data.approvedAt
                ? `Aprobado: ${new Date(data.approvedAt).toLocaleDateString('es-CR')}`
                : 'Sin aprobar'}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Cambia la modalidad desde <a href="/perfil" className="text-kata-primary underline">tu perfil</a>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cupos.map((c) => (
            <div
              key={c.code}
              className={`rounded-lg border px-3 py-2 text-[11px] ${c.color}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.label}</span>
                <span className={c.status === 'over' ? 'text-rose-700 font-semibold' : c.status === 'ok' ? 'text-emerald-700 font-semibold' : ''}>
                  {c.assigned}/{c.cupo}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-white p-3">
          <ScheduleGrid
            slots={data.slots}
            onCategoryChange={onCategoryChange}
            activeSlotId={activeSlotId}
            onActiveSlotChange={setActiveSlotId}
          />
        </div>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={!dirty || saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Guardar + aprobar
          </button>
          {data.approvedAt && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Reabrir el horario como borrador?')) return
                await fetch('/api/schedule', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ approve: false }),
                })
                await reload()
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Reabrir borrador
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-500">
          Las celdas grises (recreos y almuerzo) son fijas. Toca una lección para asignarle categoría.
          La validación de cupos exactos por categoría se realiza al planificar el mes.
        </p>
      </div>
    </>
  )
}
