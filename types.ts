export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type AssetKind = "video" | "image" | "audio";
export type ClipKind = AssetKind | "text" | "sticker" | "background";
export type ToolTab = "media" | "audio" | "text" | "stickers" | "effects" | "transitions" | "filters" | "captions" | "templates" | "backgrounds";

export interface MediaAsset {
  id: string;
  name: string;
  kind: AssetKind;
  source: "builtin" | "local";
  src?: string;
  thumbnail?: string;
  duration: number;
  width?: number;
  height?: number;
  size?: number;
  mime?: string;
  waveform?: number[];
}

export interface Track {
  id: string;
  name: string;
  kind: "video" | "overlay" | "text" | "audio";
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  solo: boolean;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Crop {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface EffectSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  temperature: number;
  tint: number;
  blur: number;
  grayscale: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  background: string;
  animation: "none" | "fade" | "slide-up";
}

export interface Clip {
  id: string;
  kind: ClipKind;
  trackId: string;
  assetId?: string;
  name: string;
  start: number;
  duration: number;
  sourceStart: number;
  speed: number;
  volume: number;
  muted: boolean;
  opacity: number;
  fadeIn: number;
  fadeOut: number;
  transform: Transform;
  crop: Crop;
  effects: EffectSettings;
  motion: "none" | "slow-zoom" | "pan-left";
  text?: string;
  textStyle?: TextStyle;
  sticker?: "star" | "circle" | "arrow" | "heart";
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ratio: AspectRatio;
  fps: number;
  backgroundColor: string;
  tracks: Track[];
  clips: Clip[];
  assets: MediaAsset[];
  thumbnail?: string;
  isDemo?: boolean;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}