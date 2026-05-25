'use client'

// app/perfil/page.tsx
// Página de perfil del docente — edición de datos institucionales con autocompletar

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MEP_REGIONAL_DIRECTIONS, MEP_SPECIALTIES, CIRCUIT_TO_REGION } from '@/lib/mep-data'
import { SchoolPeriodSelect } from '@/components/ui/school-period-select'
import {
  resolveSchoolPeriodId,
  type SchoolPeriodDefinition,
} from '@/lib/school-periods'

// ─── tipos ────────────────────────────────────────────────────────────────────
type WorkModality = 'FIJO' | 'ITINERANTE'

interface TeacherProfile {
  id:         string
  name:       string
  email:      string
  centerName: string
  circuit:    string
  specialty:  string
  activeSchoolPeriod?: string | null
  workModality?: WorkModality
}

// ─── combobox de circuito ──────────────────────────────────────────────────────
function CircuitCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  // sincroniza si el prop cambia externamente (carga inicial)
  useEffect(() => { setQuery(value) }, [value])

  // cierra al hacer click fuera
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // filtra circuitos por query (insensible a tildes y mayúsculas)
  // Compara tanto el número del circuito como el nombre de la DR.
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const q = normalize(query)
  const filtered = q.length < 1
    ? MEP_REGIONAL_DIRECTIONS
    : MEP_REGIONAL_DIRECTIONS
        .map((region) => {
          const regionMatches = normalize(region.name).includes(q)
          return {
            ...region,
            circuits: regionMatches
              ? region.circuits
              : region.circuits.filter((c) => normalize(`${region.name} · ${c}`).includes(q)),
          }
        })
        .filter((region) => region.circuits.length > 0)

  function select(regionName: string, circuit: string) {
    const composed = `${regionName} · ${circuit}`
    setQuery(composed)
    onChange(composed)
    setOpen(false)
  }

  const region = CIRCUIT_TO_REGION[value]

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Buscar por dirección regional o número (ej. Alajuela, 04)…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />

      {region && (
        <p className="text-xs text-gray-400 mt-1">
          Dirección Regional: <span className="text-gray-600">{region}</span>
        </p>
      )}

      {open && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.map((region) => (
            <div key={region.name}>
              <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                {region.name}
              </div>
              {region.circuits.map((circuit) => (
                <button
                  key={`${region.name}-${circuit}`}
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => select(region.name, circuit)}
                >
                  Circuito {circuit}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {open && filtered.length === 0 && query.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-sm text-gray-500">
          Sin coincidencias — el valor escrito se guardará como está.
        </div>
      )}
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────
export default function PerfilPage() {
  const { data: session } = useSession()

  const [profile, setProfile]   = useState<TeacherProfile | null>(null)
  const [form, setForm]         = useState<Partial<TeacherProfile>>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isDirty, setIsDirty]   = useState(false)
  const [periods, setPeriods] = useState<SchoolPeriodDefinition[]>([])
  const [schoolPeriodId, setSchoolPeriodId] = useState('')

  // Carga perfil
  useEffect(() => {
    Promise.all([fetch('/api/profile'), fetch('/api/school-periods')])
      .then(async ([profileRes, periodsRes]) => {
        const data = await profileRes.json()
        const periodsData = periodsRes.ok ? await periodsRes.json() : { periods: [] }
        setPeriods(periodsData.periods ?? [])
        setProfile(data)
        setSchoolPeriodId(resolveSchoolPeriodId(data.activeSchoolPeriod))
        setForm({
          name:       data.name,
          centerName: data.centerName,
          circuit:    data.circuit,
          specialty:  data.specialty,
          workModality: data.workModality ?? 'FIJO',
        })
      })
      .catch(() => setError('No se pudo cargar el perfil'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange<K extends keyof TeacherProfile>(
    field: K,
    value: TeacherProfile[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Error al guardar')
      }
      const updated = await res.json()
      setProfile(updated)
      setSchoolPeriodId(resolveSchoolPeriodId(updated.activeSchoolPeriod))
      setForm({
        name:       updated.name,
        centerName: updated.centerName,
        circuit:    updated.circuit,
        specialty:  updated.specialty,
        workModality: updated.workModality ?? 'FIJO',
      })
      setIsDirty(false)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Cargando perfil…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="w-6" aria-hidden />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mi perfil</h1>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">

        {/* Aviso — datos usados en informes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
          Estos datos aparecen automáticamente en los informes de periodo y en las exportaciones Word.
          Mantenlos actualizados.
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-5 space-y-5">

          {/* Nombre completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre y apellidos"
            />
          </div>

          {/* Periodo lectivo activo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodo lectivo activo
            </label>
            <SchoolPeriodSelect
              periods={periods}
              value={schoolPeriodId}
              onChange={async (id) => {
                setSchoolPeriodId(id)
                setIsDirty(true)
                setSaved(false)
                await fetch('/api/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ activeSchoolPeriod: id }),
                })
              }}
            />
            <p className="mt-2 text-xs text-gray-500">
              Calendario MEP — actualizado por el equipo Katà cada año (
              <code className="text-[10px]">lib/school-periods.ts</code>).
            </p>
          </div>

          {/* Especialidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Especialidad / servicio
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.specialty ?? ''}
              onChange={(e) => handleChange('specialty', e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {MEP_SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modalidad de trabajo (Anexo 1) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modalidad de trabajo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'FIJO',       label: 'Fijo · 40 lec/sem' },
                  { value: 'ITINERANTE', label: 'Itinerante · 44 lec/sem' },
                ] as const
              ).map((opt) => {
                const active = (form.workModality ?? 'FIJO') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange('workModality', opt.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Define la distribución semanal de lecciones por categoría (Anexo 1 — Líneas de Acción 2023).
              El piloto se prepara para ambas; en producción se valida según docente fijo/itinerante.
            </p>
          </div>

          <hr className="border-gray-100" />

          {/* Circuito */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Circuito educativo
            </label>
            <CircuitCombobox
              value={form.circuit ?? ''}
              onChange={(v) => handleChange('circuit', v)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Escribe la dirección regional o el número del circuito (01, 02…).
            </p>
          </div>

          {/* Centro educativo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Centro educativo
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.centerName ?? ''}
              onChange={(e) => handleChange('centerName', e.target.value)}
              placeholder="Nombre completo del centro (ej. Escuela IDA Garabito)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se incluye en el encabezado de los informes y valoraciones.
            </p>
          </div>

          {/* Mensajes */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              ✓ Perfil actualizado correctamente
            </p>
          )}

          {/* Botón guardar */}
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors
                       bg-blue-600 text-white hover:bg-blue-700
                       disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando…' : isDirty ? 'Guardar cambios' : 'Sin cambios'}
          </button>
        </form>

        {/* Sección info de cuenta */}
        <div className="mt-4 bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Cuenta</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span>{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Usuario</span>
              <span>{session?.user?.name || '—'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Para cambiar la contraseña, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
