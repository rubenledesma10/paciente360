import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNewsById } from '../services/newsService';
import './NewsDetail.css';

function NewsDetail() {
  const { id } = useParams(); // lee el id de la URL para la busqueda.
  const [item, setItem] = useState(null); // la noticia arranca en null, hasta que la encontremos en la bd.

  useEffect(() => {
    getNewsById(id)
      .then((data) => setItem(data))
      .catch((error) => console.error(error));
  }, [id]);

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  // Mientras carga, mostramos un mensaje
  if (!item) {
    return (
      <div className="detail-container">
        <p>Cargando noticia, sea paciente...</p>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <Link to="/noticias" className="detail-back">
        ← Volver a noticias
      </Link>
      <div className="detail-card">
        <span
          className={`news-category ${item.category === 'Prevención' ? 'prevencion' : 'otro'}`}
        >
          {item.category}
        </span>
        <h1 className="detail-title">{item.title}</h1>
        <p className="detail-date">{formatDate(item.date)}</p>
        <p className="detail-content">{item.content}</p>
      </div>
    </div>
  );
}

export default NewsDetail;
