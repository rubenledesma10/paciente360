import { useCallback, useEffect, useRef, useState } from 'react';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import Logo from '../Logo';
import { paletteRaw } from '../../theme/theme';
import { createIntroAudio } from './introAudio';
import './IntroOpening.css';

// The intro shows once per app start: every `npm run dev` (or every new
// build, once deployed) gets a new id, defined in vite.config.js. The browser
// remembers which id it already played, so a page refresh does not replay it.
// It can still be forced with ?intro at the end: localhost:5173/?intro
const SEEN_KEY = 'p360_intro_seen';
// typeof keeps it working (and ESLint quiet) if the define is missing
const APP_SESSION =
  typeof __APP_SESSION__ !== 'undefined' ? String(__APP_SESSION__) : 'default';

// Timeline, in milliseconds from "Ver presentación"
const ECG_BEATS = [851, 1851]; // moments when the line draws each spike
const RING_START = 3400;
const STEP = 2800;
const FINAL_AT = RING_START + STEP * 4;
const FINAL_HOLD = 6500;
const LEAVE_MS = 800;

const ECG_PATH =
  'M0,60 L280,60 L300,52 L315,60 L325,60 L335,70 L350,10 L365,100 L378,60 ' +
  'L400,60 L425,48 L450,60 L590,60 L610,52 L625,60 L635,60 L645,70 L660,10 ' +
  'L675,100 L688,60 L710,60 L735,48 L760,60 L1000,60';

// Each pillar fills a quarter of the ring: four of them make the 360°
const PILLARS = [
  {
    title: 'Turnos sin filas',
    text: 'Sacá tu turno online, con cuenta o sin ella, y recibí la confirmación por mail.',
  },
  {
    title: 'Un solo equipo',
    text: 'Enfermería, médicos y administración trabajan sobre la misma información del paciente.',
  },
  {
    title: 'Seguimiento a tiempo',
    text: 'Cada control e indicación queda registrado, para que ningún paciente quede afuera.',
  },
  {
    title: 'Salud explicada simple',
    text: 'Noticias de prevención en lenguaje claro y un asistente que te guía en la app.',
  },
];

function shouldShowIntro() {
  try {
    if (new URLSearchParams(window.location.search).has('intro')) return true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return false;
    return localStorage.getItem(SEEN_KEY) !== APP_SESSION;
  } catch {
    return false;
  }
}

// Logo size inside the final ring, which scales with the screen
function finalLogoSize() {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const ring = Math.min(330, Math.max(210, vmin * 0.44));
  return Math.round(ring * 0.58 * 0.7);
}

// Quarter of a circle, starting at 12 o'clock, with a small gap at each end
function arcPath(index, r = 100, center = 120, gap = 3) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const a0 = toRad(-90 + index * 90 + gap);
  const a1 = toRad(-90 + (index + 1) * 90 - gap);
  const x0 = center + r * Math.cos(a0);
  const y0 = center + r * Math.sin(a0);
  const x1 = center + r * Math.cos(a1);
  const y1 = center + r * Math.sin(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}

function Wordmark() {
  return (
    <p className="p360i-wordmark">
      Paciente<span>360º</span>
    </p>
  );
}

function LogoMark({ size, className }) {
  return (
    <div className={className}>
      <Logo size={size} />
    </div>
  );
}

