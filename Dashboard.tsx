import { useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clapperboard, Copy, Film, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import type { AspectRatio, Project } from "../editor/types";
import { Logo } from "../components/Logo";
import { Modal } from "../components/Ui";
import { useEditorStore } from "../store/useEditorStore";

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, ratio: AspectRatio) => Promise<unknown> }) {
  const [name, setName] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [working, setWorking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    await onCreate(name.trim() || "Untitled project", ratio);
    setWorking(false);
    onClose();
  };
  return <Modal title="Create a new project" onClose={onClose} className="new-project-modal"><form onSubmit={(event) => void submit(event)}><p className="new-project-intro">A blank canvas for your next idea. You can change these settings later.</p><label className="new-project-label">Project name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Give your story a name" /></label><div className="new-project-label">Canvas format</div><div className="new-project-ratios">{([ ["16:9", "Landscape"], ["9:16", "Vertical"], ["1:1", "Square"], ["4:5", "Portrait"] ] as const).map(([value, label]) => <button type="button" key={value} className={ratio === value ? "active" : ""} onClick={() => setRatio(value)}><span className={`format-icon ratio-${value.replace(":", "-")}`} /><strong>{value}</strong><small>{label}</small></button>)}</div><button className="primary-button new-project-submit" type="submit" disabled={working}><Plus size={17} /> {working ? "Creating..." : "Create project"}</button></form></Modal>;
}

function ProjectTile({ project, onOpen, onRename, onDuplicate, onDelete }: { project: Project; onOpen: () => void; onRename: (name: string) => void; onDuplicate: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(project.updatedAt));
  return <motion.article className="project-tile" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .25 }}>
    <button className="project-tile-image" onClick={onOpen} aria-label={`Open ${project.name}`} style={project.thumbnail ? { backgroundImage: `url("${project.thumbnail}")` } : undefined}>{!project.thumbnail && <span className="blank-thumbnail"><Film size={29} /></span>}<span className="project-open-indicator"><ArrowRight size={18} /></span></button>
    <div className="project-tile-info"><div className="project-tile-name">{renaming ? <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onBlur={() => { onRename(name); setRenaming(false); }} onKeyDown={(event) => { if (event.key === "Enter") { onRename(name); setRenaming(false); } if (event.key === "Escape") { setName(project.name); setRenaming(false); } }} aria-label="Rename project" /> : <button onClick={onOpen} title={project.name}>{project.name}</button>}<div className="project-menu-wrap"><button className="project-more" onClick={() => setMenu(!menu)} title="Project actions" aria-label={`Actions for ${project.name}`}><MoreHorizontal size={19} /></button>{menu && <div className="project-dropdown"><button onClick={() => { setMenu(false); onOpen(); }}><FolderOpen size={15} /> Open</button><button onClick={() => { setMenu(false); setRenaming(true); }}><Pencil size={15} /> Rename</button><button onClick={() => { setMenu(false); onDuplicate(); }}><Copy size={15} /> Duplicate</button><div /><button className="danger" onClick={() => { setMenu(false); onDelete(); }}><Trash2 size={15} /> Delete</button></div>}</div></div><div className="project-tile-meta"><span>{project.isDemo ? "Starter project" : project.ratio + " project"}</span><span>{date}</span></div></div>
  </motion.article>;
}

export function Dashboard({ onCreate, onOpen, onImport, onDuplicate, onRename, onDelete, onHelp }: {
  onCreate: (name: string, ratio: AspectRatio) => Promise<unknown>;
  onOpen: (project: Project) => void;
  onImport: (files: FileList | File[]) => void;
  onDuplicate: (project: Project) => void;
  onRename: (project: Project, name: string) => void;
  onDelete: (project: Project) => void;
  onHelp: () => void;
}) {
  const projects = useEditorStore((state) => state.projects);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [showCreate, setShowCreate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "oldest" ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt), [projects, search, sort]);
  return <div className="dashboard-shell" onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); onImport(event.dataTransfer.files); } }}>
    <header className="dashboard-header"><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Nexora Studio home"><Logo /></button><div className="dashboard-header-right"><span className="dashboard-local"><span /> LOCAL WORKSPACE</span><button className="dashboard-help" onClick={onHelp}>Help & shortcuts</button></div></header>
    <main><section className="dashboard-hero" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}demo/valley.jpg")` }}><div className="dashboard-hero-inner"><div className="dashboard-eyebrow"><span className="dash-eyebrow-line" /> YOUR CREATIVE WORKSPACE</div><h1>NEXORA <span>STUDIO.</span></h1><h2>Every story starts somewhere.</h2><p>A powerful space to cut, create, and make it yours. Your projects and media stay right here on your device.</p><div className="dashboard-hero-actions"><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={18} /> Create new project</button><button className="dashboard-import-button" onClick={() => fileRef.current?.click()}><Upload size={18} /> Import media</button></div></div></section>
      <section className="dashboard-projects"><div className="dashboard-section-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Your projects <span>{projects.length.toString().padStart(2, "0")}</span></h2></div><div className="dashboard-filters"><label className="dashboard-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" aria-label="Search projects" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort projects"><option value="recent">Recently edited</option><option value="name">Name A-Z</option><option value="oldest">Oldest first</option></select></div></div>
        {filtered.length ? <div className="projects-grid"><button className="new-project-tile" onClick={() => setShowCreate(true)}><span className="new-project-icon"><Plus size={24} /></span><strong>New project</strong><small>Make something brilliant</small></button><AnimatePresence>{filtered.map((project) => <ProjectTile key={project.id} project={project} onOpen={() => onOpen(project)} onRename={(name) => onRename(project, name)} onDuplicate={() => onDuplicate(project)} onDelete={() => onDelete(project)} />)}</AnimatePresence></div> : <div className="dashboard-no-results"><Clapperboard size={28} /><strong>No projects found</strong><span>Try a different search or create a new one.</span><button onClick={() => { setSearch(""); setShowCreate(true); }}>Create a project <ArrowRight size={15} /></button></div>}
      </section></main>
    <footer className="dashboard-footer"><Logo compact /><span>NEXORA STUDIO <i /> Create without compromise.</span><span>Made for the stories worth telling.</span></footer>
    <input ref={fileRef} type="file" accept="video/*,image/*,audio/*,.mov,.m4v" multiple hidden onChange={(event) => { if (event.target.files) onImport(event.target.files); event.target.value = ""; }} />
    <AnimatePresence>{showCreate && <NewProjectDialog onClose={() => setShowCreate(false)} onCreate={onCreate} />}</AnimatePresence>
  </div>;
}