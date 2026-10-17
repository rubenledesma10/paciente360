import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Recorrido guiado: oscurece la pagina, resalta un elemento por vez y muestra
// una tarjeta al lado. Los elementos se buscan por su atributo data-tour, asi
// que a las paginas solo les hace falta data-tour="nombre" en lo que se resalta.
//
// steps: [{ target?, route?, title, body, welcome? }]
//   target   valor de data-tour, o una lista de valores en orden de
//            preferencia: se usa el primero que este visible (sirve para
//            celular, donde el menu esta escondido detras del boton ☰). Sin
//            target, o si ninguno esta en pantalla, la tarjeta sale centrada.
//   route    pagina a la que hay que ir antes de mostrar el paso.
//   welcome  primera tarjeta con "Empezar" / "Ahora no" en vez del contador.
// onClose(completed): se ejecuta con "Terminar", "Ahora no", la X o Esc.
//
// Montarlo solo mientras tiene que verse: {open && <GuidedTour ... />}

const PAD = 8; // espacio entre el elemento y el borde resaltado
const GAP = 14; // espacio entre el resaltado y la tarjeta
const MARGIN = 12; // distancia minima de la tarjeta al borde de la pantalla
const MOBILE = 600;
const DIM = 'rgba(6, 26, 46, 0.62)';

// Un elemento cuenta como visible si ocupa lugar y no esta corrido fuera de
// la pantalla hacia los costados (como el menu lateral cerrado en celular).
// Si esta mas arriba o mas abajo si cuenta: el recorrido lo trae a la vista.
function isVisible(el) {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth
  );
}

// Busca el primer elemento visible entre los nombres dados, en orden. Puede
// haber varios con el mismo nombre (el menu se dibuja una vez para escritorio
// y otra para celular): se queda con el que se ve.
function findTarget(target) {
  const names = Array.isArray(target) ? target : [target];
  for (const name of names) {
    if (!name) continue;
    const match = [...document.querySelectorAll(`[data-tour="${name}"]`)].find(
      isVisible,
    );
    if (match) return match;
  }
  return null;
}

