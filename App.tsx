import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Logo } from "./components/Logo";
import { Toasts } from "./components/Toasts";
import { Tutorial } from "./components/Tutorial";
import { useWorkspace } from "./hooks/useWorkspace";
import { Dashboard } from "./pages/Dashboard";
import { Editor } from "./pages/Editor";
import { useEditorStore } from "./store/useEditorStore";

function Studio() {
  const { ready, importing, open, create, importFiles, importFromDashboard, duplicate, rename, remove, removeAsset, saveNow } = useWorkspace();
  const view = useEditorStore((state) => state.view);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const state = useEditorStore.getState();
      if (state.view !== "editor" || !state.project || document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redo(); else state.undo();
      } else if (modifier && event.key.toLowerCase() === "y") { event.preventDefault(); state.redo(); }
      else if (modifier && event.key.toLowerCase() === "d") { event.preventDefault(); state.duplicateSelected(); }
      else if (modifier && event.key.toLowerCase() === "s") { event.preventDefault(); void saveNow(); }
      else if (event.code === "Space") { event.preventDefault(); if (state.project.clips.length) state.setPlaying(!state.isPlaying); }
      else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); state.deleteSelected(); }
      else if (event.key.toLowerCase() === "s" && !modifier && !event.altKey) { event.preventDefault(); state.splitSelected(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); state.setPlaying(false); state.setTime(state.currentTime - 1 / state.project.fps); }
      else if (event.key === "ArrowRight") { event.preventDefault(); state.setPlaying(false); state.setTime(state.currentTime + 1 / state.project.fps); }
    };
    const onDrag = (event: DragEvent) => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); };
    const onDrop = (event: DragEvent) => {
      if (event.defaultPrevented || !event.dataTransfer?.files.length) return;
      event.preventDefault();
      if (useEditorStore.getState().view === "dashboard") void importFromDashboard(event.dataTransfer.files);
      else void importFiles(event.dataTransfer.files, true);
    };
    const onVisibility = () => { if (document.hidden) useEditorStore.getState().setPlaying(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("dragover", onDrag);
    window.addEventListener("drop", onDrop);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dragover", onDrag);
      window.removeEventListener("drop", onDrop);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [importFiles, importFromDashboard, saveNow]);

  if (!ready) return <div className="startup-screen"><Logo /><LoaderCircle size={23} className="startup-spinner" /><span>Preparing your creative space</span></div>;

  return <>
    <AnimatePresence mode="wait">{view === "dashboard" ? <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}><Dashboard onCreate={create} onOpen={(project) => { void open(project); }} onImport={(files) => { void importFromDashboard(files); }} onDuplicate={(project) => { void duplicate(project); }} onRename={(project, name) => { void rename(project, name); }} onDelete={(project) => { void remove(project); }} onHelp={() => setHelpOpen(true)} /></motion.div> : <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}><Editor onImport={(files, addToTimeline) => { void importFiles(files, addToTimeline); }} onRemoveAsset={(id) => { void removeAsset(id); }} onSave={() => { void saveNow(); }} onHelp={() => setHelpOpen(true)} /></motion.div>}</AnimatePresence>
    <Toasts />
    {importing && <div className="import-status" role="status"><LoaderCircle size={16} /> {importing}</div>}
    <AnimatePresence>{helpOpen && <Tutorial onClose={() => setHelpOpen(false)} />}</AnimatePresence>
  </>;
}

export default function App() {
  return <MotionConfig reducedMotion="user"><ErrorBoundary><Studio /></ErrorBoundary></MotionConfig>;
}
