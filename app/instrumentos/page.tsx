'use client'

// app/instrumentos/page.tsx
// Gestión del catálogo de instrumentos de valoración.
// Muestra: aprobados (core + custom) y pendientes de aprobación.
// Permite: aprobar, rechazar y eliminar instrumentos personalizados.

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── tipos ────────────────────────────────────────────────────────────────────
interface InstrumentItem {
  id:          string
  code:        string
  label:       string
  category:    string
  isCore:      boolean
  status:      string
  suggestedBy: string | null
  description: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  observacion:   'Observación',
  entrevista:    'Entrevista',
  curriculum:    'Basado en currículo',
  escala:        'Escalas y listas',
  prueba_formal: 'Prueba formal',
  otro:          'Otro',
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved:        { label: 'Aprobado',  className: 'bg-green-100 text-green-700 border-green-300' },
  pendingApproval: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  rejected:        { label: 'Rechazado', className: 'bg-red-100 text-red-600 border-red-300' },
}

// ─── página ───────────────────────────────────────────────────────────────────
export default function InstrumentosPage() {
  const [items, setItems]       = useState<InstrumentItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'pending' | 'approved'>('all')
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const res = await fetch('/api/catalogs/instruments')
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function approve(id: string) {
    setActionId(id)
    await fetch(`/api/catalogs/instruments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'approved' } : i))
    )
    setActionId(null)
  }

  async function reject(id: string) {
    setActionId(id)
    await fetch(`/api/catalogs/instruments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'rejected' } : i))
    )
    setActionId(null)
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este instrumento sugerido?')) return
    setActionId(id)
    await fetch(`/api/catalogs/instruments/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    setActionId(null)
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const pendingCount = items.filter((i) => i.status === 'pendingApproval').length

  const filtered = items.filter((i) => {
    if (filter === 'pending')  return i.status === 'pendingApproval'
    if (filter === 'approved') return i.status === 'approved'
    return true
  })

  // Agrupar por categoría
  const byCategory = filtered.reduce<Record<string, InstrumentItem[]>>((acc, item) => {
    const cat = item.category || 'otro'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  // Orden preferido de categorías
  const categoryOrder = ['observacion', 'entrevista', 'curriculum', 'escala', 'prueba_formal', 'otro']
  const sortedCategories = [
    ...categoryOrder.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter((c) => !categoryOrder.includes(c)),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Instrumentos de valoración</h1>
            <p className="text-xs text-gray-500">
              Catálogo de la sección 7 del Informe de Valoración Integral
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-1 rounded-full border border-yellow-300">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Aviso */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Los instrumentos <strong>aprobados</strong> aparecen como opciones en la Valoración Integral.
          Los docentes pueden proponer nuevos instrumentos, que quedan <strong>pendientes de aprobación</strong>.
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['all', 'approved', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filter === f
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'approved' ? 'Aprobados' : `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Cargando…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
            Sin instrumentos en esta vista.
          </div>
        ) : (
          sortedCategories.map((cat) => (
            <div key={cat} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h3>
              </div>
              <div className="divide-y">
                {byCategory[cat].map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.approved
                  const busy  = actionId === item.id
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{item.label}</span>
                          {item.isCore && (
                            <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                              MEP
                            </span>
                          )}
                          <span className={`text-xs border rounded px-1.5 py-0.5 ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        )}
                        {item.suggestedBy && (
                          <p className="text-xs text-gray-400 mt-0.5">Propuesto por un docente</p>
                        )}
                      </div>

                      {/* Acciones — solo para instrumentos no-core */}
                      {!item.isCore && (
                        <div className="flex gap-1.5 shrink-0">
                          {item.status === 'pendingApproval' && (
                            <>
                              <button
                                onClick={() => approve(item.id)}
                                disabled={busy}
                                className="px-2.5 py-1 text-xs bg-green-50 text-green-700 border border-green-300
                                           rounded hover:bg-green-100 disabled:opacity-40 transition-colors"
                              >
                                {busy ? '…' : 'Aprobar'}
                              </button>
                              <button
                                onClick={() => reject(item.id)}
                                disabled={busy}
                                className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-200
                                           rounded hover:bg-red-100 disabled:opacity-40 transition-colors"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => remove(item.id)}
                            disabled={busy || item.status === 'approved'}
                            className="px-2 py-1 text-xs text-gray-400 border border-gray-200 rounded
                                       hover:bg-gray-50 disabled:opacity-30 transition-colors"
                            title={item.status === 'approved' ? 'No se puede eliminar un instrumento aprobado' : 'Eliminar'}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
