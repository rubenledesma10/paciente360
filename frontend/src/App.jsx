import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NewsAndPrevention from './pages/NewsAndPrevention';
import NewsDetail from './pages/NewsDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/noticias" element={<NewsAndPrevention />} />
        <Route path="/noticias/:id" element={<NewsDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
