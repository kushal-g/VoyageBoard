import type { TOOL } from '../constants/types'
import './Sidebar.css'
import { IonIcon } from '@ionic/react'
import {
  locationOutline,
  layersOutline,
  searchOutline,
  swapHorizontalOutline,
} from 'ionicons/icons'
import { SketchingIcon } from './icons/sketching-icon'

type SidebarProps = {
  currentTool?: TOOL
  setCurrentTool?: (tool: TOOL) => void
  isOpen?: boolean
}

export default function Sidebar({ currentTool, setCurrentTool, isOpen = false }: SidebarProps) {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
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
          className={`menu-item ${currentTool === 'DOODLE' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('DOODLE')}
          aria-label="Doodle"
        >
          <SketchingIcon className="menu-icon" />
          <span className="menu-label">Doodle</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'GROUP' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('GROUP')}
          aria-label="Group Days"
        >
          <IonIcon icon={layersOutline} className="menu-icon" />
          <span className="menu-label">Group Locations</span>
        </button>

        <button
          className={`menu-item ${currentTool === 'TRANSIT' ? 'selected' : ''}`}
          onClick={() => setCurrentTool && setCurrentTool('TRANSIT')}
          aria-label="Transit"
        >
          <IonIcon icon={swapHorizontalOutline} className="menu-icon" />
          <span className="menu-label">Transit</span>
        </button>
      </div>
    </div>
  )
}
