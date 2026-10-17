// Decide si se reproduce la intro. Esta separado del componente para que el
// login pueda preguntar "¿va a aparecer la intro?" antes de mostrar el tutorial.
//
// La intro sale una vez por arranque de la app (ver utils/appSession.js): al
// refrescar no se repite, con un nuevo `npm run dev` si.
// Igual se puede forzar agregando ?intro al final: localhost:5173/?intro

import { APP_SESSION } from '../../utils/appSession';

const SEEN_KEY = 'p360_intro_seen';

export function shouldShowIntro() {
  try {
    if (new URLSearchParams(window.location.search).has('intro')) return true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return false;
    return localStorage.getItem(SEEN_KEY) !== APP_SESSION;
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(SEEN_KEY, APP_SESSION);
  } catch {
    // Sin almacenamiento disponible: va a volver a salir, no se rompe nada
  }
}
