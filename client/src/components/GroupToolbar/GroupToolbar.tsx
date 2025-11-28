import { useState, useRef, useEffect } from 'react'
import { Toolbar, ToolbarGroup } from '@/components/tiptap-ui-primitive/toolbar'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { UndoIcon } from '@/components/icons/undo-icon'
import { RedoIcon } from '@/components/icons/redo-icon'
import { LayersIcon } from '@/components/icons/layers-icon'
import './GroupToolbar.css'

interface GroupToolbarDeps {
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  canUndo?: boolean
  canRedo?: boolean
}

interface LocationGroup {
  id: string
  color: string
  label: string
  pinIds: number[]
}

interface GroupToolbarProps {
  deps: GroupToolbarDeps
  groupColor: string
  setGroupColor: (color: string) => void
  groupLabel: string
  setGroupLabel: (label: string) => void
  selectedPinCount: number
  onCreateGroup: () => void
  groups: LocationGroup[]
  activeGroupId: string | null
  onUpdateGroupLabel: (groupId: string, newLabel: string) => void
  onDeleteGroup: (groupId: string) => void
  onSetActiveGroup: (groupId: string | null) => void
}

export default function GroupToolbar({
  deps,
  groupColor,
  setGroupColor,
  groupLabel,
  setGroupLabel,
  selectedPinCount,
  onCreateGroup,
  groups,
  activeGroupId,
  onUpdateGroupLabel,
  onDeleteGroup,
  onSetActiveGroup,
}: GroupToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showGroupsMenu, setShowGroupsMenu] = useState(false)
  
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const groupsMenuRef = useRef<HTMLDivElement>(null)

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
      if (groupsMenuRef.current && !groupsMenuRef.current.contains(event.target as Node)) {
        setShowGroupsMenu(false)
      }
    }

    if (showColorPicker || showGroupsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showColorPicker, showGroupsMenu])

  return (
    <div className="group-toolbar-container">
      <Toolbar variant="floating" className="group-toolbar">
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

        {/* Group 2: Create Group Controls */}
        <ToolbarGroup className="toolbar-group">
          {/* Color Picker Button */}
          <div className="control-button-wrapper" ref={colorPickerRef}>
            <Button
              data-style="ghost"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="control-button"
              aria-label="Group Color"
            >
              <span>Color:</span>
              <div 
                className="color-indicator" 
                style={{ backgroundColor: groupColor }}
              />
            </Button>
            {showColorPicker && (
              <div className="popover">
                <input
                  type="color"
                  value={groupColor}
                  onChange={(e) => {
                    setGroupColor(e.target.value)
                    setShowColorPicker(false)
                  }}
                  className="color-picker-input"
                />
              </div>
            )}
          </div>

          {/* Group Label Input */}
          <div className="control-button-wrapper">
            <Button
              data-style="ghost"
              className="control-button label-input-button"
              aria-label="Group Label"
            >
              <span>Label:</span>
              <input
                type="text"
                value={groupLabel}
                onChange={(e) => setGroupLabel(e.target.value)}
                placeholder={`Day ${groups.length + 1}`}
                className="group-label-input"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedPinCount > 0) {
                    onCreateGroup()
                  }
                }}
              />
            </Button>
          </div>

          {/* Create Group Button */}
          <Button
            data-style="ghost"
            onClick={onCreateGroup}
            disabled={selectedPinCount === 0}
            className="create-group-button"
            aria-label="Create Day"
            title={selectedPinCount > 0 ? `Create day with ${selectedPinCount} location${selectedPinCount > 1 ? 's' : ''}` : 'Select locations to create a day'}
          >
            <LayersIcon />
            <span>Create Day ({selectedPinCount})</span>
          </Button>
        </ToolbarGroup>

        {/* Group 3: Existing Groups */}
        {groups.length > 0 && (
          <ToolbarGroup className="toolbar-group">
            <div className="control-button-wrapper" ref={groupsMenuRef}>
              <Button
                data-style="ghost"
                onClick={() => setShowGroupsMenu(!showGroupsMenu)}
                className="control-button"
                aria-label="Days"
                title={`View ${groups.length} day${groups.length !== 1 ? 's' : ''}`}
              >
                <LayersIcon />
                <span>Days ({groups.length})</span>
              </Button>
              {showGroupsMenu && (
                <div className="popover groups-popover">
                  {groups.map(group => (
                    <div
                      key={group.id}
                      className={`group-item ${activeGroupId === group.id ? 'active' : ''}`}
                      style={{
                        borderLeft: `3px solid ${group.color}`
                      }}
                    >
                      <div
                        className="group-color-indicator"
                        style={{ backgroundColor: group.color }}
                      />
                      <input
                        type="text"
                        value={group.label}
                        onChange={(e) => onUpdateGroupLabel(group.id, e.target.value)}
                        className="group-item-label"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="group-item-count">({group.pinIds.length})</span>
                      <Button
                        data-style="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteGroup(group.id)
                        }}
                        className="delete-group-button"
                        aria-label="Delete Group"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ToolbarGroup>
        )}
      </Toolbar>
    </div>
  )
}

