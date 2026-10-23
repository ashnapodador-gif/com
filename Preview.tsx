import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, Focus, Minus, Pause, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { formatTime, projectDuration, ratioDimensions } from "../editor/defaults";
import { TimelineRenderer, type HitBox } from "../editor/renderer";
import type { Transform } from "../editor/types";
import { useEditorStore } from "../store/useEditorStore";
import { IconButton } from "./Ui";

interface DragState { id: string; clientX: number; clientY: number; transform: Transform; }

export function Preview({ onImport }: { onImport: (files: FileList | File[], addToTimeline?: boolean) => void }) {
  const project = useEditorStore((state) => state.project);
  const urls = useEditorStore((state) => state.mediaUrls);
  const time = useEditorStore((state) => state.currentTime);
  const playing = useEditorStore((state) => state.isPlaying);
  const selectedId = useEditorStore((state) => state.selectedClipId);
  const guides = useEditorStore((state) => state.showGuides);
  const quality = useEditorStore((state) => state.previewQuality);
  const [muted, setMuted] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [stageSize, setStageSize] = useState({ width: 720, height: 390 });
  const [selectionBox, setSelectionBox] = useState<HitBox | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<TimelineRenderer | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const duration = project ? projectDuration(project) : 0;
  const dimensions = useMemo(() => project ? ratioDimensions(project.ratio, quality === "full" ? 1080 : 540) : [960, 540], [project?.ratio, quality]);
  const ratio = dimensions[0] / dimensions[1];
  const availableWidth = Math.max(100, stageSize.width - 64);
  const availableHeight = Math.max(100, stageSize.height - 42);
  const fittedWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayWidth = fittedWidth * zoom / 100;
  const displayHeight = displayWidth / ratio;

  const draw = useCallback((at: number) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const current = useEditorStore.getState().project;
    const safeTime = current ? Math.min(at, Math.max(0, projectDuration(current) - 0.001)) : at;
    const boxes = renderer.draw(ctx, safeTime, canvas.width, canvas.height);
    const box = boxes.find((item) => item.clipId === selectedRef.current) || null;
    setSelectionBox((old) => old?.clipId === box?.clipId && old?.x === box?.x && old?.y === box?.y && old?.width === box?.width && old?.height === box?.height ? old : box);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!project) return;
    rendererRef.current?.dispose();
    rendererRef.current = new TimelineRenderer(project, urls, () => draw(useEditorStore.getState().currentTime));
    draw(useEditorStore.getState().currentTime);
    return () => { rendererRef.current?.dispose(); rendererRef.current = null; };
  }, [project?.id, draw]);

  useEffect(() => {
    if (!project) return;
    rendererRef.current?.update(project, urls);
    const current = useEditorStore.getState();
    rendererRef.current?.sync(current.currentTime, current.isPlaying, false, muted);
    draw(current.currentTime);
    void document.fonts.ready.then(() => draw(useEditorStore.getState().currentTime));
  }, [project, urls, selectedId, dimensions[0], dimensions[1], muted, draw]);

  useEffect(() => {
    if (!playing) {
      rendererRef.current?.sync(time, false, false, muted);
      draw(time);
    }
  }, [time, playing, muted, draw]);

  useEffect(() => {
    if (!playing || !project) return;
    let frame = 0;
    const started = performance.now() - useEditorStore.getState().currentTime * 1000;
    rendererRef.current?.sync(useEditorStore.getState().currentTime, true, false, muted);
    const tick = () => {
      const activeProject = useEditorStore.getState().project;
      if (!activeProject) return;
      const end = projectDuration(activeProject);
      const next = (performance.now() - started) / 1000;
      if (next >= end) {
        rendererRef.current?.sync(end, false, false, muted);
        useEditorStore.getState().setTime(end);
        useEditorStore.getState().setPlaying(false);
        return;
      }
      rendererRef.current?.sync(next, true, false, muted);
      draw(next);
      useEditorStore.getState().setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      rendererRef.current?.sync(useEditorStore.getState().currentTime, false, false, muted);
    };
  }, [playing, project?.id, muted, draw]);

  const togglePlay = () => {
    if (!duration) return;
    if (!playing && time >= duration - .01) useEditorStore.getState().setTime(0);
    rendererRef.current?.sync(useEditorStore.getState().currentTime, !playing, false, muted);
    useEditorStore.getState().setPlaying(!playing);
  };

  const findBox = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    const renderer = rendererRef.current;
    if (!rect || !renderer) return null;
    const x = (event.clientX - rect.left) / rect.width * dimensions[0];
    const y = (event.clientY - rect.top) / rect.height * dimensions[1];
    return [...renderer.hitBoxes].reverse().find((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) || null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (editing || event.button !== 0) return;
    const hit = findBox(event);
    useEditorStore.getState().selectClip(hit?.clipId || null);
    if (!hit) return;
    const clip = useEditorStore.getState().project?.clips.find((item) => item.id === hit.clipId);
    if (!clip || useEditorStore.getState().project?.tracks.find((track) => track.id === clip.trackId)?.locked) return;
    useEditorStore.getState().beginTransaction();
    dragRef.current = { id: clip.id, clientX: event.clientX, clientY: event.clientY, transform: { ...clip.transform } };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    useEditorStore.getState().updateTransform(drag.id, {
      x: Math.max(-100, Math.min(200, drag.transform.x + (event.clientX - drag.clientX) / rect.width * 100)),
      y: Math.max(-100, Math.min(200, drag.transform.y + (event.clientY - drag.clientY) / rect.height * 100)),
    }, false);
  };

  const onPointerUp = () => {
    if (dragRef.current) useEditorStore.getState().endTransaction();
    dragRef.current = null;
  };

  const onDoubleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const hit = findBox(event);
    const clip = project?.clips.find((item) => item.id === hit?.clipId);
    if (clip?.kind === "text") {
      useEditorStore.getState().setPlaying(false);
      setEditing({ id: clip.id, value: clip.text || "" });
    }
  };

  const finishEditing = () => {
    if (editing) {
      const clip = useEditorStore.getState().project?.clips.find((item) => item.id === editing.id);
      if (clip && editing.value !== clip.text) useEditorStore.getState().updateClip(editing.id, { text: editing.value, name: editing.value.split("\n")[0].slice(0, 35) || "Text" });
    }
    setEditing(null);
  };

  if (!project) return null;
  const editingClip = project.clips.find((clip) => clip.id === editing?.id);
  return (
    <section className="preview-pane" aria-label="Video preview">
      <div className="preview-header"><div className="preview-header-title"><span className="live-dot" />Preview <span className="preview-divider">/</span><span className="preview-meta">{project.ratio} frame</span></div><div className="preview-header-right"><span>{quality === "full" ? "Full resolution" : "Optimized preview"}</span><span className="preview-header-separator" /><span>{project.fps} fps</span></div></div>
      <div className="preview-stage" ref={stageRef} onWheel={(event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom((value) => Math.max(50, Math.min(200, value + (event.deltaY > 0 ? -10 : 10)))); } }}>
        <div ref={frameRef} className="preview-frame" style={{ width: displayWidth, height: displayHeight }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={onDoubleClick}>
          <canvas ref={canvasRef} width={dimensions[0]} height={dimensions[1]} aria-label="Edited video canvas" />
          {guides && <div className="safe-guide"><div className="safe-guide-inner" /></div>}
          {selectionBox && !editing && <div className="canvas-selection" style={{ left: `${selectionBox.x / dimensions[0] * 100}%`, top: `${selectionBox.y / dimensions[1] * 100}%`, width: `${selectionBox.width / dimensions[0] * 100}%`, height: `${selectionBox.height / dimensions[1] * 100}%` }}><i /><i /><i /><i /></div>}
          {editing && editingClip && selectionBox && <textarea autoFocus aria-label="Edit text on preview" className="canvas-text-editor" value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} onBlur={finishEditing} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing(null); } }} style={{ left: `${selectionBox.x / dimensions[0] * 100}%`, top: `${selectionBox.y / dimensions[1] * 100}%`, width: `${Math.max(23, selectionBox.width / dimensions[0] * 100)}%`, minHeight: `${selectionBox.height / dimensions[1] * 100}%`, fontSize: `${editingClip.textStyle?.fontSize ? editingClip.textStyle.fontSize * displayWidth / 960 * editingClip.transform.scale / 100 : 24}px`, color: editingClip.textStyle?.color }} />}
          {!project.clips.length && <div className="empty-preview"><div className="empty-preview-mark">N</div><h3>Your canvas is ready</h3><p>Bring in a video, image, or sound to begin.</p><button className="secondary-button" onClick={() => fileRef.current?.click()}>Import media</button><input ref={fileRef} type="file" accept="video/*,image/*,audio/*,.mov,.m4v" multiple hidden onChange={(event) => { if (event.target.files) onImport(event.target.files, true); event.target.value = ""; }} /></div>}
        </div>
      </div>
      <div className="preview-controls">
        <div className="preview-time"><strong>{formatTime(time, true, project.fps)}</strong><span>/</span><span>{formatTime(duration, true, project.fps)}</span></div>
        <div className="transport-controls"><IconButton icon={ChevronLeft} label="Previous frame (Left arrow)" onClick={() => { useEditorStore.getState().setPlaying(false); useEditorStore.getState().setTime(time - 1 / project.fps); }} /><button className="play-button" onClick={togglePlay} aria-label={playing ? "Pause playback" : "Play video"} title="Play or pause (Space)">{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><IconButton icon={ChevronRight} label="Next frame (Right arrow)" onClick={() => { useEditorStore.getState().setPlaying(false); useEditorStore.getState().setTime(time + 1 / project.fps); }} /></div>
        <div className="preview-actions"><IconButton icon={muted ? VolumeX : Volume2} label={muted ? "Unmute preview" : "Mute preview"} onClick={() => setMuted(!muted)} active={muted} /><span className="control-separator" /><IconButton icon={Minus} label="Zoom out preview" onClick={() => setZoom((value) => Math.max(50, value - 10))} disabled={zoom <= 50} /><button className="zoom-value" onClick={() => setZoom(100)} title="Fit preview to window">{zoom === 100 ? "Fit" : `${zoom}%`}</button><IconButton icon={Plus} label="Zoom in preview" onClick={() => setZoom((value) => Math.min(200, value + 10))} disabled={zoom >= 200} /><IconButton icon={Focus} label="Toggle safe area guides" onClick={() => useEditorStore.getState().toggleGuides()} active={guides} /><IconButton icon={Expand} label="Fullscreen preview" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void stageRef.current?.requestFullscreen(); }} /></div>
      </div>
    </section>
  );
}