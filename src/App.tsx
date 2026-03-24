import { Routes, Route, Navigate } from 'react-router-dom'
import CanvasListPage from './pages/CanvasListPage'
import CanvasDetailRoomPage from './pages/CanvasDetailRoomPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/canvas" replace />} />
      <Route path="/canvas" element={<CanvasListPage />} />
      <Route path="/canvas/:id" element={<CanvasDetailRoomPage />} />
    </Routes>
  )
}

export default App
