import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NewsAndPrevention from './pages/NewsAndPrevention';
import NewsDetail from './pages/NewsDetail';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/noticias" element={<NewsAndPrevention />} />
        <Route path="/noticias/:id" element={<NewsDetail />} />
        <AppRoutes />
      </Routes>
    </BrowserRouter>
  );

}

export default App;
