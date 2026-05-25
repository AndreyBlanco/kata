'use client'

type Props = {
  title: string
  hasContent: boolean
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: React.ReactNode
}

export function SectionCard({
  title,
  hasContent,
  isOpen,
  onToggle,
  children,
  badge,
}: Props) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {hasContent ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
          ) : (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-gray-300" />
          )}
          <h3 className="text-left text-sm font-semibold text-gray-900">{title}</h3>
          {badge}
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-gray-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}
