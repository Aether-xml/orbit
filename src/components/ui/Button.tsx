import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--accent)] text-[var(--text-inverse)] font-semibold',
    'hover:bg-[var(--accent-hover)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),

  outline: [
    'bg-transparent text-[var(--text-primary)] font-medium',
    'border border-[var(--border)]',
    'hover:bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),

  ghost: [
    'bg-transparent text-[var(--text-secondary)] font-medium',
    'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-[var(--error)] text-white font-semibold',
    'hover:opacity-90',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-[var(--radius-md)] gap-1.5',
  md: 'h-10 px-4 text-sm rounded-[var(--radius-md)] gap-2',
  lg: 'h-12 px-6 text-base rounded-[var(--radius-lg)] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center',
          'transition-all duration-[var(--transition)]',
          'select-none cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-[var(--accent)]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size} />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// İç spinner bileşeni
const spinnerSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 }

const LoadingSpinner = ({ size }: { size: ButtonSize }) => {
  const s = spinnerSize[size]
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}