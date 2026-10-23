import { useEffect, useRef, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, AudioLines, Blend, Captions, Check, Circle, Film, Image as ImageIcon, Images, LayoutTemplate, Music2, Paintbrush, Plus, Search, Shapes, SlidersHorizontal, Sparkles, Star, Type, Upload, X, Heart, type LucideIcon } from "lucide-react";
import { COLOR_PRESETS } from "../effects/color";
import type { MediaAsset, ToolTab } from "../editor/types";
import { useEditorStore } from "../store/useEditorStore";
import { RangeField } from "./Ui";

const tools: Array<{ id: ToolTab; label: string; icon: LucideIcon }> = [
  { id: "media", label: "Media", icon: Images },
  { id: "audio", label: "Audio", icon: Music2 },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Shapes", icon: Shapes },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "transitions", label: "Transitions", icon: Blend },
  { id: "filters", label: "Filters", icon: SlidersHorizontal },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "templates", label: "Formats", icon: LayoutTemplate },
  { id: "backgrounds", label: "Canvas", icon: Paintbrush },
];

const backgrounds = ["#101116", "#ffffff", "#111827", "#27334b", "#596981", "#d9b9a2", "#b987ad", "#485e56", "#ddd5c5", "#e79b69"];

function FileTile({ asset, url, onAdd, onRemove }: { asset: MediaAsset; url?: string; onAdd: () => void; onRemove: () => void }) {
  const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("application/x-nexora-asset", asset.id);
    event.dataTransfer.effectAllowed = "copy";
  };
  return <div className="asset-tile-wrap"><button className="asset-tile" draggable onDragStart={onDragStart} onClick={onAdd} title={`Add ${asset.name} to timeline. You can also drag it onto a track.`}>
    <span className="asset-thumb">
      {asset.kind === "audio" ? <span className="asset-audio-thumb"><AudioLines size={28} /></span> : asset.thumbnail || url ? <img src={asset.thumbnail || url} alt="" loading="lazy" /> : <span className="asset-placeholder"><Film size={26} /></span>}
      <span className="asset-add"><Plus size={15} /></span>
      <span className="asset-kind">{asset.kind === "video" ? <Film size={11} /> : asset.kind === "audio" ? <Music2 size={11} /> : <ImageIcon size={11} />}</span>
    </span><span className="asset-name">{asset.name}</span>
  </button><button className="asset-remove" onClick={onRemove} title={`Remove ${asset.name}`} aria-label={`Remove ${asset.name}`}><X size={13} /></button></div>;
}