// onFinish runs once the intro is gone (used to focus the login form)
export default function IntroOpening({ onFinish }) {
  const [visible, setVisible] = useState(shouldShowIntro);
  const [logoSize] = useState(finalLogoSize);
  const [phase, setPhase] = useState('gate'); // gate | ecg | pillars | final
  const [leaving, setLeaving] = useState(false);
  const [quadrant, setQuadrant] = useState(-1);
  const [degrees, setDegrees] = useState(0);
  const [ripple, setRipple] = useState(0);
  const [muted, setMuted] = useState(false);
  const runtime = useRef({ timers: [], audio: null, finishing: false });
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  const finish = useCallback(() => {
    const rt = runtime.current;
    if (rt.finishing) return;
    rt.finishing = true;
    rt.timers.forEach(clearTimeout);
    rt.timers = [];
    rt.audio?.fadeOutAndClose(LEAVE_MS / 1000);

    try {
      localStorage.setItem(SEEN_KEY, APP_SESSION);
    } catch {
      // Storage unavailable: it will show again next time, nothing breaks
    }

    // Remove ?intro so a reload does not replay it
    const url = new URL(window.location.href);
    if (url.searchParams.has('intro')) {
      url.searchParams.delete('intro');
      window.history.replaceState(
        null,
        '',
        url.pathname + url.search + url.hash,
      );
    }

    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onFinishRef.current?.();
    }, LEAVE_MS);
  }, []);

  const start = () => {
    const rt = runtime.current;
    // Created here, inside the click, so the browser allows the sound
    rt.audio = createIntroAudio();
    rt.audio?.setMuted(muted);
    rt.audio?.startPad();
    setPhase('ecg');

    const at = (ms, fn) => rt.timers.push(setTimeout(fn, ms));

    ECG_BEATS.forEach((ms) => at(ms, () => rt.audio?.heartbeat()));

    PILLARS.forEach((_, i) => {
      at(RING_START + i * STEP, () => {
        setPhase('pillars');
        setQuadrant(i);
        setRipple((n) => n + 1);
        rt.audio?.chime(i);
      });
    });

    at(FINAL_AT, () => {
      setPhase('final');
      setRipple((n) => n + 1);
      rt.audio?.finale();
    });

    at(FINAL_AT + FINAL_HOLD, finish);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    runtime.current.audio?.setMuted(next);
  };

  // Degree counter: climbs 90° each time a quadrant is drawn
  useEffect(() => {
    if (quadrant < 0) return undefined;
    const from = quadrant * 90;
    const to = from + 90;
    const duration = 1300;
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDegrees(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [quadrant]);

  // Esc skips the intro
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, finish]);

  // The page behind does not scroll while the intro is on screen
  useEffect(() => {
    if (!visible) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  // Cleanup if the page changes in the middle of the intro
  useEffect(() => {
    const rt = runtime.current;
    return () => {
      rt.timers.forEach(clearTimeout);
      rt.audio?.close();
    };
  }, []);

  if (!visible) return null;

  const playing = phase !== 'gate';
  const isFinal = phase === 'final';
  const showStage = phase === 'pillars' || isFinal;

  return (
    <div
      className={`p360i-root${leaving ? ' is-leaving' : ''}`}
      style={{ '--p360i-celeste': paletteRaw.celesteL }}
      role="dialog"
      aria-modal="true"
      aria-label="Presentación de Paciente360"
    >
      {/* Controles durante la presentacion */}
      <div className={`p360i-controls${playing ? ' is-on' : ''}`}>
        <button
          type="button"
          className="p360i-icon-btn"
          onClick={toggleMute}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          tabIndex={playing ? 0 : -1}
        >
          {muted ? (
            <VolumeOffIcon fontSize="small" />
          ) : (
            <VolumeUpIcon fontSize="small" />
          )}
        </button>
        {!isFinal && (
          <button
            type="button"
            className="p360i-skip"
            onClick={finish}
            tabIndex={playing ? 0 : -1}
          >
            Saltar
          </button>
        )}
      </div>

      {/* 1. Pantalla de entrada: el clic habilita el sonido */}
      <section className={`p360i-layer${phase === 'gate' ? ' is-on' : ''}`}>
        <LogoMark size={64} className="p360i-gate-logo" />
        <Wordmark />
        <p className="p360i-gate-text">
          Una presentación de 20 segundos, con sonido.
        </p>
        <div className="p360i-actions">
          {phase === 'gate' && (
            <>
              <button
                type="button"
                className="p360i-btn p360i-btn--primary"
                onClick={start}
                autoFocus
              >
                Ver presentación
              </button>
              <button
                type="button"
                className="p360i-btn p360i-btn--ghost"
                onClick={finish}
              >
                Ir al inicio
              </button>
            </>
          )}
        </div>
      </section>

      {/* 2. Latido */}
      <section className={`p360i-layer${phase === 'ecg' ? ' is-on' : ''}`}>
        <svg className="p360i-ecg" viewBox="0 0 1000 120" aria-hidden="true">
          <path d={ECG_PATH} pathLength="1" />
        </svg>
        <p className="p360i-ecg-caption">
          Detrás de cada turno, hay una persona.
        </p>
      </section>

      {/* 3 y 4. El anillo se completa y aparece el logo */}
      <section
        className={`p360i-layer p360i-stage${showStage ? ' is-on' : ''}${isFinal ? ' is-final' : ''}`}
      >
        <div className="p360i-ring-wrap">
          {ripple > 0 && (
            <span key={ripple} className="p360i-ripple" aria-hidden="true" />
          )}
          <svg className="p360i-ring" viewBox="0 0 240 240" aria-hidden="true">
            <circle className="p360i-track" cx="120" cy="120" r="100" />
            {PILLARS.map((p, i) => (
              <path
                key={p.title}
                d={arcPath(i)}
                pathLength="1"
                className={`p360i-arc${quadrant >= i ? ' is-on' : ''}`}
              />
            ))}
          </svg>
          <div className="p360i-center">
            <span className="p360i-deg" aria-hidden="true">
              {degrees}°
            </span>
            <LogoMark size={logoSize} className="p360i-logo" />
          </div>
        </div>

        <div className="p360i-copy" aria-live="polite">
          {isFinal ? (
            <div className="p360i-final">
              <Wordmark />
              <p className="p360i-tagline">La atención primaria, completa.</p>
              <button
                type="button"
                className="p360i-btn p360i-btn--primary"
                onClick={finish}
              >
                Ir al inicio
              </button>
            </div>
          ) : (
            quadrant >= 0 && (
              <div key={quadrant} className="p360i-pillar">
                <h2>{PILLARS[quadrant].title}</h2>
                <p>{PILLARS[quadrant].text}</p>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
