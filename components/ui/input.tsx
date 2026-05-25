import { cn } from '@/lib/cn'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900',
        'focus:border-kata-primary focus:outline-none focus:ring-2 focus:ring-kata-primary/20',
        className,
      )}
      {...props}
    />
  )
}
