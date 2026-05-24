import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onRightIconClick?: () => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconClick,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-11 bg-[var(--bg-surface)]',
              'border border-[var(--border)] rounded-[var(--radius-md)]',
              'text-[var(--text-primary)] text-sm',
              'placeholder:text-[var(--text-muted)]',
              'transition-colors duration-[var(--transition)]',
              'outline-none',
              'focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]',
              error && 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              !leftIcon && 'pl-3',
              !rightIcon && 'pr-3',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {rightIcon}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea varyantı
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  charCount?: number
  maxChars?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, charCount, maxChars, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const isOverLimit = maxChars !== undefined && charCount !== undefined && charCount > maxChars

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[var(--bg-surface)]',
            'border border-[var(--border)] rounded-[var(--radius-md)]',
            'text-[var(--text-primary)] text-sm',
            'placeholder:text-[var(--text-muted)]',
            'p-3 resize-none',
            'transition-colors duration-[var(--transition)]',
            'outline-none',
            'focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]',
            error && 'border-[var(--error)]',
            isOverLimit && 'border-[var(--error)]',
            className
          )}
          {...props}
        />

        <div className="flex items-center justify-between">
          <div>
            {error && <p className="text-xs text-[var(--error)]">{error}</p>}
            {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
          </div>
          {maxChars !== undefined && charCount !== undefined && (
            <span
              className={cn(
                'text-xs tabular-nums',
                isOverLimit
                  ? 'text-[var(--error)]'
                  : charCount > maxChars * 0.9
                  ? 'text-[var(--warning)]'
                  : 'text-[var(--text-muted)]'
              )}
            >
              {charCount}/{maxChars}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'