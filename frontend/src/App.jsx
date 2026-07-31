import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewsAndPrevention from './pages/NewsAndPrevention';
import NewsDetail from './pages/NewsDetail';
import Seguimiento from './pages/Seguimiento';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/noticias" />} />
        <Route path="/noticias" element={<NewsAndPrevention />} />
        <Route path="/noticias/:id" element={<NewsDetail />} />
        <Route path="/seguimiento" element={<Seguimiento />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
