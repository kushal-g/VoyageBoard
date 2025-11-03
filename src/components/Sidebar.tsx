import { useState, type Dispatch, type SetStateAction } from 'react'
import './Sidebar.css'
import type { TOOL } from '../constants/types'
import { tools } from '../constants/constants'

interface SidebarProps {
  currentTool: TOOL,
  setCurrentTool: Dispatch<SetStateAction<TOOL>>
}

/**
 * Sidebar Component
 * Uses Material Icons for consistent iOS-style iconography
 */
function Sidebar({ currentTool, setCurrentTool }: SidebarProps) {
  // State for search input value
  const [searchQuery, setSearchQuery] = useState('')


  /**
   * Handles menu item click events
   * Updates the selected state and can trigger tool activation
   * 
   * @param {string} itemId - The ID of the clicked menu item
   */
  const handleItemClick = (itemId: TOOL) => {
    setCurrentTool(itemId)
    // Here you would typically trigger the actual tool/feature
    console.log(`Selected tool: ${itemId}`)
  }

  /**
   * Handles search input changes
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    // Here you could implement search/filter functionality
    console.log(`Search query: ${e.target.value}`)
  }

  return (
    <aside className="sidebar">
      {/* 
        Search Bar Section
        iOS-style search input with magnifying glass icon
      */}
      <div className="search-container">
        <div className="search-bar">
          {/* Magnifying glass icon on the left - Material Icon */}
          <span className="material-symbols-outlined search-icon">
            search
          </span>

          {/* Search input field */}
          <input
            type="text"
            className="search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* 
        Menu Items Section
        List of tool/feature options with icons and labels
      */}
      <nav className="sidebar-menu">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`menu-item ${currentTool === tool.id ? 'selected' : ''}`}
            onClick={() => handleItemClick(tool.id)}
            aria-label={tool.label}
          >
            {/* Material Icon - uses icon name from menuItems config */}
            <span
              className="material-symbols-outlined menu-icon"
              style={{ color: tool.color }}
            >
              {tool.icon}
            </span>

            {/* Menu item label text */}
            <span className="menu-label">{tool.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
