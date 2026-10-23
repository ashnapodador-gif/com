import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, CircleHelp, CloudOff, Download, LayoutGrid, Menu, PanelRight, Redo2, Save, Sparkles, Undo2, X } from "lucide-react";
import { ExportDialog } from "../components/ExportDialog";
import { Logo } from "../components/Logo";
import { Preview } from "../components/Preview";
import { PropertiesPanel } from "../components/PropertiesPanel";
import { ToolPanel } from "../components/ToolPanel";
import { IconButton } from "../components/Ui";
import { Timeline } from "../timeline/Timeline";
import { useEditorStore } from "../store/useEditorStore";

export function Editor({ onImport, onRemoveAsset, onSave, onHelp }: {
  onImport: (files: FileList | File[], addToTimeline?: boolean) => void;
  onRemoveAsset: (id: string) => void;
  onSave: () => void;
  onHelp: () => void;
}) {
  const project = useEditorStore((state) => state.project);
  const status = useEditorStore((state) => state.saveStatus);
  const history = useEditorStore((state) => state.history);
  const future = useEditorStore((state) => state.future);
  const quality = useEditorStore((state) => state.previewQuality);
  const [name, setName] = useState(project?.name || "");
  const [exportOpen, setExportOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(() => !localStorage.getItem("nexora-tour-seen"));
  useEffect(() => setName(project?.name || ""), [project?.id, project?.name]);
  if (!project) return null;

  const saveName = () => {
    if (name.trim() && name.trim() !== project.name) useEditorStore.getState().renameProject(name);
    else setName(project.name);
  };
  return <motion.div className="editor-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .3 }}>
    <header className="editor-topbar">
      <button className="editor-brand-button" title="Back to projects" aria-label="Go to projects" onClick={() => useEditorStore.getState().setView("dashboard")}><Logo /></button>
      <div className="topbar-divider" />
      <IconButton icon={LayoutGrid} label="All projects" onClick={() => useEditorStore.getState().setView("dashboard")} className="topbar-projects-button" />
      <div className="project-title-area"><div className="project-name-line"><input value={name} onChange={(event) => setName(event.target.value)} onBlur={saveName} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setName(project.name); event.currentTarget.blur(); } }} aria-label="Project name" title="Click to rename project" maxLength={80} /><ChevronDown size={13} /></div><span className={`save-indicator ${status}`} title={status === "saved" ? "Saved to this device" : status === "saving" ? "Saving locally" : "Unable to save"}>{status === "saved" ? <Check size={12} /> : status === "error" ? <CloudOff size={12} /> : <span className="saving-dot" />}{status === "saved" ? "Saved locally" : status === "saving" ? "Saving changes" : "Save failed"}</span></div>
      {showNudge && <button className="topbar-tour" onClick={() => { setShowNudge(false); onHelp(); }}><Sparkles size={14} /> New here? <span>Take the tour</span></button>}
      <div className="topbar-middle"><IconButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => useEditorStore.getState().undo()} disabled={!history.length} /><IconButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={() => useEditorStore.getState().redo()} disabled={!future.length} /><span className="control-separator" /><IconButton icon={Save} label="Save now (Ctrl+S)" onClick={onSave} /></div>
      <div className="topbar-right"><label className="toolbar-select" title="Project aspect ratio"><span>RATIO</span><select aria-label="Aspect ratio" value={project.ratio} onChange={(event) => useEditorStore.getState().setRatio(event.target.value as typeof project.ratio)}><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:5">4:5</option></select></label><label className="toolbar-select quality-select" title="Preview quality"><span>PREVIEW</span><select aria-label="Preview quality" value={quality} onChange={(event) => useEditorStore.getState().setPreviewQuality(event.target.value as "auto" | "full")}><option value="auto">Auto</option><option value="full">Full</option></select></label><IconButton icon={CircleHelp} label="Tour and keyboard shortcuts" onClick={onHelp} className="topbar-help" /><IconButton icon={Menu} label={toolsOpen ? "Close tools" : "Open tools"} onClick={() => setToolsOpen(!toolsOpen)} className="mobile-tool-toggle" /><IconButton icon={PanelRight} label={inspectorOpen ? "Close properties" : "Open properties"} onClick={() => setInspectorOpen(!inspectorOpen)} className="mobile-inspector-toggle" /><button className="export-button" onClick={() => setExportOpen(true)}><Download size={16} /> <span>Export</span></button></div>
    </header>
    <div className={`editor-workspace ${toolsOpen ? "tools-open" : ""} ${inspectorOpen ? "inspector-open" : ""}`} onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={(event) => { if (!event.defaultPrevented && event.dataTransfer.files.length) { event.preventDefault(); onImport(event.dataTransfer.files, true); } }}>
      <ToolPanel onImport={onImport} onRemoveAsset={onRemoveAsset} onActivate={() => setToolsOpen(true)} />
      <Preview onImport={onImport} />
      <div className="inspector-wrap"><button className="mobile-inspector-close" onClick={() => setInspectorOpen(false)} aria-label="Close properties"><X size={16} /></button><PropertiesPanel /></div>
    </div>
    <Timeline onImport={onImport} />
    <AnimatePresence>{exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}</AnimatePresence>
  </motion.div>;
}