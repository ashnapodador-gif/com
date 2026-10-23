import { openDB } from "idb";
import type { Project } from "../editor/types";

const database = openDB("nexora-studio", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
    if (!db.objectStoreNames.contains("media")) db.createObjectStore("media");
  },
});

export async function listProjects(): Promise<Project[]> {
  return (await (await database).getAll("projects")) as Project[];
}

export async function saveProject(project: Project): Promise<void> {
  await (await database).put("projects", project);
}

export async function removeProject(id: string): Promise<void> {
  const db = await database;
  const project = await db.get("projects", id) as Project | undefined;
  await db.delete("projects", id);
  if (!project) return;
  const remaining = await listProjects();
  for (const asset of project.assets.filter((item) => item.source === "local")) {
    if (!remaining.some((item) => item.assets.some((used) => used.id === asset.id))) {
      await db.delete("media", asset.id);
    }
  }
}

export async function saveMedia(id: string, file: Blob): Promise<void> {
  await (await database).put("media", file, id);
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  return (await (await database).get("media", id)) as Blob | undefined;
}

export async function removeMediaIfUnused(id: string): Promise<void> {
  const projects = await listProjects();
  if (!projects.some((project) => project.assets.some((asset) => asset.id === id))) {
    await (await database).delete("media", id);
  }
}

export async function cleanOrphanedMedia(): Promise<void> {
  const db = await database;
  const referenced = new Set((await listProjects()).flatMap((project) => project.assets.map((asset) => asset.id)));
  for (const id of await db.getAllKeys("media")) {
    if (!referenced.has(String(id))) await db.delete("media", id);
  }
}