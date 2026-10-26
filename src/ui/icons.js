// Tüm ikonlar Lucide'den (https://lucide.dev); oyun ikonları beyaz, renkli kutucuk üzerinde.
import {
  Grip, DraftingCompass, Timer, Palette, Crosshair, Orbit, AudioLines, Ruler,
  Flame, Trophy, Moon, Sun, X, ArrowLeft, ArrowRight, CircleCheck, Share2, RotateCcw,
  Volume2, Medal, CalendarDays, Star, LoaderCircle, CircleAlert, House,
} from 'lucide';
import { icon } from './icon.js';

const game = node => icon(node, { size: 28, stroke: 2.2 });

export const ICONS = {
  nokta: game(Grip),
  aci: game(DraftingCompass),
  zaman: game(Timer),
  renk: game(Palette),
  merkez: game(Crosshair),
  yorunge: game(Orbit),
  ritim: game(AudioLines),
  oran: game(Ruler),
};

export const UI = {
  flame: Flame, trophy: Trophy, moon: Moon, sun: Sun, close: X, back: ArrowLeft, next: ArrowRight,
  check: CircleCheck, share: Share2, replay: RotateCcw, sound: Volume2, medal: Medal,
  calendar: CalendarDays, star: Star, loader: LoaderCircle, alert: CircleAlert, home: House,
};

export { icon };
