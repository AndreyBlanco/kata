import { cn } from '@/lib/cn'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900',
        'focus:border-kata-primary focus:outline-none focus:ring-2 focus:ring-kata-primary/20',
        className,
      )}
      {...props}
    />
  )
}
