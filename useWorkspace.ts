import { useCallback, useEffect, useRef, useState } from "react";
import { makeDemoProject, makeProject, projectDuration } from "../editor/defaults";
import type { AspectRatio, Project } from "../editor/types";
import { inspectFile } from "../media/import";
import { registerMediaUrl, releaseMediaUrls, resolveMediaUrls } from "../media/urls";
import { useEditorStore } from "../store/useEditorStore";
import { cleanOrphanedMedia, listProjects, removeProject, saveMedia, saveProject } from "../utils/db";

export function useWorkspace() {
  const [ready, setReady] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const started = useRef(false);
  const deletedIds = useRef(new Set<string>());

  const open = useCallback(async (project: Project) => {
    useEditorStore.getState().setPlaying(false);
    releaseMediaUrls();
    const urls = await resolveMediaUrls(project);
    useEditorStore.getState().openProject(project, urls);
    localStorage.setItem("nexora-last-project", project.id);
    if (project.assets.some((asset) => asset.source === "local" && !urls[asset.id])) {
      useEditorStore.getState().notify("Some media files could not be found in local storage.", "error");
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const boot = async () => {
      try {
        let projects = await listProjects();
        if (!projects.length) {
          const demo = makeDemoProject();
          await saveProject(demo);
          projects = [demo];
        }
        await cleanOrphanedMedia();
        useEditorStore.getState().setProjects(projects);
        const last = localStorage.getItem("nexora-last-project");
        await open(projects.find((project) => project.id === last) || projects.sort((a, b) => b.updatedAt - a.updatedAt)[0]);
      } catch (error) {
        const demo = makeDemoProject();
        useEditorStore.getState().setProjects([demo]);
        useEditorStore.getState().openProject(demo, Object.fromEntries(demo.assets.map((asset) => [asset.id, asset.src || ""])));
        useEditorStore.getState().setSaveStatus("error");
        useEditorStore.getState().notify(error instanceof Error ? `Local storage unavailable: ${error.message}` : "Local storage is unavailable in this browser.", "error");
      } finally {
        setReady(true);
      }
    };
    void boot();
  }, [open]);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (!state.project || state.project === previous.project || state.saveStatus !== "saving") return;
      const snapshot = state.project;
      const existing = timers.get(snapshot.id);
      if (existing) clearTimeout(existing);
      timers.set(snapshot.id, setTimeout(async () => {
        timers.delete(snapshot.id);
        if (deletedIds.current.has(snapshot.id)) return;
        try {
          await saveProject(snapshot);
          if (deletedIds.current.has(snapshot.id)) { await removeProject(snapshot.id); return; }
          const current = useEditorStore.getState();
          current.setProjects([snapshot, ...current.projects.filter((item) => item.id !== snapshot.id)]);
          if (current.project?.id === snapshot.id && current.project.updatedAt === snapshot.updatedAt) current.setSaveStatus("saved");
        } catch (error) {
          useEditorStore.getState().setSaveStatus("error");
          useEditorStore.getState().notify(error instanceof Error ? `Could not save project: ${error.message}` : "Could not save project.", "error");
        }
      }, 650));
    });
    const flush = () => {
      const project = useEditorStore.getState().project;
      if (project) void saveProject(project).catch(() => undefined);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", flush);
      for (const timer of timers.values()) clearTimeout(timer);
      flush();
    };
  }, []);

  const create = useCallback(async (name = "Untitled project", ratio: AspectRatio = "16:9") => {
    const project = makeProject(name, ratio);
    try {
      await saveProject(project);
      useEditorStore.getState().setProjects([project, ...useEditorStore.getState().projects]);
      await open(project);
      useEditorStore.getState().notify("New project created. Import media to get started.", "success");
      return project;
    } catch (error) {
      useEditorStore.getState().notify(error instanceof Error ? error.message : "Could not create project.", "error");
      return null;
    }
  }, [open]);

  const importFiles = useCallback(async (incoming: FileList | File[], addToTimeline = false) => {
    const files = Array.from(incoming);
    if (!files.length) return;
    let imported = 0;
    for (const [index, file] of files.entries()) {
      setImporting(`Importing ${index + 1} of ${files.length}: ${file.name}`);
      try {
        const asset = await inspectFile(file);
        await saveMedia(asset.id, file);
        const state = useEditorStore.getState();
        const end = state.project ? projectDuration(state.project) : 0;
        state.addAsset(asset);
        state.setMediaUrl(asset.id, registerMediaUrl(file));
        if (addToTimeline) useEditorStore.getState().addClipFromAsset(asset.id, end);
        imported++;
      } catch (error) {
        useEditorStore.getState().notify(error instanceof Error ? error.message : `Could not import ${file.name}.`, "error");
      }
    }
    setImporting(null);
    if (imported) useEditorStore.getState().notify(`${imported} file${imported === 1 ? "" : "s"} added to your project.`, "success");
  }, []);

  const importFromDashboard = useCallback(async (files: FileList | File[]) => {
    const project = await create("Untitled project");
    if (project) await importFiles(files, true);
  }, [create, importFiles]);

  const duplicate = useCallback(async (project: Project) => {
    const copy: Project = { ...structuredClone(project), id: crypto.randomUUID(), name: `${project.name} copy`, createdAt: Date.now(), updatedAt: Date.now(), isDemo: false };
    try {
      await saveProject(copy);
      useEditorStore.getState().setProjects([copy, ...useEditorStore.getState().projects]);
      useEditorStore.getState().notify("Project duplicated.", "success");
    } catch (error) { useEditorStore.getState().notify(error instanceof Error ? error.message : "Could not duplicate project.", "error"); }
  }, []);

  const rename = useCallback(async (project: Project, name: string) => {
    if (!name.trim()) return;
    const updated = { ...project, name: name.trim(), updatedAt: Date.now() };
    try {
      await saveProject(updated);
      useEditorStore.getState().setProjects(useEditorStore.getState().projects.map((item) => item.id === project.id ? updated : item));
      if (useEditorStore.getState().project?.id === project.id) useEditorStore.getState().openProject(updated, useEditorStore.getState().mediaUrls);
    } catch { useEditorStore.getState().notify("Could not rename project.", "error"); }
  }, []);

  const remove = useCallback(async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    deletedIds.current.add(project.id);
    try {
      await removeProject(project.id);
      const remaining = useEditorStore.getState().projects.filter((item) => item.id !== project.id);
      useEditorStore.getState().setProjects(remaining);
      if (useEditorStore.getState().project?.id === project.id) {
        if (remaining.length) await open(remaining[0]);
        else await create();
      }
      useEditorStore.getState().notify("Project deleted.", "success");
    } catch { deletedIds.current.delete(project.id); useEditorStore.getState().notify("Could not delete project.", "error"); }
  }, [create, open]);

  const removeAsset = useCallback(async (id: string) => {
    const state = useEditorStore.getState();
    const asset = state.project?.assets.find((item) => item.id === id);
    if (!asset) return;
    const count = state.project?.clips.filter((clip) => clip.assetId === id).length || 0;
    if (!window.confirm(`Remove "${asset.name}" from this project${count ? ` and its ${count} timeline clip${count === 1 ? "" : "s"}` : ""}?`)) return;
    state.removeAsset(id);
    state.notify("Media removed. You can undo this action.", "info");
  }, []);

  const saveNow = useCallback(async () => {
    const project = useEditorStore.getState().project;
    if (!project) return;
    try {
      await saveProject(project);
      useEditorStore.getState().setSaveStatus("saved");
      useEditorStore.getState().notify("Project saved on this device.", "success");
    } catch { useEditorStore.getState().setSaveStatus("error"); useEditorStore.getState().notify("Could not save project.", "error"); }
  }, []);

  return { ready, importing, open, create, importFiles, importFromDashboard, duplicate, rename, remove, removeAsset, saveNow };
}