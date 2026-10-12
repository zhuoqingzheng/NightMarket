import { cn } from '../helpers/cn';

const TONES = [
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-lantern-100 text-lantern-800',
];

interface AvatarProps {
  /** Initials and colour both come from the name. */
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  const initials =
    name
      .split(/\s+/)
      .filter((word) => /^[\p{L}\p{N}]/u.test(word))
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '?';

  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5',
        TONES[hash % TONES.length],
        className,
      )}
    >
      {initials}
    </span>
  );
}
