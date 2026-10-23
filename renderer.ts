import type { Clip, MediaAsset, Project, TextStyle } from "./types";
import { canvasColorFilter } from "../effects/color";

type MediaElement = HTMLVideoElement | HTMLAudioElement;

export interface HitBox {
  clipId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function isVisible(clip: Clip, time: number): boolean {
  return time >= clip.start && time < clip.start + clip.duration;
}

function fadeAt(clip: Clip, time: number): number {
  const elapsed = time - clip.start;
  return Math.max(0, Math.min(1,
    clip.fadeIn ? elapsed / clip.fadeIn : 1,
    clip.fadeOut ? (clip.duration - elapsed) / clip.fadeOut : 1,
  ));
}

function textWidth(ctx: CanvasRenderingContext2D, value: string, spacing: number): number {
  return ctx.measureText(value).width + Math.max(0, value.length - 1) * spacing;
}

function drawLetterSpacing(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, spacing: number, stroke: boolean): void {
  if (!spacing) {
    if (stroke) ctx.strokeText(value, x, y);
    else ctx.fillText(value, x, y);
    return;
  }
  let position = x;
  for (const character of value) {
    if (stroke) ctx.strokeText(character, position, y);
    else ctx.fillText(character, position, y);
    position += ctx.measureText(character).width + spacing;
  }
}

function wrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, spacing: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(ctx, next, spacing) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line || " ");
  }
  return lines;
}

