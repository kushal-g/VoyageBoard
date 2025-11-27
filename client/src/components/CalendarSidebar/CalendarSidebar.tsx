import { useState } from 'react'
import type { LocationGroup } from '@/pages/Canvas/Canvas'
import type { LocationPin } from '@/pages/Canvas/Canvas'
import './CalendarSidebar.css'

interface CalendarSidebarProps {
  isOpen: boolean
  onClose: () => void
  groups: LocationGroup[]
  pins: LocationPin[]
  onDeleteGroup: (groupId: string) => void
  onUpdateGroupLabel: (groupId: string, newLabel: string) => void
}

export default function CalendarSidebar({
  isOpen,
  onClose,
  groups,
  pins,
  onDeleteGroup,
  onUpdateGroupLabel,
}: CalendarSidebarProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const getLocationName = (pinId: number): string => {
    const pin = pins.find(p => p.id === pinId)
    return pin?.location || 'Unknown Location'
  }

  return (
    <>
      {isOpen && <div className="calendar-sidebar-backdrop" onClick={onClose} />}
      <div className={`calendar-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="calendar-sidebar-header">
          <h2 className="calendar-sidebar-title">Itinerary</h2>
          <button 
            className="calendar-sidebar-close"
            onClick={onClose}
            aria-label="Close Calendar"
          >
            ×
          </button>
        </div>

        <div className="calendar-sidebar-content">
          {groups.length === 0 ? (
            <div className="calendar-empty-state">
              <p>No groups created yet</p>
              <p className="calendar-empty-hint">Select locations and create groups to organize your itinerary</p>
            </div>
          ) : (
            <div className="calendar-groups-list">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="calendar-group-card"
                  style={{
                    borderLeft: `4px solid ${group.color}`,
                  }}
                >
                  <div className="calendar-group-card-header">
                    {editingGroupId === group.id ? (
                      <input
                        type="text"
                        value={group.label}
                        onChange={(e) => onUpdateGroupLabel(group.id, e.target.value)}
                        onBlur={() => setEditingGroupId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingGroupId(null)
                          }
                        }}
                        className="calendar-group-title-input"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="calendar-group-title"
                        onClick={() => setEditingGroupId(group.id)}
                      >
                        {group.label}
                      </h3>
                    )}
                    <button
                      className="calendar-group-delete"
                      onClick={() => onDeleteGroup(group.id)}
                      aria-label="Delete Group"
                    >
                      ×
                    </button>
                  </div>

                  <div className="calendar-group-locations">
                    {group.pinIds.map((pinId, index) => (
                      <div key={pinId} className="calendar-location-item">
                        <span className="calendar-location-number">{index + 1}.</span>
                        <span className="calendar-location-name">{getLocationName(pinId)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

