import { ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  wide?: boolean;
  structured?: boolean;
  label?: string;
  children: ReactNode;
}

interface ModalContentProps {
  header?: ReactNode;
  footer?: ReactNode;
  scrollKey?: string;
  children: ReactNode;
}

export function ModalContent({
  header,
  footer,
  scrollKey,
  children,
}: ModalContentProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const headerElement = useRef<HTMLElement>(null);
  const [headerFits, setHeaderFits] = useState(false);
  const hasHeader = Boolean(header);

  useLayoutEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTop = 0;
    }
  }, [scrollKey]);

  useLayoutEffect(() => {
    const scroller = viewport.current;
    const heading = headerElement.current;
    if (!scroller || !heading) {
      return;
    }

    // A tall title needs to scroll so users can still reach the body.
    const measureHeader = () => {
      const availableHeight = scroller.clientHeight;
      setHeaderFits(
        availableHeight > 0 && heading.offsetHeight <= availableHeight / 2,
      );
    };
    measureHeader();
    const observer = new ResizeObserver(measureHeader);
    observer.observe(heading);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [hasHeader]);

  return (
    <div
      ref={viewport}
      className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-visible"
    >
      {header && (
        <header
          ref={headerElement}
          className={`top-0 z-10 border-b border-gray-200 bg-white px-4 pt-5 pb-3 sm:px-6 [&_h2]:pr-8 ${
            headerFits ? "[@media(min-height:34rem)]:sticky" : ""
          }`}
        >
          {header}
        </header>
      )}
      <div
        className={
          header
            ? "p-4 sm:p-6"
            : "px-4 pt-5 pb-4 sm:p-6 [&_h2:first-child]:pr-8"
        }
      >
        {children}
      </div>
      {footer && (
        <footer className="bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 [@media(min-height:34rem)]:sticky">
          {footer}
        </footer>
      )}
    </div>
  );
}

const MODAL_STACK_CHANGE = "bindizr-modal-stack-change";
const openModals: HTMLDialogElement[] = [];

export function subscribeToModalStack(listener: () => void) {
  document.addEventListener(MODAL_STACK_CHANGE, listener);
  return () => document.removeEventListener(MODAL_STACK_CHANGE, listener);
}

function topModal() {
  return openModals[openModals.length - 1];
}

export function getModalToastTarget() {
  return topModal()?.querySelector("[data-modal-toasts]") ?? null;
}

export default function Modal({
  isOpen,
  onClose,
  wide = false,
  structured = false,
  label,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) {
      return;
    }

    const heading = dialog.querySelector("h2");
    if (heading && !label) {
      heading.id ||= titleId;
      dialog.setAttribute("aria-labelledby", heading.id);
    } else {
      dialog.removeAttribute("aria-labelledby");
    }
  });

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) {
      return;
    }

    const opener = document.activeElement;
    dialog.showModal();
    openModals.push(dialog);
    document.dispatchEvent(new Event(MODAL_STACK_CHANGE));

    return () => {
      const wasTopmost = topModal() === dialog;
      openModals.splice(openModals.indexOf(dialog), 1);
      dialog.close();
      if (wasTopmost) {
        if (opener instanceof HTMLElement && opener.isConnected) {
          opener.focus({ preventScroll: true });
        }
        if (document.activeElement === document.body) {
          topModal()
            ?.querySelector<HTMLElement>("[data-modal-close]")
            ?.focus({ preventScroll: true });
        }
      }
      document.dispatchEvent(new Event(MODAL_STACK_CHANGE));
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <dialog
      ref={ref}
      data-modal
      aria-label={label ?? "Dialog"}
      aria-modal="true"
      className={`m-auto w-[calc(100%_-_2rem)] overflow-visible bg-transparent p-0 backdrop:bg-black/50 [&:has(~dialog[data-modal][open])::backdrop]:bg-transparent ${
        wide ? "max-w-3xl" : "max-w-lg"
      }`}
      onCancel={(event) => {
        if (event.currentTarget === event.target) {
          event.preventDefault();
          onClose();
        }
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.currentTarget === event.target;
      }}
      onPointerCancel={() => {
        backdropPress.current = false;
      }}
      onClick={(event) => {
        if (backdropPress.current && event.currentTarget === event.target) {
          onClose();
        }
        backdropPress.current = false;
      }}
    >
      <div className="@container flex max-h-[calc(100dvh_-_2rem)] min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
        <button
          data-modal-close
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="absolute top-2 right-2 z-20 flex size-9 items-center justify-center rounded-md bg-white text-2xl text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          &times;
        </button>
        {structured ? children : <ModalContent>{children}</ModalContent>}
      </div>
      <div data-modal-toasts />
    </dialog>,
    document.body,
  );
}
