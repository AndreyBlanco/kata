import { cn } from '@/lib/cn'

type CardProps = {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md'
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        padding === 'sm' ? 'p-3' : 'p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
