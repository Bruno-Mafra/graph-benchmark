import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Overlay, Dialog, Title, Actions, Button } from "./styles";

type SimpleModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function SimpleModal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "Salvar",
  cancelLabel = "Cancelar",
}: SimpleModalProps) {
  if (!open) return null;

  return createPortal(
    <Overlay
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Dialog
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Title>{title}</Title>
        {children}
        <Actions>
          <Button type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" $primary onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Actions>
      </Dialog>
    </Overlay>,
    document.body
  );
}
