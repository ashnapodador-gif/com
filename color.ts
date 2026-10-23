import { DEFAULT_EFFECTS } from "../editor/defaults";
import type { EffectSettings } from "../editor/types";

export const COLOR_PRESETS: Array<{ name: string; description: string; effects: EffectSettings; previewFilter: string }> = [
  { name: "Original", description: "Natural color", effects: { ...DEFAULT_EFFECTS }, previewFilter: "none" },
  { name: "Cinematic", description: "Rich & restrained", effects: { ...DEFAULT_EFFECTS, contrast: 17, saturation: -10, temperature: 8 }, previewFilter: "contrast(1.17) saturate(.9) sepia(.09)" },
  { name: "Noir", description: "Monochrome mood", effects: { ...DEFAULT_EFFECTS, grayscale: 100, contrast: 25 }, previewFilter: "grayscale(1) contrast(1.25)" },
  { name: "Golden", description: "Soft warm light", effects: { ...DEFAULT_EFFECTS, temperature: 30, saturation: 13, brightness: 5 }, previewFilter: "sepia(.4) saturate(1.13) brightness(1.05)" },
  { name: "Arctic", description: "Cool blue tones", effects: { ...DEFAULT_EFFECTS, temperature: -26, tint: 16, saturation: -6 }, previewFilter: "hue-rotate(17deg) saturate(.94)" },
  { name: "Soft Fade", description: "Vintage softness", effects: { ...DEFAULT_EFFECTS, contrast: -16, saturation: -19, brightness: 8 }, previewFilter: "contrast(.84) saturate(.81) brightness(1.08)" },
];

export function canvasColorFilter(fx: EffectSettings): string {
  return `brightness(${Math.max(0, 100 + fx.brightness + fx.exposure * 18)}%) contrast(${Math.max(0, 100 + fx.contrast)}%) saturate(${Math.max(0, 100 + fx.saturation)}%) blur(${fx.blur}px) grayscale(${fx.grayscale}%) sepia(${Math.max(0, fx.temperature) / 3}%) hue-rotate(${fx.tint * 0.6 - Math.max(0, -fx.temperature) * 0.3}deg)`;
}