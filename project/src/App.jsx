import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import EmailPage from './pages/EmailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path='/email-page/:roomId' element={<EmailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;