import { useState } from 'react'
import './Sidebar.css'

/**
 * Sidebar Component
 * Uses Material Icons for consistent iOS-style iconography
 */
function Sidebar() {
  // State to track which menu item is currently selected/highlighted
  const [selectedItem, setSelectedItem] = useState<string | null>('location') // Default to location being selected
  // State for search input value
  const [searchQuery, setSearchQuery] = useState('')
  /**
   * Menu items configuration
   * Each item uses Material Icons with appropriate icon names
   */
  const menuItems = [
    { id: 'location', label: 'Location', icon: 'place', color: '#ff3b30' }, // Red location pin
    { id: 'distance', label: 'Distance Measure', icon: 'straighten', color: '#000000' },
    { id: 'doodle', label: 'Doodle', icon: 'draw', color: '#000000' },
    { id: 'text', label: 'Text', icon: 'text_fields', color: '#000000' },
    { id: 'eraser', label: 'Eraser', icon: 'clear', color: '#ff2d55' }, // Pink eraser
    { id: 'group', label: 'Group', icon: 'group', color: '#000000' },
  ]

  /**
   * Handles menu item click events
   * Updates the selected state and can trigger tool activation
   * 
   * @param {string} itemId - The ID of the clicked menu item
   */
  const handleItemClick = (itemId: string) => {
    setSelectedItem(itemId)
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
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${selectedItem === item.id ? 'selected' : ''}`}
            onClick={() => handleItemClick(item.id)}
            aria-label={item.label}
          >
            {/* Material Icon - uses icon name from menuItems config */}
            <span 
              className="material-symbols-outlined menu-icon"
              style={{ color: item.color }}
            >
              {item.icon}
            </span>
            
            {/* Menu item label text */}
            <span className="menu-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
