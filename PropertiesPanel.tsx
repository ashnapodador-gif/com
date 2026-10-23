import { useEffect, useState, type ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Check, Copy, Film, Image as ImageIcon, Info, LockKeyhole, Music2, Palette, Scissors, SlidersHorizontal, Trash2, Type } from "lucide-react";
import { DEFAULT_TEXT_STYLE, projectDuration } from "../editor/defaults";
import type { Clip, Project, TextStyle } from "../editor/types";
import { useEditorStore } from "../store/useEditorStore";
import { ColorField, IconButton, NumericField, RangeField } from "./Ui";

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="select-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="properties-section"><h3>{title}</h3>{children}</div>;
}

export function PropertiesPanel() {
  const project = useEditorStore((state) => state.project);
  const selectedId = useEditorStore((state) => state.selectedClipId);
  const [tab, setTab] = useState("basic");
  useEffect(() => setTab("basic"), [selectedId]);
  if (!project) return null;
  const clip = project.clips.find((item) => item.id === selectedId);
  const asset = project.assets.find((item) => item.id === clip?.assetId);
  const locked = !!project.tracks.find((track) => track.id === clip?.trackId)?.locked;
  const visual = clip?.kind === "video" || clip?.kind === "image";
  const text = clip?.kind === "text";
  const audio = clip?.kind === "audio";
  const sticker = clip?.kind === "sticker";
  const background = clip?.kind === "background";
  const tabs = visual ? [["basic", "Basic"], ["color", "Color"], ...(clip?.kind === "video" ? [["audio", "Audio"]] : [])] : text ? [["basic", "Text"], ["transform", "Transform"], ["timing", "Timing"]] : audio ? [["basic", "Audio"], ["timing", "Timing"]] : sticker ? [["basic", "Style"], ["transform", "Transform"], ["timing", "Timing"]] : background ? [["basic", "Color"], ["timing", "Timing"]] : [];
  const patch = (changes: Partial<Clip>) => { if (clip) useEditorStore.getState().updateClip(clip.id, changes); };
  const patchText = (changes: Partial<TextStyle>) => { if (clip) useEditorStore.getState().updateTextStyle(clip.id, changes); };
  const style = { ...DEFAULT_TEXT_STYLE, ...clip?.textStyle };

  const transformControls = () => clip && <>
    <Section title="Transform"><div className="property-grid"><NumericField label="Position X" value={clip.transform.x} min={-100} max={200} unit="%" onChange={(value) => useEditorStore.getState().updateTransform(clip.id, { x: value })} /><NumericField label="Position Y" value={clip.transform.y} min={-100} max={200} unit="%" onChange={(value) => useEditorStore.getState().updateTransform(clip.id, { y: value })} /><NumericField label="Scale" value={clip.transform.scale} min={10} max={400} unit="%" onChange={(value) => useEditorStore.getState().updateTransform(clip.id, { scale: value })} /><NumericField label="Rotation" value={clip.transform.rotation} min={-360} max={360} unit="deg" onChange={(value) => useEditorStore.getState().updateTransform(clip.id, { rotation: value })} /></div></Section>
    <Section title="Compositing"><RangeField label="Opacity" value={clip.opacity} min={0} max={100} unit="%" onChange={(value) => patch({ opacity: value })} /></Section>
  </>;

  const timingControls = () => clip && <>
    <Section title="On the timeline"><div className="property-grid"><NumericField label="Start" value={clip.start} min={0} step={.1} unit="s" onChange={(value) => patch({ start: value })} /><NumericField label="Duration" value={clip.duration} min={.2} max={asset && (clip.kind === "video" || clip.kind === "audio") ? (asset.duration - clip.sourceStart) / clip.speed : 36000} step={.1} unit="s" onChange={(value) => patch({ duration: value })} /></div><p className="property-note">Drag the clip edges on the timeline for precise trimming.</p></Section>
    <Section title="Fade"><RangeField label="Fade in" value={clip.fadeIn} min={0} max={Math.min(3, clip.duration / 2)} step={.1} unit="s" onChange={(value) => patch({ fadeIn: value })} /><RangeField label="Fade out" value={clip.fadeOut} min={0} max={Math.min(3, clip.duration / 2)} step={.1} unit="s" onChange={(value) => patch({ fadeOut: value })} /></Section>
    {(clip.kind === "video" || clip.kind === "audio") && <Section title="Playback"><RangeField label="Speed" value={clip.speed} min={.25} max={4} step={.05} unit="x" onChange={(value) => patch({ speed: value, duration: Math.max(.2, clip.duration * clip.speed / value) })} /></Section>}
  </>;

  const audioControls = () => clip && <>
    <Section title="Sound level"><RangeField label="Volume" value={clip.volume} min={0} max={100} unit="%" onChange={(value) => patch({ volume: value })} /><button className={`toggle-row ${clip.muted ? "active" : ""}`} onClick={() => patch({ muted: !clip.muted })}><span>Mute this clip</span><span className="toggle-switch"><i /></span></button></Section>
    <Section title="Audio fades"><RangeField label="Fade in" value={clip.fadeIn} min={0} max={Math.min(3, clip.duration / 2)} step={.1} unit="s" onChange={(value) => patch({ fadeIn: value })} /><RangeField label="Fade out" value={clip.fadeOut} min={0} max={Math.min(3, clip.duration / 2)} step={.1} unit="s" onChange={(value) => patch({ fadeOut: value })} /></Section>
    <p className="property-info"><Info size={14} />Audio from all unmuted tracks is mixed into the final export.</p>
  </>;

  return <aside className="properties-panel" aria-label="Clip properties">
    <div className="properties-heading"><div className="eyebrow">FINE TUNE</div><div className="properties-title-row"><h2>Properties</h2>{clip && <div className="property-actions"><IconButton icon={Scissors} label="Split selected clip" onClick={() => useEditorStore.getState().splitSelected()} disabled={locked} /><IconButton icon={Copy} label="Duplicate selected clip" onClick={() => useEditorStore.getState().duplicateSelected()} disabled={locked} /><IconButton icon={Trash2} label="Delete selected clip" onClick={() => useEditorStore.getState().deleteSelected()} disabled={locked} /></div>}</div></div>
    {clip ? <>
      <div className="selected-clip-summary"><div className={`selected-clip-icon ${clip.kind}`}>{clip.kind === "text" ? <Type size={17} /> : clip.kind === "audio" ? <Music2 size={17} /> : clip.kind === "image" ? <ImageIcon size={17} /> : clip.kind === "background" ? <Palette size={17} /> : clip.kind === "sticker" ? <SlidersHorizontal size={17} /> : <Film size={17} />}</div><div><strong title={clip.name}>{clip.name}</strong><span>{clip.kind === "image" ? "IMAGE" : clip.kind === "video" ? "VIDEO" : clip.kind.toUpperCase()} CLIP <i /> {clip.duration.toFixed(1)} SEC</span></div></div>
      {locked && <div className="locked-notice"><LockKeyhole size={14} /> Unlock this track in the timeline to edit.</div>}
      <div className="properties-tabs" role="tablist" aria-label="Property sections">{tabs.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</div>
      <div className="properties-scroll"><fieldset disabled={locked} className="properties-fieldset">
        {visual && tab === "basic" && <>
          {transformControls()}
          {clip.kind === "video" && <Section title="Playback"><RangeField label="Speed" value={clip.speed} min={.25} max={4} step={.05} unit="x" onChange={(value) => patch({ speed: value, duration: Math.max(.2, clip.duration * clip.speed / value) })} /></Section>}
          <Section title="Motion"><SelectField label="Animation" value={clip.motion} options={[["none", "None"], ["slow-zoom", "Slow zoom"], ["pan-left", "Pan across"]]} onChange={(value) => patch({ motion: value as Clip["motion"] })} /></Section>
          <Section title="Crop"><div className="property-grid"><NumericField label="Top" value={clip.crop.top} min={0} max={95 - clip.crop.bottom} unit="%" onChange={(value) => useEditorStore.getState().updateCrop(clip.id, { top: value })} /><NumericField label="Right" value={clip.crop.right} min={0} max={95 - clip.crop.left} unit="%" onChange={(value) => useEditorStore.getState().updateCrop(clip.id, { right: value })} /><NumericField label="Bottom" value={clip.crop.bottom} min={0} max={95 - clip.crop.top} unit="%" onChange={(value) => useEditorStore.getState().updateCrop(clip.id, { bottom: value })} /><NumericField label="Left" value={clip.crop.left} min={0} max={95 - clip.crop.right} unit="%" onChange={(value) => useEditorStore.getState().updateCrop(clip.id, { left: value })} /></div></Section>
          <Section title="Timing"><div className="property-grid"><NumericField label="Start" value={clip.start} min={0} step={.1} unit="s" onChange={(value) => patch({ start: value })} /><NumericField label="Duration" value={clip.duration} min={.2} max={clip.kind === "video" && asset ? (asset.duration - clip.sourceStart) / clip.speed : 36000} step={.1} unit="s" onChange={(value) => patch({ duration: value })} /></div></Section>
        </>}
        {visual && tab === "color" && <>
          <div className="properties-description">Color adjustments are applied to preview and final export.</div>
          <Section title="Light"><RangeField label="Brightness" value={clip.effects.brightness} min={-100} max={100} unit="%" onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { brightness: value })} /><RangeField label="Exposure" value={clip.effects.exposure} min={-3} max={3} step={.1} onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { exposure: value })} /><RangeField label="Contrast" value={clip.effects.contrast} min={-100} max={100} unit="%" onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { contrast: value })} /></Section>
          <Section title="Color"><RangeField label="Saturation" value={clip.effects.saturation} min={-100} max={100} unit="%" onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { saturation: value })} /><RangeField label="Temperature" value={clip.effects.temperature} min={-100} max={100} onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { temperature: value })} /><RangeField label="Tint" value={clip.effects.tint} min={-100} max={100} onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { tint: value })} /></Section>
          <Section title="Finish"><RangeField label="Blur" value={clip.effects.blur} min={0} max={20} step={.5} unit="px" onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { blur: value })} /><RangeField label="Grayscale" value={clip.effects.grayscale} min={0} max={100} unit="%" onChange={(value) => useEditorStore.getState().updateEffects(clip.id, { grayscale: value })} /></Section>
        </>}
        {visual && tab === "audio" && audioControls()}
        {text && tab === "basic" && <>
          <Section title="Content"><label className="textarea-field"><span>Text on screen</span><textarea value={clip.text || ""} rows={3} onChange={(event) => patch({ text: event.target.value, name: event.target.value.split("\n")[0].slice(0, 35) || "Text" })} /></label></Section>
          <Section title="Typography"><SelectField label="Font family" value={style.fontFamily} options={[["Inter", "Inter"], ["Arial", "Arial"], ["Georgia", "Georgia"], ["Courier New", "Courier New"]]} onChange={(value) => patchText({ fontFamily: value })} /><div className="property-grid"><NumericField label="Size" value={style.fontSize} min={12} max={200} unit="px" onChange={(value) => patchText({ fontSize: value })} /><label className="select-field"><span>Weight</span><select value={style.fontWeight} onChange={(event) => patchText({ fontWeight: Number(event.target.value) })}>{[300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label></div><ColorField label="Text color" value={style.color} onChange={(value) => patchText({ color: value })} /><div className="alignment-field"><span>Alignment</span><div>{([ ["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight] ] as const).map(([align, Icon]) => <button className={style.align === align ? "active" : ""} key={align} onClick={() => patchText({ align })} title={`Align ${align}`} aria-label={`Align ${align}`}><Icon size={17} /></button>)}</div></div><RangeField label="Line spacing" value={style.lineHeight} min={.8} max={2} step={.05} onChange={(value) => patchText({ lineHeight: value })} /><RangeField label="Letter spacing" value={style.letterSpacing} min={-5} max={15} step={.5} unit="px" onChange={(value) => patchText({ letterSpacing: value })} /></Section>
          <Section title="Details"><RangeField label="Outline" value={style.outlineWidth} min={0} max={12} step={.5} unit="px" onChange={(value) => patchText({ outlineWidth: value })} />{style.outlineWidth > 0 && <ColorField label="Outline color" value={style.outlineColor} onChange={(value) => patchText({ outlineColor: value })} />}<button className={`toggle-row ${style.shadow ? "active" : ""}`} onClick={() => patchText({ shadow: !style.shadow })}><span>Drop shadow</span><span className="toggle-switch"><i /></span></button><button className={`toggle-row ${style.background !== "transparent" ? "active" : ""}`} onClick={() => patchText({ background: style.background !== "transparent" ? "transparent" : "#101116" })}><span>Text background</span><span className="toggle-switch"><i /></span></button>{style.background !== "transparent" && <ColorField label="Background" value={style.background} onChange={(value) => patchText({ background: value })} />}</Section>
        </>}
        {text && tab === "transform" && <>{transformControls()}<Section title="Entrance animation"><SelectField label="Animate in" value={style.animation} options={[["none", "None"], ["fade", "Fade in"], ["slide-up", "Slide up"]]} onChange={(value) => patchText({ animation: value as TextStyle["animation"] })} /></Section></>}
        {text && tab === "timing" && timingControls()}
        {audio && tab === "basic" && audioControls()}
        {audio && tab === "timing" && timingControls()}
        {sticker && tab === "basic" && <><Section title="Shape color"><ColorField label="Fill & stroke" value={clip.color || "#b4a3ff"} onChange={(value) => patch({ color: value })} /></Section><Section title="Compositing"><RangeField label="Opacity" value={clip.opacity} min={0} max={100} unit="%" onChange={(value) => patch({ opacity: value })} /></Section></>}
        {sticker && tab === "transform" && transformControls()}
        {sticker && tab === "timing" && timingControls()}
        {background && tab === "basic" && <><Section title="Clip color"><ColorField label="Background" value={clip.color || "#101116"} onChange={(value) => patch({ color: value })} /></Section><Section title="Compositing"><RangeField label="Opacity" value={clip.opacity} min={0} max={100} unit="%" onChange={(value) => patch({ opacity: value })} /></Section></>}
        {background && tab === "timing" && timingControls()}
      </fieldset></div>
    </> : <div className="project-properties"><div className="project-properties-icon"><SlidersHorizontal size={22} /></div><h3>Your project, your canvas.</h3><p>Select a clip on the timeline to edit its details, or adjust your project settings below.</p><Section title="Project settings"><SelectField label="Aspect ratio" value={project.ratio} options={[["16:9", "16:9  Landscape"], ["9:16", "9:16  Vertical"], ["1:1", "1:1  Square"], ["4:5", "4:5  Portrait"]]} onChange={(value) => useEditorStore.getState().setRatio(value as Project["ratio"])} /><SelectField label="Frame rate" value={String(project.fps)} options={[["24", "24 fps"], ["30", "30 fps"], ["60", "60 fps"]]} onChange={(value) => useEditorStore.getState().setFps(Number(value))} /><ColorField label="Canvas color" value={project.backgroundColor} onChange={(value) => useEditorStore.getState().setBackgroundColor(value)} /></Section><div className="project-meta-line"><span>{project.clips.length} timeline clips</span><span>{projectDuration(project).toFixed(1)} seconds</span></div><div className="project-properties-foot"><Check size={14} /> Changes save automatically on this device.</div></div>}
  </aside>;
}