import { useRef, useEffect } from 'react'
import { Toolbar, ToolbarGroup } from '@/components/tiptap-ui-primitive/toolbar'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { UndoIcon } from '@/components/icons/undo-icon'
import { RedoIcon } from '@/components/icons/redo-icon'
import { LocationPinIcon } from '@/components/icons/location-pin-icon'
import { TrashIcon } from '@/components/icons/trash-icon'
import './LocationToolbar.css'

interface LocationToolbarDeps {
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  canUndo?: boolean
  canRedo?: boolean
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
}

interface LocationToolbarProps {
  deps: LocationToolbarDeps
  pinLocation: string
  filteredDestinations: string[]
  showSuggestions: boolean
  setShowSuggestions: (show: boolean) => void
  onLocationSelect: (location: string) => void
  onLocationChange: (location: string) => void
  onAddLocation: (canvasRef: React.RefObject<HTMLCanvasElement | null>) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  isDeleteMode: boolean
  onDeleteModeToggle: () => void
  isLoadingSuggestions?: boolean
}

export default function LocationToolbar({
  deps,
  pinLocation,
  filteredDestinations,
  showSuggestions,
  setShowSuggestions,
  onLocationSelect,
  onLocationChange,
  onAddLocation,
  inputRef,
  isDeleteMode,
  onDeleteModeToggle,
  isLoadingSuggestions = false,
}: LocationToolbarProps) {
  const locationInputRef = useRef<HTMLDivElement>(null)

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showSuggestions, setShowSuggestions])

  return (
    <div className="location-toolbar-container">
      <Toolbar variant="floating" className="location-toolbar">
        {/* Group 1: Undo / Redo (Global) */}
        <ToolbarGroup className="toolbar-group">
          <Button
            variant="icon"
            data-style="ghost"
            onClick={deps.undo}
            disabled={!deps.canUndo}
            aria-label="Undo"
          >
            <UndoIcon />
          </Button>
          <Button
            variant="icon"
            data-style="ghost"
            onClick={deps.redo}
            disabled={!deps.canRedo}
            aria-label="Redo"
          >
            <RedoIcon />
          </Button>
        </ToolbarGroup>

        {/* Group 2: Delete Button */}
        <ToolbarGroup className="toolbar-group">
          <Button
            variant="icon"
            data-style="ghost"
            data-active={isDeleteMode}
            onClick={onDeleteModeToggle}
            aria-label="Delete Mode"
            title={isDeleteMode ? "Click to disable delete mode" : "Click to enable delete mode"}
          >
            <TrashIcon />
          </Button>
        </ToolbarGroup>

        {/* Group 3: Location Input and Add Location Button */}
        <ToolbarGroup className="toolbar-group">
          {/* Location Input */}
          <div className="control-button-wrapper" ref={locationInputRef}>
            <Button
              data-style="ghost"
              onClick={() => {
                inputRef.current?.focus()
                setShowSuggestions(filteredDestinations.length > 0)
              }}
              className="control-button location-input-button"
              aria-label="Pin Location"
            >
              <span>Location:</span>
              <input
                ref={inputRef}
                type="text"
                value={pinLocation}
                onChange={(e) => onLocationChange(e.target.value)}
                onFocus={() => {
                  if (pinLocation && filteredDestinations.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                placeholder="Enter location..."
                className="location-input"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pinLocation.trim() && filteredDestinations.length > 0 && deps.canvasRef) {
                    e.preventDefault()
                    onAddLocation(deps.canvasRef)
                  }
                }}
              />
            </Button>
            {showSuggestions && (
              <div className="popover location-suggestions-popover">
                {isLoadingSuggestions ? (
                  <div className="suggestion-item loading">Loading suggestions...</div>
                ) : filteredDestinations.length > 0 ? (
                  filteredDestinations.map((dest, index) => (
                    <div
                      key={index}
                      onClick={() => onLocationSelect(dest)}
                      className="suggestion-item"
                    >
                      {dest}
                    </div>
                  ))
                ) : (
                  <div className="suggestion-item no-results">No locations found</div>
                )}
              </div>
            )}
          </div>

          {/* Add Location Button */}
          <Button
            data-style="ghost"
            onClick={() => {
              if (deps.canvasRef) {
                onAddLocation(deps.canvasRef)
              }
            }}
            disabled={!pinLocation.trim() || filteredDestinations.length === 0}
            className={`add-location-button ${pinLocation.trim() && filteredDestinations.length > 0 ? 'ready' : ''}`}
            aria-label="Add Location"
            title={pinLocation.trim() && filteredDestinations.length > 0 ? 'Click to add location flag on canvas' : 'Enter a valid location first'}
          >
            <LocationPinIcon />
            <span>Add Location</span>
          </Button>
        </ToolbarGroup>
      </Toolbar>
    </div>
  )
}

