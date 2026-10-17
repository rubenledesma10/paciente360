// Id que cambia cada vez que se levanta la app (`npm run dev`) o se hace un build.
// Se define en vite.config.js (define: __APP_SESSION__).
// La intro y los tutoriales lo guardan para saber que ya aparecieron en este
// arranque: al refrescar el id se mantiene, con un nuevo `npm run dev` cambia.

// typeof evita que falle (y que ESLint se queje) si falta el define
export const APP_SESSION =
  typeof __APP_SESSION__ !== 'undefined' ? String(__APP_SESSION__) : 'default';
