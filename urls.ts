import type { Project } from "../editor/types";
import { getMedia } from "../utils/db";

const activeUrls = new Set<string>();

export function registerMediaUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeUrls.add(url);
  return url;
}

export function releaseMediaUrls(): void {
  for (const url of activeUrls) URL.revokeObjectURL(url);
  activeUrls.clear();
}

export async function resolveMediaUrls(project: Project): Promise<Record<string, string>> {
  const entries = await Promise.all(project.assets.map(async (asset) => {
    if (asset.source === "builtin") return [asset.id, asset.src ?? ""] as const;
    const file = await getMedia(asset.id);
    return [asset.id, file ? registerMediaUrl(file) : ""] as const;
  }));
  return Object.fromEntries(entries);
}