function drawSticker(ctx: CanvasRenderingContext2D, clip: Clip, width: number, height: number, time: number): HitBox {
  const size = 98 * width / 960 * clip.transform.scale / 100;
  const x = width * clip.transform.x / 100;
  const y = height * clip.transform.y / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(clip.transform.rotation * Math.PI / 180);
  ctx.globalAlpha = clip.opacity / 100 * fadeAt(clip, time);
  ctx.fillStyle = clip.color || "#b4a3ff";
  ctx.strokeStyle = clip.color || "#b4a3ff";
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (clip.sticker === "circle") {
    ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  } else if (clip.sticker === "arrow") {
    ctx.moveTo(-size * 0.4, 0);
    ctx.lineTo(size * 0.35, 0);
    ctx.moveTo(size * 0.06, -size * 0.27);
    ctx.lineTo(size * 0.39, 0);
    ctx.lineTo(size * 0.06, size * 0.27);
    ctx.stroke();
  } else if (clip.sticker === "heart") {
    ctx.moveTo(0, size * 0.36);
    ctx.bezierCurveTo(-size * 0.72, -size * 0.05, -size * 0.35, -size * 0.48, 0, -size * 0.17);
    ctx.bezierCurveTo(size * 0.35, -size * 0.48, size * 0.72, -size * 0.05, 0, size * 0.36);
    ctx.fill();
  } else {
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 ? size * 0.19 : size * 0.46;
      if (!i) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return { clipId: clip.id, x: x - size / 2, y: y - size / 2, width: size, height: size };
}

function drawText(ctx: CanvasRenderingContext2D, clip: Clip, width: number, height: number, time: number): HitBox {
  const style: TextStyle = clip.textStyle!;
  const fontSize = style.fontSize * width / 960 * clip.transform.scale / 100;
  const spacing = style.letterSpacing * width / 960 * clip.transform.scale / 100;
  const lineHeight = fontSize * style.lineHeight;
  ctx.save();
  ctx.font = `${style.fontWeight} ${fontSize}px "${style.fontFamily}", Arial, sans-serif`;
  const lines = wrappedLines(ctx, clip.text || "", width * 0.88, spacing);
  const groupWidth = Math.max(1, ...lines.map((line) => textWidth(ctx, line, spacing)));
  const groupHeight = Math.max(lineHeight, lines.length * lineHeight);
  const x = width * clip.transform.x / 100;
  let y = height * clip.transform.y / 100;
  if (style.animation === "slide-up") y += (1 - Math.min(1, (time - clip.start) / 0.45)) * height * 0.055;
  ctx.translate(x, y);
  ctx.rotate(clip.transform.rotation * Math.PI / 180);
  ctx.globalAlpha = clip.opacity / 100 * fadeAt(clip, time);
  if (style.animation === "fade") ctx.globalAlpha *= Math.min(1, (time - clip.start) / 0.38);
  const padding = fontSize * 0.28;
  if (style.background && style.background !== "transparent") {
    ctx.fillStyle = style.background;
    ctx.fillRect(-groupWidth / 2 - padding, -groupHeight / 2 - padding * 0.45, groupWidth + padding * 2, groupHeight + padding * 0.9);
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.outlineColor;
  ctx.lineWidth = style.outlineWidth * width / 960 * 2;
  ctx.lineJoin = "round";
  if (style.shadow) {
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 16 * width / 960;
    ctx.shadowOffsetY = 4 * width / 960;
  }
  lines.forEach((line, index) => {
    const lineWidth = textWidth(ctx, line, spacing);
    const lineX = style.align === "left" ? -groupWidth / 2 : style.align === "right" ? groupWidth / 2 - lineWidth : -lineWidth / 2;
    const lineY = -groupHeight / 2 + lineHeight * (index + 0.5);
    if (style.outlineWidth > 0) drawLetterSpacing(ctx, line, lineX, lineY, spacing, true);
    drawLetterSpacing(ctx, line, lineX, lineY, spacing, false);
  });
  ctx.restore();
  return { clipId: clip.id, x: x - groupWidth / 2 - padding, y: y - groupHeight / 2 - padding,
    width: groupWidth + padding * 2, height: groupHeight + padding * 2 };
}

export class TimelineRenderer {
  private project: Project;
  private images = new Map<string, HTMLImageElement>();
  private elements = new Map<string, MediaElement>();
  private onReady?: () => void;
  hitBoxes: HitBox[] = [];

  constructor(project: Project, urls: Record<string, string>, onReady?: () => void) {
    this.project = project;
    this.onReady = onReady;
    this.update(project, urls);
  }

  update(project: Project, urls: Record<string, string>): void {
    this.project = project;
    for (const asset of project.assets) {
      const url = urls[asset.id];
      if (asset.kind !== "image" || !url) continue;
      const existing = this.images.get(asset.id);
      if (existing?.src === new URL(url, location.href).href) continue;
      const image = new Image();
      image.onload = () => this.onReady?.();
      image.src = url;
      this.images.set(asset.id, image);
    }
    for (const clip of project.clips) {
      if ((clip.kind !== "video" && clip.kind !== "audio") || !clip.assetId) continue;
      const url = urls[clip.assetId];
      if (!url) continue;
      const existing = this.elements.get(clip.id);
      if (existing?.src === new URL(url, location.href).href) continue;
      const element = document.createElement(clip.kind);
      element.preload = "metadata";
      element.src = url;
      element.onloadeddata = () => this.onReady?.();
      element.onseeked = () => this.onReady?.();
      this.elements.set(clip.id, element);
    }
    for (const [id, element] of this.elements) {
      if (!project.clips.some((clip) => clip.id === id)) {
        element.pause(); element.removeAttribute("src"); element.load(); this.elements.delete(id);
      }
    }
  }

  async prepare(time = 0): Promise<void> {
    const images = [...this.images.values()].map((image) => new Promise<void>((resolve, reject) => {
      if (image.complete) { image.naturalWidth ? resolve() : reject(new Error("An image in this project could not be loaded.")); return; }
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("An image in this project could not be loaded.")), { once: true });
    }));
    const startingMedia = this.mediaEntries().filter(({ clip }) => isVisible(clip, time));
    const playable = startingMedia.map(({ element }) => new Promise<void>((resolve, reject) => {
      if (element.readyState >= 2) { resolve(); return; }
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error("A source video or audio clip could not be decoded for export.")); }, 15000);
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("A source video or audio clip could not be decoded for export.")); };
      const cleanup = () => {
        window.clearTimeout(timeout);
        element.removeEventListener("loadeddata", loaded);
        element.removeEventListener("error", failed);
      };
      element.addEventListener("loadeddata", loaded);
      element.addEventListener("error", failed);
      if (element.preload !== "auto") { element.preload = "auto"; element.load(); }
    }));
    await Promise.all([...images, ...playable]);
    this.sync(time, false, true);
    await Promise.all(startingMedia.filter(({ element }) => element.seeking).map(({ element }) => new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 2500);
      element.addEventListener("seeked", () => { clearTimeout(timeout); resolve(); }, { once: true });
    })));
  }

  private assetFor(clip: Clip): MediaAsset | undefined {
    return this.project.assets.find((asset) => asset.id === clip.assetId);
  }

  audioGain(clip: Clip, time: number): number {
    const track = this.project.tracks.find((item) => item.id === clip.trackId);
    const soloed = this.project.tracks.some((item) => item.solo);
    if (!isVisible(clip, time) || clip.muted || track?.muted || (soloed && !track?.solo)) return 0;
    return Math.max(0, Math.min(1, clip.volume / 100 * fadeAt(clip, time)));
  }

  mediaEntries(): Array<{ clip: Clip; element: MediaElement }> {
    return this.project.clips.flatMap((clip) => {
      const element = this.elements.get(clip.id);
      return element ? [{ clip, element }] : [];
    });
  }

  sync(time: number, playing: boolean, forExport = false, previewMuted = false): void {
    for (const { clip, element } of this.mediaEntries()) {
      const track = this.project.tracks.find((item) => item.id === clip.trackId);
      const asset = this.assetFor(clip);
      const active = isVisible(clip, time) && !!asset && (clip.kind === "audio" || !track?.hidden);
      if (!active) { if (!element.paused) element.pause(); continue; }
      if (element.readyState < 2 && element.preload !== "auto") { element.preload = "auto"; element.load(); }
      const target = Math.min(Math.max(0, (asset?.duration ?? 0) - 0.03), clip.sourceStart + (time - clip.start) * clip.speed);
      element.playbackRate = Math.max(0.25, Math.min(4, clip.speed));
      element.volume = forExport ? 1 : previewMuted ? 0 : this.audioGain(clip, time);
      if (element.readyState >= 1 && Math.abs(element.currentTime - target) > (playing ? 0.25 : 0.025)) {
        try { element.currentTime = target; } catch { /* Seeking can fail before metadata is loaded. */ }
      }
      if (playing && element.paused) void element.play().catch(() => undefined);
      if (!playing && !element.paused) element.pause();
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, width: number, height: number): HitBox[] {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = this.project.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    const boxes: HitBox[] = [];
    for (const track of this.project.tracks) {
      if (track.hidden || track.kind === "audio") continue;
      const clips = this.project.clips
        .filter((clip) => clip.trackId === track.id && isVisible(clip, time))
        .sort((a, b) => (a.kind === "background" ? -1 : 0) - (b.kind === "background" ? -1 : 0) || a.start - b.start);
      for (const clip of clips) {
        if (clip.kind === "background") {
          ctx.save();
          ctx.globalAlpha = clip.opacity / 100 * fadeAt(clip, time);
          ctx.fillStyle = clip.color || "#101116";
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
          continue;
        }
        if (clip.kind === "text" && clip.textStyle) {
          boxes.push(drawText(ctx, clip, width, height, time));
          continue;
        }
        if (clip.kind === "sticker") {
          boxes.push(drawSticker(ctx, clip, width, height, time));
          continue;
        }
        if (clip.kind === "audio") continue;
        const asset = this.assetFor(clip);
        const image = clip.kind === "image" && clip.assetId ? this.images.get(clip.assetId) : undefined;
        const video = clip.kind === "video" ? this.elements.get(clip.id) as HTMLVideoElement | undefined : undefined;
        const source = image?.complete && image.naturalWidth ? image : video?.readyState && video.readyState >= 2 ? video : undefined;
        if (!source || !asset) continue;
        const sourceWidth = clip.kind === "image" ? (image?.naturalWidth || asset.width || 1) : (video?.videoWidth || asset.width || 1);
        const sourceHeight = clip.kind === "image" ? (image?.naturalHeight || asset.height || 1) : (video?.videoHeight || asset.height || 1);
        const left = Math.min(90, Math.max(0, clip.crop.left)) / 100 * sourceWidth;
        const top = Math.min(90, Math.max(0, clip.crop.top)) / 100 * sourceHeight;
        const croppedWidth = Math.max(1, sourceWidth * (1 - Math.min(95, clip.crop.left + clip.crop.right) / 100));
        const croppedHeight = Math.max(1, sourceHeight * (1 - Math.min(95, clip.crop.top + clip.crop.bottom) / 100));
        const cover = Math.max(width / croppedWidth, height / croppedHeight);
        const drawnWidth = croppedWidth * cover;
        const drawnHeight = croppedHeight * cover;
        const progress = (time - clip.start) / clip.duration;
        const motionScale = clip.motion === "slow-zoom" ? 1 + progress * 0.12 : 1;
        const motionX = clip.motion === "pan-left" ? (0.06 - progress * 0.12) * width : 0;
        ctx.save();
        ctx.globalAlpha = clip.opacity / 100 * fadeAt(clip, time);
        ctx.translate(width * clip.transform.x / 100 + motionX, height * clip.transform.y / 100);
        ctx.rotate(clip.transform.rotation * Math.PI / 180);
        ctx.scale(clip.transform.scale / 100 * motionScale, clip.transform.scale / 100 * motionScale);
        ctx.filter = canvasColorFilter(clip.effects);
        try { ctx.drawImage(source, left, top, croppedWidth, croppedHeight, -drawnWidth / 2, -drawnHeight / 2, drawnWidth, drawnHeight); } catch { /* A video frame may still be decoding. */ }
        ctx.restore();
        boxes.push({ clipId: clip.id,
          x: width * clip.transform.x / 100 - width * clip.transform.scale / 200,
          y: height * clip.transform.y / 100 - height * clip.transform.scale / 200,
          width: width * clip.transform.scale / 100, height: height * clip.transform.scale / 100 });
      }
    }
    this.hitBoxes = boxes;
    return boxes;
  }

  dispose(): void {
    for (const element of this.elements.values()) {
      element.pause(); element.removeAttribute("src"); element.load();
    }
    this.elements.clear();
    this.images.clear();
  }
}