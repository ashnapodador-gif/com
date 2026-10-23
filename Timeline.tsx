import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AudioLines, Captions, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Film, Image as ImageIcon, LockKeyhole, Magnet, Music2, Plus, Scissors, Trash2, Type, UnlockKeyhole, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react";
import { formatTime, projectDuration } from "../editor/defaults";
import type { Clip, Project, Track } from "../editor/types";
import { useEditorStore } from "../store/useEditorStore";
import { IconButton } from "../components/Ui";

type Gesture = { mode: "move" | "trim-left" | "trim-right" | "playhead"; clip?: Clip; startX: number; startTime: number; moved: boolean };

const rowHeight = (kind: Track["kind"]) => kind === "video" ? 64 : kind === "audio" ? 56 : 54;

function compatible(clip: Clip, track: Track): boolean {
  if (track.locked) return false;
  if (clip.kind === "audio") return track.kind === "audio";
  if (clip.kind === "text") return track.kind === "text";
  if (clip.kind === "sticker") return track.kind === "overlay" || track.kind === "text";
  return track.kind === "video" || track.kind === "overlay";
}

function snapValue(value: number, project: Project, clipId: string, playhead: number, zoom: number, enabled: boolean): number {
  if (!enabled) return value;
  const points = [0, playhead, ...project.clips.filter((clip) => clip.id !== clipId).flatMap((clip) => [clip.start, clip.start + clip.duration])];
  const nearest = points.reduce((best, point) => Math.abs(point - value) < Math.abs(best - value) ? point : best, points[0]);
  return Math.abs(nearest - value) <= 8 / zoom ? nearest : value;
}

function ClipBlock({ clip, project, zoom, selected, onGesture, onContext }: {
  clip: Clip; project: Project; zoom: number; selected: boolean;
  onGesture: (event: ReactPointerEvent<HTMLElement>, clip: Clip, mode: Gesture["mode"]) => void;
  onContext: (event: React.MouseEvent<HTMLDivElement>, clip: Clip) => void;
}) {
  const asset = project.assets.find((item) => item.id === clip.assetId);
  const width = clip.duration * zoom;
  const wave = asset?.waveform;
  const sourceEnd = clip.sourceStart + clip.duration * clip.speed;
  const visibleWave = wave?.slice(Math.floor(clip.sourceStart / asset!.duration * wave.length), Math.ceil(sourceEnd / asset!.duration * wave.length));
  const thumbCount = Math.min(16, Math.ceil(width / 68));
  const isVisual = clip.kind === "image" || clip.kind === "video";
  const typeIcon = clip.kind === "audio" ? <Music2 size={13} /> : clip.kind === "text" ? <Type size={13} /> : clip.kind === "image" ? <ImageIcon size={13} /> : clip.kind === "background" ? <span className="clip-color-dot" style={{ backgroundColor: clip.color }} /> : clip.kind === "sticker" ? <Plus size={13} /> : <Film size={13} />;
  return <div role="button" tabIndex={0} aria-label={`${clip.name}, ${formatTime(clip.start)} to ${formatTime(clip.start + clip.duration)}`} aria-pressed={selected} className={`timeline-clip clip-${clip.kind} ${selected ? "selected" : ""}`} style={{ left: clip.start * zoom, width, backgroundColor: clip.kind === "background" ? clip.color : undefined }}
    onPointerDown={(event) => onGesture(event, clip, "move")}
    onContextMenu={(event) => onContext(event, clip)}
    onKeyDown={(event) => { if (event.key === "Enter") useEditorStore.getState().selectClip(clip.id); }}>
    {isVisual && <div className="clip-thumbnails">{Array.from({ length: thumbCount }, (_, index) => <span key={index} style={asset?.thumbnail ? { backgroundImage: `url("${asset.thumbnail}")` } : undefined} />)}</div>}
    {clip.kind === "audio" && visibleWave?.length ? <div className="clip-waveform" aria-hidden="true">{visibleWave.map((peak, index) => <i key={index} style={{ height: `${Math.max(12, peak * 85)}%` }} />)}</div> : null}
    <div className="clip-content"><span className="clip-type-icon">{typeIcon}</span><span className="clip-name">{clip.name}</span></div>
    {clip.kind === "audio" && !wave && <span className="waveform-absent" title="Waveform unavailable for this file">Audio clip</span>}
    <span className="clip-handle clip-handle-left" onPointerDown={(event) => { event.stopPropagation(); onGesture(event, clip, "trim-left"); }} title="Drag to trim start" />
    <span className="clip-handle clip-handle-right" onPointerDown={(event) => { event.stopPropagation(); onGesture(event, clip, "trim-right"); }} title="Drag to trim end" />
  </div>;
}

