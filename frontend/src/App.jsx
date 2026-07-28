import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NewsAndPrevention from './pages/NewsAndPrevention';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/noticias" element={<NewsAndPrevention />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
