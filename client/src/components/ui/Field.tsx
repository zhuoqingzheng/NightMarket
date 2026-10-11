import { CircleAlert } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function InputField({ label, hint, className, id, ...props }: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-[13px] font-medium text-stone-700">
          {label}
        </label>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
      <input
        id={inputId}
        className="block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-[15px] text-stone-900 shadow-xs ring-1 ring-inset ring-stone-200 outline-none transition-shadow placeholder:text-stone-400 hover:ring-stone-300 focus:ring-2 focus:ring-stone-900"
        {...props}
      />
    </div>
  );
}

interface FormErrorProps {
  children: ReactNode;
}

export function FormError({ children }: FormErrorProps) {
  return (
    <div
      role="alert"
      className="flex animate-rise items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3 text-[13px] leading-snug text-rose-700 ring-1 ring-inset ring-rose-200/70"
    >
      <CircleAlert className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
