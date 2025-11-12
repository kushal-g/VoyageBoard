import type { TOOL } from '../constants/types'
import './Sidebar.css'
import { IonIcon } from '@ionic/react'
import {
  locationOutline,
  mapOutline,
  createOutline,
  layersOutline,
  searchOutline,
  brushOutline,
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
          <IonIcon icon={searchOutline} className="search-icon" />
          <input className="search-input" placeholder="Search" />
        </div>
      </div>

      <div className="sidebar-menu">
        <button
          className={`menu-item ${currentTool === 'LOCATION_PIN' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('LOCATION_PIN')}
          aria-label="Add Location"
        >
          <IonIcon icon={locationOutline} className="menu-icon" />
          <span className="menu-label">Add Location</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'TRANSIT' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('TRANSIT')}
          aria-label="Distance Measure"
        >
          <IonIcon icon={mapOutline} className="menu-icon" />
          <span className="menu-label">Transit</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'DOODLE' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('DOODLE')}
          aria-label="Doodle"
        >
          <IonIcon icon={createOutline} className="menu-icon" />
          <span className="menu-label">Doodle</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'ERASER' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('ERASER')}
          aria-label="Eraser"
        >
          <IonIcon icon={brushOutline} className="menu-icon" />
          <span className="menu-label">Eraser</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'GROUP' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('GROUP')}
          aria-label="Group Days"
        >
          <IonIcon icon={layersOutline} className="menu-icon" />
          <span className="menu-label">Group Locations</span>
        </button>
      </div>
    </div>
  )
}
