import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './pages/Canvas/Canvas'
import type { TOOL } from './constants/types'

function App() {
  const [currentTool, setCurrentTool] = useState<TOOL>("DOODLE")

  return (
    <>
      <Sidebar currentTool={currentTool} setCurrentTool={setCurrentTool} />
      <Canvas currentTool={currentTool} />
    </>
  )
}

export default App