export function ToolPanel({ onImport, onRemoveAsset, onActivate }: { onImport: (files: FileList | File[], addToTimeline?: boolean) => void; onRemoveAsset: (id: string) => void; onActivate?: () => void }) {
  const active = useEditorStore((state) => state.activeTool);
  const project = useEditorStore((state) => state.project);
  const selectedId = useEditorStore((state) => state.selectedClipId);
  const urls = useEditorStore((state) => state.mediaUrls);
  const [search, setSearch] = useState("");
  const [background, setBackground] = useState("#111827");
  const [visibleCount, setVisibleCount] = useState(48);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setVisibleCount(48), [search, active, project?.id]);
  const selected = project?.clips.find((clip) => clip.id === selectedId);
  const visual = selected && (selected.kind === "video" || selected.kind === "image") ? selected : null;
  const title = tools.find((tool) => tool.id === active)?.label || "Media";
  const assets = project?.assets.filter((asset) => (active === "audio" ? asset.kind === "audio" : true) && asset.name.toLowerCase().includes(search.toLowerCase())) || [];
  const previewThumb = selected?.assetId ? project?.assets.find((asset) => asset.id === selected.assetId)?.thumbnail : project?.assets.find((asset) => asset.kind === "image")?.thumbnail;

  const fileInput = <input ref={fileRef} type="file" accept="video/*,image/*,audio/*,.mov,.m4v,.flac" multiple hidden onChange={(event) => { if (event.target.files) onImport(event.target.files); event.target.value = ""; }} />;
  const addAsset = (asset: MediaAsset) => {
    useEditorStore.getState().addClipFromAsset(asset.id);
    useEditorStore.getState().notify(`${asset.name} added to the timeline.`, "success");
  };
  const toolContent = () => {
    if (active === "media" || active === "audio") return <>
      <div className="panel-intro"><p>{active === "audio" ? "Your soundtrack, your sound." : "Everything you need for your next cut."}</p></div>
      <button className="import-button" onClick={() => fileRef.current?.click()}><Upload size={16} /><span>{active === "audio" ? "Import audio" : "Import media"}</span><Plus size={15} className="import-plus" /></button>
      {fileInput}
      <div className="drop-hint">or drag files into the workspace</div>
      <div className="asset-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your files" aria-label="Search media files" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</div>
      <div className="panel-section-heading"><span>{active === "audio" ? "AUDIO FILES" : "PROJECT FILES"}</span><span>{assets.length}</span></div>
      {assets.length ? <><div className="asset-grid">{assets.slice(0, visibleCount).map((asset) => <FileTile key={asset.id} asset={asset} url={urls[asset.id]} onAdd={() => addAsset(asset)} onRemove={() => onRemoveAsset(asset.id)} />)}</div>{assets.length > visibleCount && <button className="show-more-assets" onClick={() => setVisibleCount((count) => count + 48)}>Show more files ({assets.length - visibleCount} remaining)</button>}</> : <div className="panel-empty"><div className="panel-empty-icon">{active === "audio" ? <Music2 size={21} /> : <Images size={21} />}</div><strong>{search ? "No matching files" : active === "audio" ? "No audio yet" : "No media yet"}</strong><span>{search ? "Try a different search term." : "Import files from your device to get started."}</span></div>}
      {active === "media" && <div className="library-footer"><span className="privacy-dot" /> Files stay on this device</div>}
    </>;
    if (active === "text") return <>
      <div className="panel-intro"><p>Words worth putting on screen.</p></div>
      <button className="add-text-button" onClick={() => useEditorStore.getState().addText(false, "bold")}><Plus size={17} /> Add text to video</button>
      <div className="panel-section-heading"><span>TITLE STYLES</span></div>
      <button className="text-preset text-preset-bold" onClick={() => useEditorStore.getState().addText(false, "bold")}><span>YOUR STORY</span><small>Bold title</small><Plus size={14} /></button>
      <button className="text-preset text-preset-minimal" onClick={() => useEditorStore.getState().addText(false, "minimal")}><span>Make it memorable.</span><small>Editorial serif</small><Plus size={14} /></button>
      <button className="text-preset text-preset-lower" onClick={() => useEditorStore.getState().addText(false, "lower-third")}><span>YOUR NAME <i>CREATIVE DIRECTOR</i></span><small>Lower third</small><Plus size={14} /></button>
      <div className="panel-tip">Double-click a text overlay in the preview to edit it directly.</div>
    </>;
    if (active === "stickers") return <>
      <div className="panel-intro"><p>Simple shapes. More personality.</p></div>
      <div className="panel-section-heading"><span>ADD A SHAPE</span></div>
      <div className="shape-grid">{([ ["star", Star], ["circle", Circle], ["arrow", ArrowRight], ["heart", Heart] ] as const).map(([shape, Icon]) => <button key={shape} onClick={() => useEditorStore.getState().addSticker(shape)}><Icon size={31} strokeWidth={shape === "star" ? 1.8 : 2.4} /><span>{shape}</span></button>)}</div>
      <div className="panel-tip">Shapes are editable overlays. Move them on the canvas or adjust them in Properties.</div>
    </>;
    if (active === "effects" || active === "filters") return <>
      <div className="panel-intro"><p>Give every frame its own feeling.</p></div>
      {!visual && <div className="selection-note"><Sparkles size={16} /> Select a video or image clip to apply a look.</div>}
      <div className="panel-section-heading"><span>COLOR LOOKS</span><span>{COLOR_PRESETS.length}</span></div>
      <div className="filter-grid">{COLOR_PRESETS.map((preset) => {
        const applied = !!visual && JSON.stringify(visual.effects) === JSON.stringify(preset.effects);
        return <button key={preset.name} disabled={!visual} className={`filter-tile ${applied ? "selected" : ""}`} onClick={() => visual && useEditorStore.getState().updateEffects(visual.id, preset.effects)} title={preset.description}>
          <span className="filter-preview" style={{ backgroundImage: previewThumb ? `url("${previewThumb}")` : "linear-gradient(125deg,#33455a,#957d8f,#d3a975)", filter: preset.previewFilter }} />
          <span className="filter-name">{preset.name}{applied && <Check size={12} />}</span>
        </button>;
      })}</div>
      <div className="panel-tip">Fine-tune brightness, contrast, saturation and more in the Color inspector. Looks are included in export.</div>
    </>;
    if (active === "transitions") return <>
      <div className="panel-intro"><p>Make the moments between moments count.</p></div>
      {!selected || selected.kind === "audio" ? <div className="selection-note"><Blend size={16} /> Select a visual clip to edit its transition.</div> : <>
        <div className="panel-section-heading"><span>CLIP FADES</span></div>
        <RangeField label="Fade in" value={selected.fadeIn} min={0} max={Math.min(3, selected.duration / 2)} step={0.1} unit="s" onChange={(value) => useEditorStore.getState().updateClip(selected.id, { fadeIn: value })} />
        <RangeField label="Fade out" value={selected.fadeOut} min={0} max={Math.min(3, selected.duration / 2)} step={0.1} unit="s" onChange={(value) => useEditorStore.getState().updateClip(selected.id, { fadeOut: value })} />
        <div className="panel-section-heading"><span>QUICK SETUPS</span></div>
        <button className="transition-option" onClick={() => useEditorStore.getState().updateClip(selected.id, { fadeIn: .7, fadeOut: .7 })}><span className="transition-icon transition-dissolve"><Blend size={19} /></span><span><strong>Cross dissolve</strong><small>Blend with overlapping clips</small></span><Plus size={15} /></button>
        <button className="transition-option" onClick={() => useEditorStore.getState().updateClip(selected.id, { fadeIn: 0, fadeOut: .8 })}><span className="transition-icon transition-black"><Film size={19} /></span><span><strong>Fade to background</strong><small>A clean cinematic ending</small></span><Plus size={15} /></button>
        <div className="panel-tip">Overlap two clips on a track and fade them in opposite directions for a dissolve.</div>
      </>}
    </>;
    if (active === "captions") return <>
      <div className="panel-intro"><p>Make every word count.</p></div>
      <button className="add-text-button" onClick={() => useEditorStore.getState().addText(true)}><Plus size={17} /> Add manual caption</button>
      <div className="caption-example"><Captions size={20} /><span>Captions you add can be edited, timed and styled just like any other text clip.</span></div>
      <div className="panel-tip">Automatic speech transcription is not enabled. Your media never leaves this device.</div>
    </>;
    if (active === "templates") return <>
      <div className="panel-intro"><p>One story. Every screen.</p></div>
      <div className="panel-section-heading"><span>FRAME FORMATS</span></div>
      <div className="format-grid">{([ ["16:9", "Landscape", "Wide video"], ["9:16", "Vertical", "Short-form video"], ["1:1", "Square", "Social feeds"], ["4:5", "Portrait", "Tall posts"] ] as const).map(([ratio, label, description]) => <button key={ratio} onClick={() => useEditorStore.getState().setRatio(ratio)} className={project?.ratio === ratio ? "selected" : ""}><span className={`format-icon ratio-${ratio.replace(":", "-")}`} /><span><strong>{label}</strong><small>{ratio} / {description}</small></span>{project?.ratio === ratio && <Check size={14} />}</button>)}</div>
      <div className="panel-tip">Reframe your clips using Position and Scale in Properties after changing the format.</div>
    </>;
    return <>
      <div className="panel-intro"><p>Set the scene behind your layers.</p></div>
      <div className="panel-section-heading"><span>BACKGROUND COLOR</span></div>
      <div className="swatch-grid">{backgrounds.map((color) => <button key={color} style={{ backgroundColor: color }} onClick={() => { setBackground(color); useEditorStore.getState().setBackgroundColor(color); }} aria-label={`Set background to ${color}`} title={color} className={project?.backgroundColor === color ? "selected" : ""}>{project?.backgroundColor === color && <Check size={16} color={color === "#ffffff" ? "#111" : "#fff"} />}</button>)}</div>
      <label className="custom-background">Custom color <input type="color" value={/^#[0-9a-f]{6}$/i.test(background) ? background : "#111827"} onChange={(event) => { setBackground(event.target.value); useEditorStore.getState().setBackgroundColor(event.target.value); }} /></label>
      <button className="secondary-button full-width" onClick={() => useEditorStore.getState().addBackgroundClip(background)}><Plus size={16} /> Add color clip to timeline</button>
      <div className="panel-tip">The canvas color fills empty space. Color clips can be trimmed and moved like video clips.</div>
    </>;
  };

  return <>
    <nav className="tool-rail" aria-label="Editing tools">{tools.map(({ id, label, icon: Icon }) => <button key={id} className={`tool-rail-button ${active === id ? "active" : ""}`} onClick={() => { useEditorStore.getState().setActiveTool(id); onActivate?.(); }} title={label} aria-label={label} aria-current={active === id ? "page" : undefined}><Icon size={19} strokeWidth={1.8} /><span>{label}</span></button>)}</nav>
    <aside className="tool-panel" aria-label={`${title} library`} onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); onImport(event.dataTransfer.files); } }}>
      <div className="tool-panel-heading"><div className="eyebrow">CREATE / EDIT</div><h2>{title}</h2></div>
      <motion.div key={active} className="tool-panel-body" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>{toolContent()}</motion.div>
    </aside>
  </>;
}