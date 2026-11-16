// Your studio: the few things about the place itself that are yours to change. Not a settings
// page: four choices, each shown as what it is. They are kept in this browser (localStorage, read
// synchronously so the mat is the right colour before anything is drawn) and are not part of a copy.
import { useEffect, useRef } from 'react';

export interface Prefs {
  mat: 'green' | 'blue' | 'plum' | 'slate';
  /** Paper noises. Off until asked for. */
  sound: boolean;
  /** Things simply appear, whatever the device says about motion. */
  still: boolean;
  /** Larger writing on the back. */
  big: boolean;
  /** How letters are signed, remembered from the last one. */
  sign: string;
}

const KEY = 'scraps:studio';
/** Where the letter page leaves a link the visitor chose to keep, for the table to pick up. */
export const ARRIVED = 'scraps:arrived';
const MATS: [Prefs['mat'], string][] = [['green', 'Green, like a cutting mat'], ['blue', 'Blue'], ['plum', 'Plum'], ['slate', 'Slate']];
const DEFAULT: Prefs = { mat: 'green', sound: false, still: false, big: false, sign: '' };

export function loadPrefs(): Prefs {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
    return {
      mat: MATS.some(([m]) => m === o.mat) ? o.mat! : 'green',
      sound: o.sound === true, still: o.still === true, big: o.big === true,
      sign: typeof o.sign === 'string' ? o.sign.slice(0, 60) : '',
    };
  } catch { return DEFAULT; }
}
export function savePrefs(p: Prefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage refused: the choice lasts until the tab closes */ }
}
export function applyPrefs(p: Prefs): void {
  const d = document.documentElement.dataset;
  d.kMat = p.mat;
  d.kStill = String(p.still);
  d.kBig = String(p.big);
}

interface Props { prefs: Prefs; onChange(p: Prefs): void; onClose(): void }

export function Studio({ prefs, onChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (!dialog.current!.open) dialog.current!.showModal(); }, []);
  const toggle = (key: 'sound' | 'still' | 'big', label: string, note: string) => (
    <label className="k-check">
      <input type="checkbox" checked={prefs[key]} onChange={(e) => onChange({ ...prefs, [key]: e.target.checked })} />
      <span>{label}<small className="k-hand">{note}</small></span>
    </label>
  );
  return (
    <dialog ref={dialog} className="k-send k-studio" aria-labelledby="k-studio-h" onClose={onClose}>
      <h2 id="k-studio-h">Your studio</h2>
      <fieldset className="k-mats">
        <legend className="k-hand">the mat</legend>
        {MATS.map(([mat, name]) => (
          <label key={mat} className={`k-mat k-mat--${mat}`}>
            <input type="radio" name="k-mat" checked={prefs.mat === mat} onChange={() => onChange({ ...prefs, mat })} />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      {toggle('sound', 'Paper noises', 'a rustle when paper lands, turns or is clipped')}
      {toggle('still', 'Keep everything still', 'no landing, turning or wiggling')}
      {toggle('big', 'Bigger writing on the back', 'for long sittings')}
      <p className="k-hand">These are kept in this browser, like everything else here.</p>
      <p className="k-do k-do--small"><button type="button" className="k-button" onClick={() => dialog.current?.close()}>Done</button></p>
    </dialog>
  );
}
