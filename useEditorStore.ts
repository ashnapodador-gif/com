import { create } from "zustand";
import { DEFAULT_TEXT_STYLE, makeClip, projectDuration } from "../editor/defaults";
import type { AspectRatio, Clip, EffectSettings, MediaAsset, Project, TextStyle, ToolTab, Toast, Track, Transform, Crop } from "../editor/types";

interface EditorState {
  project: Project | null;
  projects: Project[];
  mediaUrls: Record<string, string>;
  view: "editor" | "dashboard";
  activeTool: ToolTab;
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapping: boolean;
  showGuides: boolean;
  previewQuality: "auto" | "full";
  saveStatus: "saved" | "saving" | "error";
  toasts: Toast[];
  history: Project[];
  future: Project[];
  transactionStart: Project | null;
  setProjects: (projects: Project[]) => void;
  openProject: (project: Project, urls: Record<string, string>) => void;
  setView: (view: "editor" | "dashboard") => void;
  setActiveTool: (tool: ToolTab) => void;
  setMediaUrl: (id: string, url: string) => void;
  setSaveStatus: (status: EditorState["saveStatus"]) => void;
  setTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  toggleSnapping: () => void;
  toggleGuides: () => void;
  setPreviewQuality: (quality: EditorState["previewQuality"]) => void;
  selectClip: (id: string | null) => void;
  renameProject: (name: string) => void;
  setRatio: (ratio: AspectRatio) => void;
  setBackgroundColor: (color: string) => void;
  setFps: (fps: number) => void;
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: string) => void;
  addClipFromAsset: (assetId: string, at?: number, trackId?: string) => void;
  addText: (caption?: boolean, preset?: "bold" | "minimal" | "lower-third") => void;
  addSticker: (shape: NonNullable<Clip["sticker"]>) => void;
  addBackgroundClip: (color: string) => void;
  updateClip: (id: string, patch: Partial<Clip>, record?: boolean) => void;
  updateTransform: (id: string, patch: Partial<Transform>, record?: boolean) => void;
  updateEffects: (id: string, patch: Partial<EffectSettings>) => void;
  updateCrop: (id: string, patch: Partial<Crop>) => void;
  updateTextStyle: (id: string, patch: Partial<TextStyle>) => void;
  deleteSelected: () => void;
  splitSelected: () => void;
  duplicateSelected: () => void;
  addTrack: (kind: Track["kind"]) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  moveTrack: (id: string, direction: -1 | 1) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  undo: () => void;
  redo: () => void;
  notify: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const edit = (change: (draft: Project) => void, record = true) => {
    const state = get();
    if (!state.project) return;
    const draft = structuredClone(state.project);
    change(draft);
    draft.updatedAt = Date.now();
    set({
      project: draft,
      history: record && !state.transactionStart ? [...state.history.slice(-49), state.project] : state.history,
      future: record && !state.transactionStart ? [] : state.future,
      saveStatus: "saving",
    });
  };

  const isLocked = (clip: Clip) => !!get().project?.tracks.find((track) => track.id === clip.trackId)?.locked;

  return {
    project: null, projects: [], mediaUrls: {}, view: "editor", activeTool: "media",
    selectedClipId: null, currentTime: 0, isPlaying: false, zoom: 48,
    snapping: true, showGuides: false, previewQuality: "auto", saveStatus: "saved",
    toasts: [], history: [], future: [], transactionStart: null,

    setProjects: (projects) => set({ projects }),
    openProject: (project, urls) => set({
      project, mediaUrls: urls, view: "editor", isPlaying: false,
      currentTime: project.isDemo ? 2.2 : 0,
      selectedClipId: project.clips.find((clip) => clip.kind === "video" || clip.kind === "image")?.id ?? null,
      history: [], future: [], transactionStart: null, saveStatus: "saved", activeTool: "media",
    }),
    setView: (view) => set({ view, isPlaying: false }),
    setActiveTool: (activeTool) => set({ activeTool }),
    setMediaUrl: (id, url) => set((state) => ({ mediaUrls: { ...state.mediaUrls, [id]: url } })),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setTime: (time) => set((state) => ({ currentTime: Math.max(0, Math.min(time, state.project ? projectDuration(state.project) : 0)) })),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setZoom: (zoom) => set({ zoom: Math.max(24, Math.min(140, zoom)) }),
    toggleSnapping: () => set((state) => ({ snapping: !state.snapping })),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    setPreviewQuality: (previewQuality) => set({ previewQuality }),
    selectClip: (selectedClipId) => set({ selectedClipId }),

    renameProject: (name) => { if (name.trim()) edit((draft) => { draft.name = name.trim(); }); },
    setRatio: (ratio) => edit((draft) => { draft.ratio = ratio; }),
    setBackgroundColor: (color) => edit((draft) => { draft.backgroundColor = color; }),
    setFps: (fps) => edit((draft) => { draft.fps = fps; }),

    addAsset: (asset) => edit((draft) => { draft.assets.push(asset); if (!draft.thumbnail && asset.thumbnail) draft.thumbnail = asset.thumbnail; }),
    removeAsset: (id) => {
      const project = get().project;
      if (!project) return;
      edit((draft) => {
        draft.assets = draft.assets.filter((asset) => asset.id !== id);
        draft.clips = draft.clips.filter((clip) => clip.assetId !== id);
        if (draft.thumbnail === project.assets.find((asset) => asset.id === id)?.thumbnail) {
          draft.thumbnail = draft.assets.find((asset) => asset.thumbnail)?.thumbnail;
        }
      });
      if (project.clips.some((clip) => clip.assetId === id && clip.id === get().selectedClipId)) set({ selectedClipId: null });
    },
    addClipFromAsset: (assetId, at, targetTrack) => {
      const state = get();
      const asset = state.project?.assets.find((item) => item.id === assetId);
      if (!asset || !state.project) return;
      const start = Math.max(0, at ?? state.currentTime);
      let trackId = targetTrack;
      if (!trackId) {
        if (asset.kind === "audio") trackId = state.project.tracks.find((track) => track.kind === "audio")?.id;
        else {
          const main = state.project.tracks.find((track) => track.kind === "video")?.id;
          const occupied = state.project.clips.some((clip) => clip.trackId === main && clip.start < start + 0.1 && clip.start + clip.duration > start);
          trackId = occupied ? state.project.tracks.find((track) => track.kind === "overlay")?.id : main;
        }
      }
      const track = state.project.tracks.find((item) => item.id === trackId);
      if (!track || track.locked || (asset.kind === "audio" ? track.kind !== "audio" : track.kind !== "video" && track.kind !== "overlay")) return;
      const clip = makeClip(asset.kind, track.id, asset.name, start, asset.kind === "image" ? 6 : asset.duration);
      clip.assetId = asset.id;
      if (track.kind === "overlay") clip.transform = { x: 72, y: 69, scale: 38, rotation: 0 };
      edit((draft) => { draft.clips.push(clip); });
      set({ selectedClipId: clip.id });
    },
    addText: (caption = false, preset = "bold") => {
      const state = get();
      const track = state.project?.tracks.find((item) => item.kind === "text" && !item.locked);
      if (!track) { get().notify("Unlock a text track to add text.", "error"); return; }
      const clip = makeClip("text", track.id, caption ? "New caption" : "New title", state.currentTime, caption ? 3 : 5);
      clip.text = caption ? "Add your caption here" : preset === "minimal" ? "Your story starts here" : preset === "lower-third" ? "YOUR NAME\nCreative director" : "YOUR STORY HERE";
      clip.textStyle = { ...DEFAULT_TEXT_STYLE };
      if (caption) {
        clip.transform.y = 84;
        clip.textStyle = { ...clip.textStyle, fontSize: 34, fontWeight: 600, background: "#101015cc", shadow: false };
      } else if (preset === "minimal") {
        clip.textStyle = { ...clip.textStyle, fontFamily: "Georgia", fontWeight: 400, fontSize: 58 };
      } else if (preset === "lower-third") {
        clip.transform = { x: 30, y: 79, scale: 100, rotation: 0 };
        clip.textStyle = { ...clip.textStyle, fontSize: 38, align: "left", fontWeight: 700, background: "#111827b8" };
      }
      edit((draft) => { draft.clips.push(clip); });
      set({ selectedClipId: clip.id });
    },
    addSticker: (shape) => {
      const state = get();
      const track = state.project?.tracks.find((item) => item.kind === "overlay" && !item.locked);
      if (!track) { get().notify("Unlock an overlay track to add a shape.", "error"); return; }
      const clip = makeClip("sticker", track.id, `${shape[0].toUpperCase()}${shape.slice(1)} shape`, state.currentTime, 4);
      clip.sticker = shape; clip.color = "#b4a3ff";
      clip.transform = { x: 73, y: 30, scale: 45, rotation: 0 };
      edit((draft) => { draft.clips.push(clip); });
      set({ selectedClipId: clip.id });
    },
    addBackgroundClip: (color) => {
      const state = get();
      const track = state.project?.tracks.find((item) => item.kind === "video" && !item.locked);
      if (!track) return;
      const clip = makeClip("background", track.id, "Color background", state.currentTime, 5);
      clip.color = color;
      edit((draft) => { draft.clips.push(clip); });
      set({ selectedClipId: clip.id });
    },
    updateClip: (id, patch, record = true) => {
      const clip = get().project?.clips.find((item) => item.id === id);
      if (!clip || isLocked(clip)) return;
      edit((draft) => {
        const item = draft.clips.find((candidate) => candidate.id === id);
        if (item) Object.assign(item, patch);
      }, record);
    },
    updateTransform: (id, patch, record = true) => {
      const clip = get().project?.clips.find((item) => item.id === id);
      if (clip) get().updateClip(id, { transform: { ...clip.transform, ...patch } }, record);
    },
    updateEffects: (id, patch) => {
      const clip = get().project?.clips.find((item) => item.id === id);
      if (clip) get().updateClip(id, { effects: { ...clip.effects, ...patch } });
    },
    updateCrop: (id, patch) => {
      const clip = get().project?.clips.find((item) => item.id === id);
      if (clip) get().updateClip(id, { crop: { ...clip.crop, ...patch } });
    },
    updateTextStyle: (id, patch) => {
      const clip = get().project?.clips.find((item) => item.id === id);
      if (clip) get().updateClip(id, { textStyle: { ...DEFAULT_TEXT_STYLE, ...clip.textStyle, ...patch } });
    },
    deleteSelected: () => {
      const { selectedClipId, project } = get();
      const clip = project?.clips.find((item) => item.id === selectedClipId);
      if (!clip || isLocked(clip)) return;
      edit((draft) => { draft.clips = draft.clips.filter((item) => item.id !== selectedClipId); });
      set({ selectedClipId: null });
    },
    splitSelected: () => {
      const { selectedClipId, currentTime, project } = get();
      const clip = project?.clips.find((item) => item.id === selectedClipId);
      if (!clip || isLocked(clip) || currentTime <= clip.start + 0.1 || currentTime >= clip.start + clip.duration - 0.1) {
        get().notify("Move the playhead inside an unlocked clip to split it.", "info"); return;
      }
      const firstDuration = currentTime - clip.start;
      const right: Clip = {
        ...structuredClone(clip), id: crypto.randomUUID(), start: currentTime,
        duration: clip.duration - firstDuration,
        sourceStart: clip.sourceStart + firstDuration * clip.speed,
        fadeIn: 0,
      };
      edit((draft) => {
        const original = draft.clips.find((item) => item.id === clip.id);
        if (original) { original.duration = firstDuration; original.fadeOut = 0; }
        draft.clips.push(right);
      });
      set({ selectedClipId: right.id });
      get().notify("Clip split at playhead.", "success");
    },
    duplicateSelected: () => {
      const { selectedClipId, project } = get();
      const clip = project?.clips.find((item) => item.id === selectedClipId);
      if (!clip || isLocked(clip)) return;
      const copy: Clip = { ...structuredClone(clip), id: crypto.randomUUID(), start: clip.start + clip.duration };
      edit((draft) => { draft.clips.push(copy); });
      set({ selectedClipId: copy.id });
      get().notify("Clip duplicated.", "success");
    },
    addTrack: (kind) => {
      const project = get().project;
      if (!project) return;
      const count = project.tracks.filter((track) => track.kind === kind).length + 1;
      const track: Track = { id: crypto.randomUUID(), name: `${kind === "audio" ? "Audio" : kind === "text" ? "Text" : kind === "overlay" ? "Overlay" : "Video"} ${count}`, kind, locked: false, hidden: false, muted: false, solo: false };
      edit((draft) => { draft.tracks.push(track); });
      get().notify(`${track.name} added.`, "success");
    },
    updateTrack: (id, patch) => edit((draft) => {
      const track = draft.tracks.find((item) => item.id === id);
      if (track) Object.assign(track, patch);
    }),
    moveTrack: (id, direction) => edit((draft) => {
      const index = draft.tracks.findIndex((track) => track.id === id);
      const next = index + direction;
      if (index >= 0 && next >= 0 && next < draft.tracks.length) {
        [draft.tracks[index], draft.tracks[next]] = [draft.tracks[next], draft.tracks[index]];
      }
    }),
    beginTransaction: () => { if (!get().transactionStart) set({ transactionStart: get().project }); },
    endTransaction: () => {
      const { transactionStart, project, history } = get();
      if (transactionStart && project !== transactionStart) set({ history: [...history.slice(-49), transactionStart], future: [], transactionStart: null });
      else set({ transactionStart: null });
    },
    undo: () => {
      const { history, project, future } = get();
      if (!project || !history.length) return;
      const previous = { ...history[history.length - 1], updatedAt: Date.now() };
      set({ project: previous, history: history.slice(0, -1), future: [project, ...future], selectedClipId: null, saveStatus: "saving", isPlaying: false });
    },
    redo: () => {
      const { history, project, future } = get();
      if (!project || !future.length) return;
      const next = { ...future[0], updatedAt: Date.now() };
      set({ project: next, history: [...history, project], future: future.slice(1), selectedClipId: null, saveStatus: "saving", isPlaying: false });
    },
    notify: (message, type = "info") => {
      const id = crypto.randomUUID();
      set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, type }] }));
      window.setTimeout(() => get().dismissToast(id), 4800);
    },
    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  };
});