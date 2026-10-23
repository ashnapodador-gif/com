import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Film, HardDrive, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { formatTime, projectDuration, ratioDimensions } from "../editor/defaults";
import { renderProject, type ExportFormat, type ExportProgress, type ExportResolution, type ExportResult } from "../export/renderProject";
import { useEditorStore } from "../store/useEditorStore";
import { Modal } from "./Ui";

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditorStore((state) => state.project);
  const urls = useEditorStore((state) => state.mediaUrls);
  const [resolution, setResolution] = useState<ExportResolution>(720);
  const [fps, setFps] = useState(project?.fps || 30);
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [status, setStatus] = useState<"configure" | "working" | "done" | "error">("configure");
  const [progress, setProgress] = useState<ExportProgress>({ phase: "Preparing", progress: null });
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const downloadUrl = useRef<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => () => { controller.current?.abort(); if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current); }, []);
  if (!project) return null;
  const duration = projectDuration(project);
  const [width, height] = ratioDimensions(project.ratio, resolution);
  const filename = `${project.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "nexora-video"}.${result?.format || format}`;

  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setStatus("configure");
    useEditorStore.getState().notify("Export canceled. No file was saved.", "info");
  };

  const close = () => { if (status === "working") cancel(); onClose(); };

  const start = async () => {
    if (!project.clips.length) { setError("Add something to your timeline before exporting."); setStatus("error"); return; }
    const abortController = new AbortController();
    controller.current = abortController;
    useEditorStore.getState().setPlaying(false);
    setError(""); setResult(null); setStatus("working");
    try {
      const output = await renderProject({ project: structuredClone(project), urls: { ...urls }, resolution, fps, format, signal: abortController.signal, onProgress: setProgress });
      if (abortController.signal.aborted) return;
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = URL.createObjectURL(output.blob);
      setUrl(downloadUrl.current);
      setResult(output);
      setStatus("done");
      useEditorStore.getState().notify(`${output.format.toUpperCase()} video rendered and ready to download.`, "success");
    } catch (cause) {
      if (abortController.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Export failed. Try WebM at 720p in a supported browser.");
      setStatus("error");
    } finally { if (controller.current === abortController) controller.current = null; }
  };

  return <Modal title={status === "done" ? "Your video is ready" : "Export video"} onClose={close} className="export-modal">
    {status === "configure" && <div className="export-content">
      <div className="export-project"><div className="export-poster" style={project.thumbnail ? { backgroundImage: `url("${project.thumbnail}")` } : undefined}><Film size={26} /></div><div><strong>{project.name}</strong><span>{formatTime(duration)} duration <i /> {project.ratio} canvas</span></div></div>
      <div className="export-form"><div className="export-form-label">FILE FORMAT</div><div className="export-format-options"><button className={format === "mp4" ? "active" : ""} onClick={() => setFormat("mp4")}><span><strong>MP4</strong><small>Universal sharing</small></span>{format === "mp4" && <span className="radio-selected" />}</button><button className={format === "webm" ? "active" : ""} onClick={() => setFormat("webm")}><span><strong>WebM</strong><small>Fast browser export</small></span>{format === "webm" && <span className="radio-selected" />}</button></div>
        <div className="export-fields"><label><span>Resolution</span><select value={resolution} onChange={(event) => setResolution(Number(event.target.value) as ExportResolution)}><option value="720">720p / Recommended</option><option value="1080">1080p / High quality</option><option value="2160">4K / Experimental</option></select></label><label><span>Frame rate</span><select value={fps} onChange={(event) => setFps(Number(event.target.value))}><option value="24">24 fps</option><option value="30">30 fps</option><option value="60">60 fps</option></select></label></div>
      </div>
      <div className="export-details"><div><span>Output size</span><strong>{width} x {height}</strong></div><div><span>Timeline</span><strong>{formatTime(duration, true, fps)}</strong></div></div>
      <div className="export-privacy"><ShieldCheck size={17} /><span>Your source files stay on your device. Rendering happens in this browser.</span></div>
      {format === "mp4" && <p className="export-footnote">If native MP4 recording is unavailable, MP4 conversion downloads an encoder on first use (internet required). If conversion fails, your edited WebM remains downloadable.</p>}
      {resolution === 2160 && <p className="export-footnote warning">4K needs substantial memory and a powerful computer. Try 720p if your browser runs out of resources.</p>}
      <button className="primary-button export-submit" onClick={() => void start()}><Sparkles size={17} /> Start export</button>
    </div>}
    {status === "working" && <div className="export-working"><div className="export-progress-icon"><LoaderCircle size={31} /></div><h3>Creating your video</h3><p>{progress.phase}</p><div className={`export-progress-track ${progress.progress === null ? "indeterminate" : ""}`}><span style={{ width: progress.progress === null ? undefined : `${Math.round(progress.progress * 100)}%` }} /></div><div className="export-progress-meta"><span>{progress.progress === null ? "Processing..." : `${Math.round(progress.progress * 100)}% recorded`}</span><span>{progress.progress === null ? "" : `${formatTime(duration * progress.progress)} / ${formatTime(duration)}`}</span></div><div className="export-working-note"><HardDrive size={15} /> Keep this tab open. Export runs in real time.</div><button className="secondary-button export-cancel" onClick={cancel}>Cancel export</button></div>}
    {status === "done" && result && <div className="export-done"><div className="export-success-icon"><CheckCircle2 size={34} /></div><h3>Ready for its debut.</h3><p>Your edited timeline has been rendered to a real {result.format.toUpperCase()} video file.</p>{result.warning && <div className="export-fallback"><AlertCircle size={17} /><span>{result.warning}</span></div>}<div className="export-file-row"><Film size={20} /><div><strong>{filename}</strong><span>{(result.blob.size / 1024 / 1024).toFixed(1)} MB / {width} x {height}</span></div></div><a className="primary-button export-submit" href={url} download={filename}><Download size={17} /> Download {result.format.toUpperCase()}</a><button className="text-button" onClick={() => setStatus("configure")}><ArrowLeft size={15} /> Export with different settings</button></div>}
    {status === "error" && <div className="export-error"><AlertCircle size={34} /><h3>Export couldn't finish</h3><p>{error}</p><button className="secondary-button" onClick={() => setStatus("configure")}>Try different settings</button></div>}
  </Modal>;
}