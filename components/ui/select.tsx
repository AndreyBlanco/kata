import { cn } from '@/lib/cn'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
        'focus:border-kata-primary focus:outline-none focus:ring-2 focus:ring-kata-primary/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
