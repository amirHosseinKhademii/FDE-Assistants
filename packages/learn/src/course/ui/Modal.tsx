import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A native dialog. showModal() gives focus trapping, Escape handling and an
 * inert page behind it. This component adds a backdrop-click close, a close
 * button, and a scroll lock on the page while it is open.
 */
export function Modal({
  open,
  onClose,
  label,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="course-modal"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="course-modal-inner">
        <div className="course-modal-head">
          <span className="course-modal-title">{title}</span>
          <button type="button" className="course-modal-x" aria-label="Close" onClick={() => ref.current?.close()}>
            ✕
          </button>
        </div>
        <div className="course-modal-body">{open ? children : null}</div>
      </div>
    </dialog>
  );
}
