import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Film, Keyboard, Layers3, Upload } from "lucide-react";
import { Modal } from "./Ui";

const steps = [
  { number: "01", icon: Upload, title: "Bring your ideas in.", description: "Import your own video, photos and audio. Nothing gets uploaded: your media and projects live locally in this browser.", detail: "Drop files anywhere in the studio, or use Import media in the left library." },
  { number: "02", icon: Layers3, title: "Build your story.", description: "Click a file to add it at the playhead, or drag it onto a track. Move clips, trim their ends, split at the playhead, and stack overlays above your main video.", detail: "Tip: right-click any clip for quick actions. Use the tracks' lock and visibility controls." },
  { number: "03", icon: Film, title: "Make it yours.", description: "Add titles, captions and shapes. Adjust a selected clip in Properties, then export the complete composition as an actual video file.", detail: "Your project saves automatically. Export records in real time, so keep the tab open." },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const finish = () => { localStorage.setItem("nexora-tour-seen", "yes"); onClose(); };
  const current = steps[step];
  const Icon = current.icon;
  return <Modal title="Welcome to your studio" onClose={finish} className="tutorial-modal"><div className="tutorial-content"><div className="tutorial-step-top"><span>{current.number} / 03</span><div className="tutorial-step-icon"><Icon size={25} /></div></div><h3>{current.title}</h3><p>{current.description}</p><div className="tutorial-detail">{current.detail}</div><div className="tutorial-progress">{steps.map((item, index) => <button key={item.number} className={index === step ? "active" : ""} onClick={() => setStep(index)} aria-label={`Go to step ${index + 1}`} />)}</div><div className="tutorial-actions">{step > 0 ? <button className="secondary-button" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button> : <button className="text-button" onClick={finish}>Skip tour</button>}{step < steps.length - 1 ? <button className="primary-button" onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button> : <button className="primary-button" onClick={finish}>Start editing <Check size={16} /></button>}</div><div className="tutorial-shortcuts"><div><Keyboard size={15} /> SHORTCUTS</div><span><kbd>Space</kbd> Play / pause</span><span><kbd>S</kbd> Split</span><span><kbd>Ctrl Z</kbd> Undo</span><span><kbd>Delete</kbd> Remove clip</span></div></div></Modal>;
}