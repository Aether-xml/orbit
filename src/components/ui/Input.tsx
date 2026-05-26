import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconClick?: () => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, onRightIconClick, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-text-secondary text-sm">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-bg-surface border rounded-lg py-2.5 text-text-primary text-sm',
              'placeholder:text-text-muted transition-default',
              'focus:border-accent focus:outline-none',
              error ? 'border-error' : 'border-line',
              leftIcon  ? 'pl-9'  : 'pl-4',
              rightIcon ? 'pr-9'  : 'pr-4',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              tabIndex={onRightIconClick ? 0 : -1}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-default',
                onRightIconClick ? 'hover:text-text-secondary cursor-pointer' : 'cursor-default pointer-events-none'
              )}
            >
              {rightIcon}
            </button>
          )}
        </div>

        {error && <p className="text-error text-xs">{error}</p>}
        {!error && hint && <p className="text-text-muted text-xs">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
