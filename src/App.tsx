import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RSVP from './pages/RSVP'
import Thanks from './pages/Thanks'
import Admin from './pages/Admin'
import Reveal from './pages/Reveal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rsvp" element={<RSVP />} />
        <Route path="/thanks" element={<Thanks />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reveal" element={<Reveal />} />
      </Routes>
    </BrowserRouter>
  )
}
