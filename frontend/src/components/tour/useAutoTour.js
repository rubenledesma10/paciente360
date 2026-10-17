import { useState } from 'react';
import { isTourDone, markTourDone } from './tourStorage';

// Maneja si un tutorial esta abierto. Si autoStart es true se abre solo, una
// vez por arranque de la app; con openTour se abre a mano cuando se quiera.
// Se calcula en cada render (no una sola vez al montar) por si los datos de
// la sesion tardan un instante en estar disponibles.
export function useAutoTour(key, autoStart = true) {
  const [manual, setManual] = useState(false);
  // dismissed fuerza el redibujado al cerrar el tutorial que se abrio solo
  // (setManual(false) no alcanza: ya valia false y React no redibuja)
  const [dismissed, setDismissed] = useState(false);

  const open = manual || (autoStart && !dismissed && !isTourDone(key));

  const openTour = () => setManual(true);
  const closeTour = () => {
    markTourDone(key);
    setDismissed(true);
    setManual(false);
  };

  return { open, openTour, closeTour };
}
