import { CloudOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../helpers/cn';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-5 text-stone-400" />
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-soft ring-1 ring-stone-200/70',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">{icon}</div>
      <h2 className="mt-5 text-base font-semibold text-stone-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-balance text-sm leading-relaxed text-stone-500">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  /** Shows a "Try again" button when provided. */
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={<CloudOff className="size-5" />}
      title={title}
      message={message}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
