import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import Notice, { NoticeTone } from "@/components/Notice";

interface Toast {
  id: number;
  tone: NoticeTone;
  text: string;
}

export interface ToastApi {
  show: (tone: NoticeTone, text: string) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  warning: (text: string) => void;
  info: (text: string) => void;
}

/** Errors stay longer: they are read, not glanced at. */
const DURATION_MS: Record<NoticeTone, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 8000,
};

const ToastContext = createContext<ToastApi | null>(null);

/** Transient feedback, stacked top-center above everything else. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: NoticeTone, text: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, text }]);
      window.setTimeout(() => dismiss(id), DURATION_MS[tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (text) => show("success", text),
      error: (text) => show("error", text),
      warning: (text) => show("warning", text),
      info: (text) => show("info", text),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Above the modal; clicks pass through the empty column. */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className="toast-enter pointer-events-auto w-full max-w-md cursor-pointer"
          >
            <Notice tone={toast.tone} className="shadow-lg">
              {toast.text}
            </Notice>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast needs a ToastProvider");
  }
  return toast;
}
