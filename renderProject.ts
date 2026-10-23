import type { Project } from "../editor/types";
import { projectDuration, ratioDimensions } from "../editor/defaults";
import { TimelineRenderer } from "../editor/renderer";

export type ExportFormat = "mp4" | "webm";
export type ExportResolution = 720 | 1080 | 2160;

export interface ExportProgress {
  phase: string;
  progress: number | null;
}

export interface ExportResult {
  blob: Blob;
  format: ExportFormat;
  warning?: string;
}

export interface ExportOptions {
  project: Project;
  urls: Record<string, string>;
  resolution: ExportResolution;
  fps: number;
  format: ExportFormat;
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Export canceled.", "AbortError");
}

function supportedType(options: string[]): string | undefined {
  return options.find((type) => MediaRecorder.isTypeSupported(type));
}

async function convertToMp4(blob: Blob, signal: AbortSignal, onProgress: ExportOptions["onProgress"]): Promise<Blob> {
  if (blob.size > 130 * 1024 * 1024) throw new Error("This recording is too large for the in-browser MP4 encoder. Download the WebM version instead.");
  onProgress({ phase: "Loading MP4 encoder (first use needs internet)", progress: null });
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  checkAbort(signal);
  const ffmpeg = new FFmpeg();
  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
  const temporaryUrls: string[] = [];
  const abort = () => ffmpeg.terminate();
  signal.addEventListener("abort", abort, { once: true });
  try {
    const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript");
    temporaryUrls.push(coreURL);
    checkAbort(signal);
    const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm");
    temporaryUrls.push(wasmURL);
    checkAbort(signal);
    await ffmpeg.load({ coreURL, wasmURL });
    checkAbort(signal);
    onProgress({ phase: "Encoding MP4 on your device", progress: null });
    await ffmpeg.writeFile("nexora-input.webm", new Uint8Array(await blob.arrayBuffer()));
    checkAbort(signal);
    const exitCode = await ffmpeg.exec([
      "-i", "nexora-input.webm", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart", "nexora-output.mp4",
    ]);
    checkAbort(signal);
    if (exitCode !== 0) throw new Error("The MP4 encoder could not process this recording.");
    const bytes = await ffmpeg.readFile("nexora-output.mp4");
    if (typeof bytes === "string" || !bytes.length) throw new Error("The MP4 encoder returned an empty file.");
    return new Blob([new Uint8Array(bytes)], { type: "video/mp4" });
  } finally {
    signal.removeEventListener("abort", abort);
    ffmpeg.terminate();
    temporaryUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

export async function renderProject(options: ExportOptions): Promise<ExportResult> {
  const { project, urls, resolution, fps, format, signal, onProgress } = options;
  if (!project.clips.length) throw new Error("Add at least one clip to your timeline before exporting.");
  if (project.clips.some((clip) => clip.assetId && !urls[clip.assetId])) {
    throw new Error("A media file is missing from local storage. Re-import the missing file before exporting.");
  }
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error("This browser does not support canvas recording. Use a current version of Chrome, Edge, Firefox, or Safari.");
  }
  const duration = projectDuration(project);
  if (!duration) throw new Error("The project has no playable duration.");
  const [width, height] = ratioDimensions(project.ratio, resolution);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not initialize the video renderer.");
  const renderer = new TimelineRenderer(project, urls);
  const nativeMp4 = format === "mp4" ? supportedType(["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"]) : undefined;
  const webmType = supportedType(["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]);
  const mimeType = nativeMp4 || webmType;
  if (!mimeType) { renderer.dispose(); throw new Error("No supported recording codec was found in this browser."); }
  const recordingFormat: ExportFormat = nativeMp4 ? "mp4" : "webm";
  let audioContext: AudioContext | undefined;
  let outputStream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let animationFrame = 0;
  try {
    checkAbort(signal);
    onProgress({ phase: "Preparing media", progress: null });
    // Start the audio context within the click event that begins export.
    audioContext = new AudioContext();
    void audioContext.resume();
    await document.fonts.ready;
    await renderer.prepare(0);
    checkAbort(signal);
    renderer.sync(0, false, true);
    renderer.draw(ctx, 0, width, height);
    const videoStream = canvas.captureStream(fps);
    const tracks = [...videoStream.getVideoTracks()];
    const entries = renderer.mediaEntries();
    let gains: Array<{ gain: GainNode; clipId: string }> = [];
    if (entries.length) {
      const destination = audioContext.createMediaStreamDestination();
      gains = entries.map(({ clip, element }) => {
        const source = audioContext!.createMediaElementSource(element);
        const gain = audioContext!.createGain();
        gain.gain.value = renderer.audioGain(clip, 0);
        source.connect(gain).connect(destination);
        return { gain, clipId: clip.id };
      });
      tracks.push(...destination.stream.getAudioTracks());
    }
    outputStream = new MediaStream(tracks);
    recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond: resolution === 2160 ? 18000000 : resolution === 1080 ? 9000000 : 4500000 });
    const chunks: BlobPart[] = [];
    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder!.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder!.onerror = () => reject(new Error("The browser encoder stopped unexpectedly. Try a lower resolution."));
      recorder!.onstop = () => {
        const result = new Blob(chunks, { type: mimeType });
        if (!result.size) reject(new Error("The browser did not generate an output file. Try WebM at 720p."));
        else resolve(result);
      };
    });
    onProgress({ phase: "Recording edited timeline", progress: 0 });
    recorder.start(1000);
    const started = performance.now();
    await new Promise<void>((resolve, reject) => {
      const abort = () => { signal.removeEventListener("abort", abort); reject(new DOMException("Export canceled.", "AbortError")); };
      signal.addEventListener("abort", abort, { once: true });
      const tick = () => {
        if (signal.aborted) return;
        const time = Math.min(duration, (performance.now() - started) / 1000);
        renderer.sync(Math.min(time, Math.max(0, duration - 0.001)), time < duration, true);
        for (const item of gains) {
          const clip = project.clips.find((candidate) => candidate.id === item.clipId);
          if (clip) item.gain.gain.value = renderer.audioGain(clip, time);
        }
        renderer.draw(ctx, Math.min(time, Math.max(0, duration - 0.001)), width, height);
        onProgress({ phase: "Recording edited timeline", progress: Math.min(1, time / duration) });
        if (time >= duration) { signal.removeEventListener("abort", abort); resolve(); }
        else animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
    });
    recorder.stop();
    onProgress({ phase: "Finalizing video file", progress: null });
    const blob = await recorded;
    checkAbort(signal);
    if (format === "webm" || recordingFormat === "mp4") return { blob, format: recordingFormat };
    try {
      const mp4 = await convertToMp4(blob, signal, onProgress);
      checkAbort(signal);
      return { blob: mp4, format: "mp4" };
    } catch (error) {
      checkAbort(signal);
      const reason = error instanceof Error ? error.message : "MP4 encoding is unavailable";
      return { blob, format: "webm", warning: `${reason} Your edited WebM is ready instead.` };
    }
  } finally {
    cancelAnimationFrame(animationFrame);
    if (recorder?.state === "recording") recorder.stop();
    outputStream?.getTracks().forEach((track) => track.stop());
    renderer.dispose();
    await audioContext?.close().catch(() => undefined);
  }
}