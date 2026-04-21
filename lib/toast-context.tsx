import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { ToastContainer, type ToastMessage } from "@/components/Toast";

interface ToastContextValue {
  showToast: (text: string, type?: ToastMessage["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (text: string, type: ToastMessage["type"] = "success", duration = 3500) => {
      const id = `toast-${++nextId}`;
      setToasts((prev) => [...prev, { id, text, type, duration }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
