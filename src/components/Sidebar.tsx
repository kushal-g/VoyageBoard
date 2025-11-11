import type { TOOL } from '../constants/types'
import './Sidebar.css'

type SidebarProps = {
  currentTool?: TOOL
  setCurrentTool?: (tool: TOOL) => void
}

export default function Sidebar({ currentTool, setCurrentTool }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="search-container">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Search" />
        </div>
      </div>

      <div className="sidebar-menu">
        <button
          className={`menu-item ${currentTool === 'DOODLE' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('DOODLE')}
        >
          <span className="menu-icon">✏️</span>
          <span className="menu-label">Doodle</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'ERASER' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('ERASER')}
        >
          <span className="menu-icon">🧽</span>
          <span className="menu-label">Eraser</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'LOCATION_PIN' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('LOCATION_PIN')}
        >
          <span className="menu-icon">📍</span>
          <span className="menu-label">Location Pin</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'GROUP' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('GROUP')}
        >
          <span className="menu-icon">📚</span>
          <span className="menu-label">Group Days</span>
        </button>
      </div>
    </div>
  )
}