export function Timeline({ onImport }: { onImport: (files: FileList | File[], addToTimeline?: boolean) => void }) {
  const project = useEditorStore((state) => state.project);
  const time = useEditorStore((state) => state.currentTime);
  const selectedId = useEditorStore((state) => state.selectedClipId);
  const zoom = useEditorStore((state) => state.zoom);
  const snapping = useEditorStore((state) => state.snapping);
  const [viewport, setViewport] = useState({ left: 0, width: 1000 });
  const [trackMenu, setTrackMenu] = useState(false);
  const [context, setContext] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const tracks = useMemo(() => project ? [...project.tracks.filter((track) => track.kind !== "audio").reverse(), ...project.tracks.filter((track) => track.kind === "audio").reverse()] : [], [project?.tracks]);
  const duration = project ? projectDuration(project) : 0;
  const width = Math.max(32, duration + 10) * zoom;
  const visibleStart = Math.max(0, (viewport.left - 200) / zoom);
  const visibleEnd = (viewport.left + viewport.width + 200) / zoom;
  const ticks = Array.from({ length: Math.ceil(visibleEnd) - Math.floor(visibleStart) + 1 }, (_, index) => Math.floor(visibleStart) + index);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const update = () => setViewport({ left: scroll.scrollLeft, width: scroll.clientWidth });
    const observer = new ResizeObserver(update);
    observer.observe(scroll);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !useEditorStore.getState().isPlaying) return;
    const x = time * zoom;
    if (x > scroll.scrollLeft + scroll.clientWidth - 75) scroll.scrollLeft = Math.max(0, x - scroll.clientWidth * .5);
  }, [time, zoom]);

  useEffect(() => {
    if (!context && !trackMenu) return;
    const close = () => { setContext(null); setTrackMenu(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [context, trackMenu]);

  const scrollPosition = (clientX: number) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    return rect ? Math.max(0, (clientX - rect.left + (scrollRef.current?.scrollLeft || 0)) / zoom) : 0;
  };

  const beginGesture = (event: ReactPointerEvent<HTMLElement>, clip: Clip, mode: Gesture["mode"]) => {
    if (event.button !== 0 || project?.tracks.find((track) => track.id === clip.trackId)?.locked) return;
    event.preventDefault();
    useEditorStore.getState().setPlaying(false);
    useEditorStore.getState().selectClip(clip.id);
    useEditorStore.getState().beginTransaction();
    gestureRef.current = { mode, clip: structuredClone(clip), startX: event.clientX, startTime: time, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !project) return;
    if (gesture.mode === "playhead") {
      useEditorStore.getState().setTime(scrollPosition(event.clientX));
      return;
    }
    const original = gesture.clip;
    if (!original) return;
    const delta = (event.clientX - gesture.startX) / zoom;
    if (Math.abs(delta) < .01 && !gesture.moved) return;
    gesture.moved = true;
    const state = useEditorStore.getState();
    if (gesture.mode === "move") {
      let start = Math.max(0, original.start + delta);
      const leftSnap = snapValue(start, project, original.id, state.currentTime, zoom, snapping);
      const rightSnap = snapValue(start + original.duration, project, original.id, state.currentTime, zoom, snapping) - original.duration;
      start = Math.abs(leftSnap - start) <= Math.abs(rightSnap - start) ? leftSnap : rightSnap;
      const lane = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-lane-id]");
      const target = project.tracks.find((track) => track.id === lane?.dataset.laneId);
      state.updateClip(original.id, { start: Math.max(0, start), ...(target && compatible(original, target) ? { trackId: target.id } : {}) }, false);
    } else if (gesture.mode === "trim-left") {
      const earliest = original.kind === "video" || original.kind === "audio" ? -original.sourceStart / original.speed : -original.start;
      const shift = Math.max(earliest, Math.min(original.duration - .2, Math.max(-original.start, delta)));
      const edge = snapValue(original.start + shift, project, original.id, state.currentTime, zoom, snapping);
      const applied = Math.max(earliest, Math.min(original.duration - .2, edge - original.start));
      state.updateClip(original.id, {
        start: Math.max(0, original.start + applied), duration: original.duration - applied,
        sourceStart: (original.kind === "video" || original.kind === "audio") ? original.sourceStart + applied * original.speed : original.sourceStart,
      }, false);
    } else {
      const asset = project.assets.find((item) => item.id === original.assetId);
      const max = (original.kind === "video" || original.kind === "audio") && asset ? (asset.duration - original.sourceStart) / original.speed : 36000;
      const edge = snapValue(original.start + original.duration + delta, project, original.id, state.currentTime, zoom, snapping);
      state.updateClip(original.id, { duration: Math.max(.2, Math.min(max, edge - original.start)) }, false);
    }
  };

  const endGesture = () => {
    if (gestureRef.current && gestureRef.current.mode !== "playhead") useEditorStore.getState().endTransaction();
    gestureRef.current = null;
  };

  const scrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    useEditorStore.getState().setPlaying(false);
    useEditorStore.getState().setTime(scrollPosition(event.clientX));
    gestureRef.current = { mode: "playhead", startX: event.clientX, startTime: time, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onLaneDrop = (event: React.DragEvent<HTMLDivElement>, track: Track) => {
    event.preventDefault();
    if (track.locked) return;
    const id = event.dataTransfer.getData("application/x-nexora-asset");
    if (id) {
      const rect = event.currentTarget.getBoundingClientRect();
      useEditorStore.getState().addClipFromAsset(id, Math.max(0, (event.clientX - rect.left) / zoom), track.id);
    } else if (event.dataTransfer.files.length) onImport(event.dataTransfer.files, true);
  };

  if (!project) return null;
  return <section className="timeline-shell" aria-label="Editing timeline">
    <div className="timeline-toolbar">
      <div className="timeline-toolbar-title"><strong>Timeline</strong><span>{project.clips.length} clip{project.clips.length === 1 ? "" : "s"}</span></div>
      <div className="timeline-tools"><IconButton icon={Scissors} label="Split selected clip at playhead (S)" onClick={() => useEditorStore.getState().splitSelected()} disabled={!selectedId} /><IconButton icon={Copy} label="Duplicate selected clip (Ctrl+D)" onClick={() => useEditorStore.getState().duplicateSelected()} disabled={!selectedId} /><IconButton icon={Trash2} label="Delete selected clip (Delete)" onClick={() => useEditorStore.getState().deleteSelected()} disabled={!selectedId} /><span className="control-separator" /><IconButton icon={Magnet} label={snapping ? "Turn snapping off" : "Turn snapping on"} onClick={() => useEditorStore.getState().toggleSnapping()} active={snapping} /></div>
      <div className="timeline-zoom"><ZoomOut size={15} /><input type="range" aria-label="Timeline zoom" min="24" max="140" value={zoom} onChange={(event) => useEditorStore.getState().setZoom(Number(event.target.value))} /><ZoomIn size={15} /><span>{Math.round(zoom / 48 * 100)}%</span></div>
    </div>
    <div className="timeline-body">
      <div className="track-label-column" ref={labelsRef} onWheel={(event) => { if (scrollRef.current) scrollRef.current.scrollTop += event.deltaY; }}><div className="ruler-label"><span>TRACKS</span><div className="track-add-wrap"><button className="track-add-button" title="Add a track" aria-label="Add a track" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setTrackMenu(!trackMenu); }}><Plus size={15} /></button>{trackMenu && <div className="track-add-menu" onPointerDown={(event) => event.stopPropagation()}>{([ ["video", Film, "Video track"], ["overlay", ImageIcon, "Overlay track"], ["text", Captions, "Text track"], ["audio", AudioLines, "Audio track"] ] as const).map(([kind, Icon, label]) => <button key={kind} onClick={() => { useEditorStore.getState().addTrack(kind); setTrackMenu(false); }}><Icon size={15} />{label}</button>)}</div>}</div></div>
        {tracks.map((track) => {
          const Icon = track.kind === "audio" ? AudioLines : track.kind === "text" ? Type : track.kind === "overlay" ? ImageIcon : Film;
          return <div className={`track-label track-label-${track.kind}`} key={track.id} style={{ height: rowHeight(track.kind) }}>
            <span className={`track-kind-indicator ${track.kind}`}><Icon size={15} /></span><span className="track-label-name" title={track.name}>{track.name}</span>
            <div className="track-label-actions">
              {track.kind === "audio" && <button className={`track-solo ${track.solo ? "active" : ""}`} onClick={() => useEditorStore.getState().updateTrack(track.id, { solo: !track.solo })} title={track.solo ? "Turn solo off" : "Solo track"} aria-label={track.solo ? "Turn solo off" : "Solo track"}>S</button>}
              <button onClick={() => useEditorStore.getState().updateTrack(track.id, track.kind === "audio" ? { muted: !track.muted } : { hidden: !track.hidden })} title={track.kind === "audio" ? track.muted ? "Unmute track" : "Mute track" : track.hidden ? "Show track" : "Hide track"} aria-label={track.kind === "audio" ? "Toggle track mute" : "Toggle track visibility"}>{track.kind === "audio" ? track.muted ? <VolumeX size={14} /> : <Volume2 size={14} /> : track.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button onClick={() => useEditorStore.getState().updateTrack(track.id, { locked: !track.locked })} title={track.locked ? "Unlock track" : "Lock track"} aria-label={track.locked ? "Unlock track" : "Lock track"}>{track.locked ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}</button>
            </div>
            <div className="track-reorder"><button onClick={() => useEditorStore.getState().moveTrack(track.id, 1)} title="Move track up" aria-label={`Move ${track.name} up`}><ChevronUp size={13} /></button><button onClick={() => useEditorStore.getState().moveTrack(track.id, -1)} title="Move track down" aria-label={`Move ${track.name} down`}><ChevronDown size={13} /></button></div>
          </div>;
        })}
      </div>
      <div className="timeline-scroll" ref={scrollRef} onScroll={(event) => { setViewport({ left: event.currentTarget.scrollLeft, width: event.currentTarget.clientWidth }); if (labelsRef.current) labelsRef.current.scrollTop = event.currentTarget.scrollTop; }} onPointerMove={onPointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}>
        <div className="timeline-inner" style={{ width }}>
          <div className="timeline-ruler" onPointerDown={scrub}>{ticks.filter((tick) => tick >= 0 && tick * zoom <= width).map((tick) => <div key={tick} className={`ruler-tick ${tick % 5 === 0 ? "major" : ""}`} style={{ left: tick * zoom }}>{tick % (zoom < 35 ? 10 : zoom > 85 ? 2 : 5) === 0 && <span>{formatTime(tick)}</span>}</div>)}</div>
          {tracks.map((track) => {
            const clips = project.clips.filter((clip) => clip.trackId === track.id && clip.start + clip.duration >= visibleStart && clip.start <= visibleEnd);
            return <div key={track.id} className={`track-lane lane-${track.kind} ${track.locked ? "locked" : ""} ${track.hidden ? "hidden-track" : ""}`} style={{ height: rowHeight(track.kind) }} data-lane-id={track.id} onDragOver={(event) => { if (!track.locked) event.preventDefault(); }} onDrop={(event) => onLaneDrop(event, track)}>
              {!project.clips.some((clip) => clip.trackId === track.id) && <div className="empty-lane-hint">{track.kind === "audio" ? "Drop audio here" : track.kind === "text" ? "Add text to your video" : "Drag media here"}</div>}
              {clips.map((clip) => <ClipBlock key={clip.id} clip={clip} project={project} zoom={zoom} selected={selectedId === clip.id} onGesture={beginGesture} onContext={(event, chosen) => { event.preventDefault(); useEditorStore.getState().selectClip(chosen.id); setContext({ x: Math.min(window.innerWidth - 200, event.clientX), y: Math.min(window.innerHeight - 150, event.clientY), clipId: chosen.id }); }} />)}
            </div>;
          })}
          <div className="timeline-playhead" style={{ left: time * zoom } as CSSProperties} onPointerDown={scrub} title="Drag playhead to scrub"><span className="playhead-head" /><span className="playhead-line" /></div>
        </div>
      </div>
    </div>
    {context && <div className="clip-context-menu" style={{ left: context.x, top: context.y }} onPointerDown={(event) => event.stopPropagation()}>
      <button onClick={() => { useEditorStore.getState().selectClip(context.clipId); useEditorStore.getState().splitSelected(); setContext(null); }}><Scissors size={15} /> Split at playhead <span>S</span></button>
      <button onClick={() => { useEditorStore.getState().selectClip(context.clipId); useEditorStore.getState().duplicateSelected(); setContext(null); }}><Copy size={15} /> Duplicate <span>Ctrl D</span></button>
      <div className="context-divider" />
      <button className="danger" onClick={() => { useEditorStore.getState().selectClip(context.clipId); useEditorStore.getState().deleteSelected(); setContext(null); }}><Trash2 size={15} /> Delete <span>Del</span></button>
    </div>}
  </section>;
}