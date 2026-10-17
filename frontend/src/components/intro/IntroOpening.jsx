import { useCallback, useEffect, useRef, useState } from 'react';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import Logo from '../Logo';
import { paletteRaw } from '../../theme/theme';
import { createIntroAudio } from './introAudio';
import { markIntroSeen, shouldShowIntro } from './introVisibility';
import './IntroOpening.css';

// Linea de tiempo, en milisegundos desde "Ver presentación"
const ECG_BEATS = [851, 1851]; // momentos en que la linea dibuja cada pico
const RING_START = 3400;
const STEP = 2800;
const FINAL_AT = RING_START + STEP * 4;
const FINAL_HOLD = 6500;
const LEAVE_MS = 800;

const ECG_PATH =
  'M0,60 L280,60 L300,52 L315,60 L325,60 L335,70 L350,10 L365,100 L378,60 ' +
  'L400,60 L425,48 L450,60 L590,60 L610,52 L625,60 L635,60 L645,70 L660,10 ' +
  'L675,100 L688,60 L710,60 L735,48 L760,60 L1000,60';

// Cada pilar completa un cuarto del anillo: los cuatro forman los 360°
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

// Tamaño del logo dentro del anillo final, que escala con la pantalla
function finalLogoSize() {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const ring = Math.min(330, Math.max(210, vmin * 0.44));
  return Math.round(ring * 0.58 * 0.7);
}

// Un cuarto de circulo, arrancando a las 12, con un pequeño espacio en cada punta
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

// onFinish se ejecuta cuando la intro desaparece (el login lo usa para el foco)
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

    markIntroSeen();

    // Saca ?intro de la URL para que al refrescar no se repita
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
    // Se crea aca, dentro del clic, para que el navegador permita el sonido
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

  // Contador de grados: sube 90° cada vez que se dibuja un cuarto
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

  // Esc saltea la intro
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, finish]);

  // La pagina de atras no se desplaza mientras la intro esta en pantalla
  useEffect(() => {
    if (!visible) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  // Limpieza por si se cambia de pagina en medio de la intro
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
