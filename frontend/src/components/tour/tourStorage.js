import { APP_SESSION } from '../../utils/appSession';

// Recuerda que tutoriales ya aparecieron en este arranque de la app.
// Igual que la intro, cada uno se ofrece una vez por `npm run dev` (o por
// build nuevo, una vez deployado): al refrescar no vuelve. Siempre se puede
// abrir a mano.
const PREFIX = 'p360_tour_';

export function isTourDone(key) {
  try {
    return localStorage.getItem(PREFIX + key) === APP_SESSION;
  } catch {
    return false;
  }
}

export function markTourDone(key) {
  try {
    localStorage.setItem(PREFIX + key, APP_SESSION);
  } catch {
    // Sin almacenamiento disponible: se va a volver a ofrecer, no se rompe nada
  }
}
