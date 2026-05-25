import Link from 'next/link'
import { cn } from '@/lib/cn'

type PageHeaderProps = {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = '← Volver',
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={cn('border-b bg-white px-4 py-4', className)}>
      <div className="mx-auto w-full max-w-lg">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-block text-sm text-kata-primary hover:underline"
          >
            {backLabel}
          </Link>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </header>
  )
}
