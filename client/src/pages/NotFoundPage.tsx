import { Link } from 'react-router';
import { LanternMark } from '../components/Logo';
import { buttonStyles } from '../components/ui/Button';
import { useDocumentTitle } from '../lib/hooks';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex animate-rise flex-col items-center py-20 text-center sm:py-28">
      <LanternMark className="size-10 text-lantern-500" />
      <p className="mt-6 text-sm font-medium tabular-nums text-stone-400">404</p>
      <h1 className="mt-2 font-display text-5xl tracking-tight text-stone-900">This pitch is empty</h1>
      <p className="mt-3 max-w-sm text-balance text-[15px] leading-relaxed text-stone-500">
        We couldn’t find the page you were looking for. It may have moved, or the link might be wrong.
      </p>
      <Link to="/" className={buttonStyles({ className: 'mt-8' })}>
        Back to markets
      </Link>
    </div>
  );
}
