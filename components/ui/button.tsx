import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-kata-primary text-white hover:bg-kata-primary-dark focus-visible:outline-kata-primary',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:outline-gray-400',
  ghost:
    'bg-transparent text-kata-primary hover:bg-kata-primary/10 focus-visible:outline-kata-primary',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
}

export function Button({
  children,
  className,
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium',
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
