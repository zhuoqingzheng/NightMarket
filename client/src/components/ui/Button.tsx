import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-stone-900 text-white shadow-[0_1px_2px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-stone-800 active:bg-stone-950',
  secondary: 'bg-white text-stone-800 shadow-xs ring-1 ring-inset ring-stone-200 hover:bg-stone-50 hover:ring-stone-300',
  ghost: 'text-stone-600 hover:bg-stone-900/5 hover:text-stone-900',
  danger: 'bg-white text-rose-600 shadow-xs ring-1 ring-inset ring-rose-200 hover:bg-rose-50 hover:ring-rose-300',
  'danger-solid': 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:bg-rose-800',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-[15px]',
};

interface ButtonStyleOptions {
  variant?: Variant;
  size?: Size;
  className?: string;
}

/** Button classes, for links and other elements that should look like a button. */
export function buttonStyles({ variant = 'primary', size = 'md', className }: ButtonStyleOptions = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lantern-500 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className: cn(loading ? 'cursor-wait' : 'disabled:opacity-45', className) })}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
