import client from '../api/client';

/**
 * Arma la URL completa de un archivo servido por el backend.
 *
 * El backend guarda rutas tipo '/static/uploads/abc_foto.jpg', que son
 * relativas a el (puerto 5000), no al front (puerto 5173). Sin este prefijo
 * el navegador buscaria la imagen en el servidor de Vite y daria 404.
 */
export function mediaUrl(path) {
  if (!path) return null;
  // Por si algun dia se guardan URLs completas (S3, CDN, etc.)
  if (/^https?:\/\//i.test(path)) return path;

  const base = (client.defaults.baseURL || '').replace(/\/api\/?$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
