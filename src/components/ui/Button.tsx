import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-text-inverse font-semibold',
  outline: 'border border-line bg-bg-surface hover:bg-bg-elevated text-text-primary',
  ghost:   'hover:bg-bg-elevated text-text-secondary hover:text-text-primary',
  danger:  'bg-error/10 hover:bg-error/20 text-error border border-error/20',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
  md: 'text-sm px-4 py-2   rounded-lg gap-2',
  lg: 'text-sm px-5 py-3   rounded-lg gap-2',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center transition-default select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base focus-visible:outline-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
