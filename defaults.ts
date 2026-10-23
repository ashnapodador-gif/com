import type { Clip, EffectSettings, MediaAsset, Project, TextStyle, Track, Transform, Crop, AspectRatio } from "./types";

export const DEFAULT_EFFECTS: EffectSettings = {
  brightness: 0, contrast: 0, saturation: 0, exposure: 0,
  temperature: 0, tint: 0, blur: 0, grayscale: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter", fontSize: 60, fontWeight: 700, color: "#ffffff",
  align: "center", lineHeight: 1.15, letterSpacing: 0,
  outlineColor: "#000000", outlineWidth: 0, shadow: true,
  background: "transparent", animation: "none",
};

export const DEFAULT_TRANSFORM: Transform = { x: 50, y: 50, scale: 100, rotation: 0 };
export const DEFAULT_CROP: Crop = { top: 0, right: 0, bottom: 0, left: 0 };

export function makeTracks(): Track[] {
  return [
    { id: "video-1", name: "Main video", kind: "video", locked: false, hidden: false, muted: false, solo: false },
    { id: "overlay-1", name: "Overlays", kind: "overlay", locked: false, hidden: false, muted: false, solo: false },
    { id: "text-1", name: "Text & captions", kind: "text", locked: false, hidden: false, muted: false, solo: false },
    { id: "audio-1", name: "Audio", kind: "audio", locked: false, hidden: false, muted: false, solo: false },
  ];
}

export function makeClip(kind: Clip["kind"], trackId: string, name: string, start: number, duration: number): Clip {
  return {
    id: crypto.randomUUID(), kind, trackId, name, start, duration,
    sourceStart: 0, speed: 1, volume: 100, muted: false, opacity: 100,
    fadeIn: 0, fadeOut: 0, transform: { ...DEFAULT_TRANSFORM },
    crop: { ...DEFAULT_CROP }, effects: { ...DEFAULT_EFFECTS }, motion: "none",
  };
}

export function makeProject(name = "Untitled project", ratio: AspectRatio = "16:9"): Project {
  const now = Date.now();
  return {
    id: crypto.randomUUID(), name, createdAt: now, updatedAt: now,
    ratio, fps: 30, backgroundColor: "#101116", tracks: makeTracks(), clips: [], assets: [],
  };
}

export function makeDemoProject(): Project {
  const base = import.meta.env.BASE_URL;
  const project = makeProject("The art of elsewhere");
  project.isDemo = true;
  const scenes: Array<[string, string]> = [
    ["valley", "01  /  Into the wild"],
    ["coast", "02  /  The long way"],
    ["desert", "03  /  Open roads"],
  ];
  project.assets = scenes.map(([key, name]) => ({
    id: `demo-${key}`, name, kind: "image", source: "builtin",
    src: `${base}demo/${key}.jpg`, thumbnail: `${base}demo/${key}.jpg`,
    duration: 7, width: 1536, height: 864,
  })) as MediaAsset[];
  const first = makeClip("image", "video-1", scenes[0][1], 0, 7.4);
  first.assetId = "demo-valley";
  first.fadeOut = 0.85;
  const second = makeClip("image", "video-1", scenes[1][1], 6.55, 7.4);
  second.assetId = "demo-coast";
  second.fadeIn = 0.85;
  second.fadeOut = 0.85;
  const third = makeClip("image", "video-1", scenes[2][1], 13.1, 6.8);
  third.assetId = "demo-desert";
  third.fadeIn = 0.85;
  const title = makeClip("text", "text-1", "The art of elsewhere", 0.6, 5.9);
  title.text = "THE ART OF\nELSEWHERE";
  title.transform = { x: 36, y: 51, scale: 100, rotation: 0 };
  title.textStyle = { ...DEFAULT_TEXT_STYLE, fontFamily: "Inter", fontWeight: 800, fontSize: 73, align: "left", lineHeight: 1.04, letterSpacing: -2, shadow: true, animation: "fade" };
  title.fadeIn = 0.5;
  title.fadeOut = 0.7;
  const closing = makeClip("text", "text-1", "Take the long way home", 14.15, 4.6);
  closing.text = "TAKE THE LONG\nWAY HOME.";
  closing.textStyle = { ...DEFAULT_TEXT_STYLE, fontSize: 69, fontWeight: 800, letterSpacing: -2, lineHeight: 1.02, animation: "slide-up" };
  closing.fadeIn = 0.5;
  closing.fadeOut = 0.7;
  project.clips = [first, second, third, title, closing];
  project.thumbnail = `${base}demo/valley.jpg`;
  return project;
}

export function projectDuration(project: Project): number {
  return Math.max(0, ...project.clips.map((clip) => clip.start + clip.duration));
}

export function formatTime(seconds: number, frames = false, fps = 30): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const secs = Math.floor(safe % 60).toString().padStart(2, "0");
  return frames ? `${minutes}:${secs}:${Math.floor((safe % 1) * fps).toString().padStart(2, "0")}` : `${minutes}:${secs}`;
}

export function ratioDimensions(ratio: AspectRatio, height: number): [number, number] {
  const factors: Record<AspectRatio, number> = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5 };
  const factor = factors[ratio];
  return factor >= 1 ? [Math.round(height * factor), height] : [height, Math.round(height / factor)];
}