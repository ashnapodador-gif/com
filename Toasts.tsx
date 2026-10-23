import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, AlertCircle } from "lucide-react";
import { useEditorStore } from "../store/useEditorStore";

export function Toasts() {
  const toasts = useEditorStore((state) => state.toasts);
  const dismiss = useEditorStore((state) => state.dismissToast);
  return <div className="toast-stack" aria-live="polite"><AnimatePresence>{toasts.map((toast) => {
    const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
    return <motion.div key={toast.id} className={`toast toast-${toast.type}`} initial={{ opacity: 0, x: 18, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 18, scale: .96 }} transition={{ duration: .2 }} role={toast.type === "error" ? "alert" : "status"}>
      <Icon size={17} /><span>{toast.message}</span><button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={14} /></button>
    </motion.div>;
  })}</AnimatePresence></div>;
}