function sameRect(a, b) {
  return (
    a &&
    b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

export default function GuidedTour({ steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const primaryRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const hasWelcome = Boolean(steps[0]?.welcome);
  const counted = hasWelcome ? steps.length - 1 : steps.length;
  const position = hasWelcome ? index : index + 1;

  const next = () => (isLast ? onClose(true) : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Si el paso es de otra pagina, primero navega hasta ella
  useEffect(() => {
    if (step.route && location.pathname !== step.route) navigate(step.route);
  }, [step, location.pathname, navigate]);

  // Busca el elemento en cada cuadro y lo sigue: contempla paginas que tardan
  // en cargar, desplazamiento suave, cambios de tamaño de ventana y todo lo
  // que se mueva. La primera vez que lo encuentra, lo trae a la vista.
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let raf;
    let last; // undefined hasta la primera medicion
    let scrolled = false;
    const tick = () => {
      const node = findTarget(step.target);
      if (node && !scrolled) {
        scrolled = true;
        node.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
      let measured = null;
      if (node) {
        const r = node.getBoundingClientRect();
        if (r.width || r.height) {
          measured = {
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
          };
        }
      }
      const unchanged =
        last !== undefined && (measured === last || sameRect(measured, last));
      if (!unchanged) {
        last = measured;
        setRect(measured);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Ubica la tarjeta debajo, arriba o al costado del elemento (centrada si no
  // hay elemento). En celulares queda pegada al borde de arriba o de abajo.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = card.style;

    if (vw < MOBILE) {
      // Pegada al borde opuesto al elemento, asi nunca lo tapa
      const targetLow = rect && rect.top + rect.height / 2 > vh / 2;
      Object.assign(s, {
        top: targetLow ? `${MARGIN}px` : 'auto',
        bottom: targetLow ? 'auto' : `${MARGIN}px`,
        left: `${MARGIN}px`,
        right: `${MARGIN}px`,
        width: 'auto',
      });
      return;
    }

    Object.assign(s, { bottom: 'auto', right: 'auto', width: '' });
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let top;
    let left;

    if (!rect) {
      top = (vh - ch) / 2;
      left = (vw - cw) / 2;
    } else {
      const below = rect.top + rect.height + PAD + GAP;
      const above = rect.top - PAD - GAP - ch;
      if (below + ch <= vh - MARGIN) {
        top = below;
      } else if (above >= MARGIN) {
        top = above;
      } else {
        top = rect.top + rect.height / 2 - ch / 2;
        const right = rect.left + rect.width + PAD + GAP;
        left = right + cw <= vw - MARGIN ? right : rect.left - PAD - GAP - cw;
      }
      if (left === undefined) left = rect.left + rect.width / 2 - cw / 2;
    }

    s.left = `${Math.min(Math.max(left, MARGIN), vw - cw - MARGIN)}px`;
    s.top = `${Math.min(Math.max(top, MARGIN), vh - ch - MARGIN)}px`;
  }, [rect, index]);

  // Teclado: flechas para moverse, Esc para salir
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose(false);
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // El boton principal toma el foco en cada paso (Enter avanza)
  useEffect(() => {
    primaryRef.current?.focus();
  }, [index]);

  // Se dibuja directo en <body> (createPortal monta en el mismo render, asi
  // la tarjeta se puede medir y enfocar enseguida)
  return createPortal(
    <Box
      role="dialog"
      aria-modal="true"
      aria-labelledby="p360-tour-title"
      aria-describedby="p360-tour-body"
      sx={{ position: 'fixed', inset: 0, zIndex: 1900 }}
    >
      {/* Bloquea los clics a la pagina mientras dura el recorrido. Sin
          elemento a resaltar, oscurece todo. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: rect ? 'transparent' : DIM,
          transition: 'background-color 0.3s ease',
        }}
      />

      {rect && (
        <Box
          sx={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: '14px',
            boxShadow: `0 0 0 9999px ${DIM}, 0 0 0 3px #29ABE2`,
            pointerEvents: 'none',
            transition:
              'top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
      )}

      <Paper
        ref={cardRef}
        elevation={12}
        sx={{
          position: 'fixed',
          width: 360,
          maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
          p: 2.5,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.5,
            minHeight: 28,
          }}
        >
          <Typography variant="caption" color="#5b7387" fontWeight={600}>
            {step.welcome ? 'Tutorial' : `Paso ${position} de ${counted}`}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onClose(false)}
            aria-label="Salir del tutorial"
            sx={{ mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography
          id="p360-tour-title"
          variant="h6"
          fontWeight={700}
          color="#0E4C82"
          sx={{ mb: 0.75, lineHeight: 1.3 }}
        >
          {step.title}
        </Typography>
        <Typography
          id="p360-tour-body"
          variant="body2"
          color="#334155"
          sx={{ lineHeight: 1.6 }}
        >
          {step.body}
        </Typography>

        <Box
          sx={{
            mt: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          {step.welcome ? (
            <>
              <Button onClick={() => onClose(false)} sx={{ color: '#5b7387' }}>
                Ahora no
              </Button>
              <Button ref={primaryRef} variant="contained" onClick={next}>
                Empezar
              </Button>
            </>
          ) : (
            <>
              {/* Avance: un punto por paso */}
              <Box sx={{ display: 'flex', gap: 0.75 }} aria-hidden="true">
                {Array.from({ length: counted }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: i + 1 === position ? 18 : 7,
                      height: 7,
                      borderRadius: 4,
                      bgcolor: i + 1 <= position ? '#29ABE2' : '#d6e4ef',
                      transition: 'width 0.25s ease',
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {position > 1 && <Button onClick={prev}>Anterior</Button>}
                <Button ref={primaryRef} variant="contained" onClick={next}>
                  {isLast ? 'Terminar' : 'Siguiente'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Box>,
    document.body,
  );
}
