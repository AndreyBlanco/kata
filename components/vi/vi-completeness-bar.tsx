'use client'

type Props = {
  viSectionsComplete: number
  viTotalSections?: number
  capa2Done: number
  capa2Total: number
}

export function ViCompletenessBar({
  viSectionsComplete,
  viTotalSections = 11,
  capa2Done,
  capa2Total,
}: Props) {
  const viPct = Math.round((viSectionsComplete / viTotalSections) * 100)
  const capa2Pct = capa2Total > 0 ? Math.round((capa2Done / capa2Total) * 100) : 0

  return (
    <div className="space-y-2 rounded-lg border bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-gray-600">Completitud del expediente</p>
      <BarRow label={`VI · ${viSectionsComplete}/${viTotalSections} secciones`} pct={viPct} tone="blue" />
      <BarRow label={`Capa 2 · ${capa2Done}/${capa2Total} evidencias`} pct={capa2Pct} tone="teal" />
    </div>
  )
}

function BarRow({
  label,
  pct,
  tone,
}: {
  label: string
  pct: number
  tone: 'blue' | 'teal'
}) {
  const fill = tone === 'blue' ? 'bg-blue-500' : 'bg-teal-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
