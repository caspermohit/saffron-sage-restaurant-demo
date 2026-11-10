"use client";
import { Sprout, X, LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Sprout size={25} />
      </span>
      <span>
        Saffron <i>&</i> Sage<small>THE RESTAURANT WORKSPACE</small>
      </span>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Busy() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Setting the table…
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <Sprout size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
