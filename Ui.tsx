import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import { useEditorStore } from "../store/useEditorStore";

export function IconButton({ icon: Icon, label, onClick, disabled, active, className = "" }: {
  icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; active?: boolean; className?: string;
}) {
  return <button type="button" className={`icon-button ${active ? "is-active" : ""} ${className}`} onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active}>{<Icon size={17} strokeWidth={1.85} />}</button>;
}

export function Modal({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section role="dialog" aria-modal="true" aria-label={title} className={`modal-surface ${className}`} initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} transition={{ duration: .22, ease: [0.2, 0.8, 0.2, 1] }}>
        <div className="modal-heading"><h2>{title}</h2><IconButton icon={X} label="Close dialog" onClick={onClose} /></div>
        {children}
      </motion.section>
    </motion.div>
  );
}

export function RangeField({ label, value, min, max, step = 1, unit = "", onChange, disabled = false }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void; disabled?: boolean;
}) {
  const percent = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
  return (
    <label className={`range-field ${disabled ? "is-disabled" : ""}`}>
      <span className="field-label-row"><span>{label}</span><span className="field-value">{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</span></span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} disabled={disabled} style={{ "--range-fill": `${percent}%` } as React.CSSProperties}
        onPointerDown={() => useEditorStore.getState().beginTransaction()}
        onPointerUp={() => useEditorStore.getState().endTransaction()}
        onPointerCancel={() => useEditorStore.getState().endTransaction()}
        onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function NumericField({ label, value, min, max, step = 1, unit, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string; onChange: (value: number) => void;
}) {
  return <label className="numeric-field"><span>{label}</span><span className="numeric-input-wrap"><input type="number" value={Number.isInteger(value) ? value : Number(value.toFixed(2))} min={min} max={max} step={step} onChange={(event) => {
    const next = Number(event.target.value);
    if (!Number.isNaN(next) && (min === undefined || next >= min) && (max === undefined || next <= max)) onChange(next);
  }} />{unit && <span>{unit}</span>}</span></label>;
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#101116";
  return <label className="color-field"><span>{label}</span><span className="color-field-control"><input type="color" value={safe} onChange={(event) => onChange(event.target.value)} aria-label={`${label} color`} /><span>{value}</span></span></label>;
}