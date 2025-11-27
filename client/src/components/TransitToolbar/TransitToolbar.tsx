import { useState, useRef, useEffect } from 'react'
import { Toolbar, ToolbarGroup } from '@/components/tiptap-ui-primitive/toolbar'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { UndoIcon } from '@/components/icons/undo-icon'
import { RedoIcon } from '@/components/icons/redo-icon'
import { PenIcon } from '@/components/icons/pen-icon'
import './TransitToolbar.css'

interface TransitToolbarDeps {
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  canUndo?: boolean
  canRedo?: boolean
}

interface TransitToolbarProps {
  deps: TransitToolbarDeps
  lineColor: string
  setLineColor: (color: string) => void
  lineWidth: number
  setLineWidth: (width: number) => void
}

export default function TransitToolbar({
  deps,
  lineColor,
  setLineColor,
  lineWidth,
  setLineWidth,
}: TransitToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLineWidthPicker, setShowLineWidthPicker] = useState(false)
  
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const lineWidthPickerRef = useRef<HTMLDivElement>(null)

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
      if (lineWidthPickerRef.current && !lineWidthPickerRef.current.contains(event.target as Node)) {
        setShowLineWidthPicker(false)
      }
    }

    if (showColorPicker || showLineWidthPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showColorPicker, showLineWidthPicker])

  return (
    <div className="transit-toolbar-container">
      <Toolbar variant="floating" className="transit-toolbar">
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

        {/* Group 2: Line Controls */}
        <ToolbarGroup className="toolbar-group">
          {/* Color Picker Button */}
          <div className="control-button-wrapper" ref={colorPickerRef}>
            <Button
              data-style="ghost"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="control-button"
              aria-label="Line Color"
            >
              <span>Color:</span>
              <div 
                className="color-indicator" 
                style={{ backgroundColor: lineColor }}
              />
            </Button>
            {showColorPicker && (
              <div className="popover">
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => {
                    setLineColor(e.target.value)
                    setShowColorPicker(false)
                  }}
                  className="color-picker-input"
                />
              </div>
            )}
          </div>

          {/* Line Width Button */}
          <div className="control-button-wrapper" ref={lineWidthPickerRef}>
            <Button
              data-style="ghost"
              onClick={() => setShowLineWidthPicker(!showLineWidthPicker)}
              className="control-button"
              aria-label="Line Width"
            >
              <PenIcon />
              <span>Width: {lineWidth}px</span>
            </Button>
            {showLineWidthPicker && (
              <div className="popover wide">
                <div className="slider-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="size-slider transit-width-slider"
                    style={{
                      '--slider-percent': `${((lineWidth - 1) / (10 - 1)) * 100}%`
                    } as React.CSSProperties}
                  />
                  <span className="slider-value">{lineWidth}px</span>
                </div>
              </div>
            )}
          </div>
        </ToolbarGroup>
      </Toolbar>
    </div>
  )
}

