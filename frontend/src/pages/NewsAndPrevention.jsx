import { useState, useEffect } from 'react';
import { getAllNews } from '../services/newsService';

function NewsAndPrevention() {
  // Con el useState se guardan las noticias que traemos del backend
  const [news, setNews] = useState([]);

  // Con el useEffect, esto se ejecuta una vez cuando la página aparece, y trae las noticias
  useEffect(() => {
    getAllNews()
      .then((data) => setNews(data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <div>
      <h1>Noticias y Prevención</h1>
      {news.map((item) => (
        <div key={item.id_news_and_prevention}>
          <h2>{item.title}</h2>
          <p>{item.category}</p>
          <p>{item.content}</p>
        </div>
      ))}
    </div>
  );
}

export default NewsAndPrevention;
