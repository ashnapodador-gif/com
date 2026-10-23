import type { AssetKind, MediaAsset } from "../editor/types";
import { extractWaveform } from "../audio/waveform";

const videoExtensions = /\.(mp4|webm|mov|m4v|ogv)$/i;
const audioExtensions = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const imageExtensions = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;

export function isSupportedFile(file: File): boolean {
  return file.type.startsWith("video/") || file.type.startsWith("audio/") || file.type.startsWith("image/") ||
    videoExtensions.test(file.name) || audioExtensions.test(file.name) || imageExtensions.test(file.name);
}

function detectKind(file: File): AssetKind {
  if (file.type.startsWith("image/") || imageExtensions.test(file.name)) return "image";
  if (file.type.startsWith("audio/") || audioExtensions.test(file.name)) return "audio";
  return "video";
}

function loadMetadata(file: File, kind: AssetKind): Promise<{ duration: number; width?: number; height?: number; thumbnail?: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    let settled = false;
    const timeout = window.setTimeout(() => fail(), 20000);
    const cleanup = () => { window.clearTimeout(timeout); URL.revokeObjectURL(url); };
    const fail = () => {
      if (settled) return;
      settled = true; cleanup();
      reject(new Error(`${file.name} could not be decoded by this browser. Try MP4 (H.264), WebM, JPG, PNG, MP3, or WAV.`));
    };
    const thumbnail = (source: CanvasImageSource, width: number, height: number) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext("2d");
        if (!context) return undefined;
        const scale = Math.max(canvas.width / width, canvas.height / height);
        context.drawImage(source, (canvas.width - width * scale) / 2, (canvas.height - height * scale) / 2, width * scale, height * scale);
        return canvas.toDataURL("image/jpeg", 0.72);
      } catch { return undefined; }
    };
    if (kind === "image") {
      const image = new Image();
      image.onload = () => {
        if (settled) return;
        settled = true;
        const result = { duration: 6, width: image.naturalWidth, height: image.naturalHeight, thumbnail: thumbnail(image, image.naturalWidth, image.naturalHeight) };
        cleanup(); resolve(result);
      };
      image.onerror = fail;
      image.src = url;
      return;
    }
    const element = document.createElement(kind === "video" ? "video" : "audio");
    element.preload = kind === "video" ? "auto" : "metadata";
    element.onloadedmetadata = () => {
      if (settled) return;
      if (!Number.isFinite(element.duration) || element.duration <= 0) { fail(); return; }
      if (kind === "audio") {
        settled = true;
        const result = { duration: element.duration };
        element.removeAttribute("src"); element.load(); cleanup(); resolve(result);
        return;
      }
      const video = element as HTMLVideoElement;
      const finish = () => {
        if (settled) return;
        settled = true;
        const result = { duration: video.duration, width: video.videoWidth, height: video.videoHeight,
          thumbnail: video.readyState >= 2 ? thumbnail(video, video.videoWidth, video.videoHeight) : undefined };
        video.removeAttribute("src"); video.load(); cleanup(); resolve(result);
      };
      video.onloadeddata = finish;
      // Some codecs provide metadata but not a decodable frame.
      video.onerror = fail;
    };
    element.onerror = fail;
    element.src = url;
  });
}

export async function inspectFile(file: File): Promise<MediaAsset> {
  if (!isSupportedFile(file)) throw new Error(`${file.name} is not a supported media file.`);
  const kind = detectKind(file);
  const metadata = await loadMetadata(file, kind);
  const waveform = kind === "audio" ? await extractWaveform(file) : undefined;
  return {
    id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ""), kind, source: "local",
    mime: file.type, size: file.size, ...metadata, waveform,
  };
}