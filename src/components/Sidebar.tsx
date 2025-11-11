import type { TOOL } from '../constants/types'
import './Sidebar.css'
import { IonIcon, IonList, IonItem, IonLabel, IonSearchbar } from '@ionic/react'
import {
  locationOutline,
  analyticsOutline,
  createOutline,
  trashOutline,
  albumsOutline,
} from 'ionicons/icons'

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
          className={`menu-item ${currentTool === 'LOCATION_PIN' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('LOCATION_PIN')}
          aria-label="Add Location"
        >
          <span className="menu-icon">📍</span>
          <span className="menu-label">Add Location</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'TRANSIT' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('TRANSIT')}
          aria-label="Distance Measure"
        >
          <span className="menu-icon">📏</span>
          <span className="menu-label">Distance Measure</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'DOODLE' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('DOODLE')}
          aria-label="Doodle"
        >
          <span className="menu-icon">✏️</span>
          <span className="menu-label">Doodle</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'ERASER' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('ERASER')}
          aria-label="Eraser"
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
          aria-label="Group Days"
        >
          <span className="menu-icon">📚</span>
          <span className="menu-label">Group Days</span>
        </button>
      </div>
    </div>
  )
}
