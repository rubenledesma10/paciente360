import { useState, useEffect } from 'react';
import { getAllNews } from '../services/newsService';
import './NewsAndPrevention.css';

function NewsAndPrevention() {
  // Con el useState se guardan las noticias que traemos del backend
  const [news, setNews] = useState([]);

  // Con el useEffect, esto se ejecuta una vez cuando la página aparece, y trae las noticias
  useEffect(() => {
    getAllNews()
      .then((data) => setNews(data))
      .catch((error) => console.error(error));
  }, []);
  // Convertimos el fomrato de la fecha del backend a un formato legible y agradable.
  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="news-container">
      <div className="news-header">
        <h1 className="news-title">Noticias y Prevención</h1>
        <p className="news-subtitle">
          Contenido confiable de salud para vos y tu familia
        </p>
      </div>
      <div className="news-list">
        {news.map((item) => (
          <div className="news-card" key={item.id_news_and_prevention}>
            <div className="news-card-body">
              <span
                className={`news-category ${item.category === 'Prevención' ? 'prevencion' : 'otro'}`}
              >
                {item.category}
              </span>
              <h2 className="news-card-title">{item.title}</h2>
              <p className="news-date">{formatDate(item.date)}</p>
              <p className="news-content">{item.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NewsAndPrevention;
