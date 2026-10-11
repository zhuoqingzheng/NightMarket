import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Never mind',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] overflow-hidden rounded-2xl bg-white p-0 text-stone-900 shadow-2xl ring-1 ring-stone-900/5 backdrop:bg-stone-950/40 backdrop:backdrop-blur-[2px] open:animate-dialog"
    >
      <div className="px-6 pb-5 pt-6">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-stone-600">{description}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-stone-100 bg-stone-50/70 px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger-solid" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
