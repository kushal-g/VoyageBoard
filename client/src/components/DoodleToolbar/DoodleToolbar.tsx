import { useState, useRef, useEffect } from 'react'
import { Toolbar, ToolbarGroup } from '@/components/tiptap-ui-primitive/toolbar'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { UndoIcon } from '@/components/icons/undo-icon'
import { RedoIcon } from '@/components/icons/redo-icon'
import { SketchingIcon } from '@/components/icons/sketching-icon'
import { EraserLineIcon } from '@/components/icons/eraser-line-icon'
import { PenIcon } from '@/components/icons/pen-icon'
import './DoodleToolbar.css'

type DoodleMode = 'DOODLE' | 'ERASER'

interface DoodleToolbarDeps {
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  canUndo?: boolean
  canRedo?: boolean
}

interface DoodleToolbarProps {
  deps: DoodleToolbarDeps
  mode: DoodleMode
  setMode: (mode: DoodleMode) => void
  color: string
  setColor: (color: string) => void
  penSize: number
  setPenSize: (size: number) => void
  eraserSize: number
  setEraserSize: (size: number) => void
}

export default function DoodleToolbar({
  deps,
  mode,
  setMode,
  color,
  setColor,
  penSize,
  setPenSize,
  eraserSize,
  setEraserSize,
}: DoodleToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showPenSizePicker, setShowPenSizePicker] = useState(false)
  const [showEraserSizePicker, setShowEraserSizePicker] = useState(false)
  
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const penSizePickerRef = useRef<HTMLDivElement>(null)
  const eraserSizePickerRef = useRef<HTMLDivElement>(null)

  // Auto-open color picker when popover is shown
  useEffect(() => {
    if (showColorPicker && colorInputRef.current) {
      // Small delay to ensure popover is rendered
      setTimeout(() => {
        colorInputRef.current?.click()
      }, 10)
    }
  }, [showColorPicker])

  // Close popovers when clicking outside (only for pen/eraser size, not color picker)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (penSizePickerRef.current && !penSizePickerRef.current.contains(event.target as Node)) {
        setShowPenSizePicker(false)
      }
      if (eraserSizePickerRef.current && !eraserSizePickerRef.current.contains(event.target as Node)) {
        setShowEraserSizePicker(false)
      }
      // Note: Color picker should only close via X button, not outside click
    }

    if (showPenSizePicker || showEraserSizePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showPenSizePicker, showEraserSizePicker])

  return (
    <div className="doodle-toolbar-container">
      <Toolbar variant="floating" className="doodle-toolbar">
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

        {/* Group 2: Mode Selector */}
        <ToolbarGroup className="toolbar-group">
          <Button
            data-style="ghost"
            data-active={mode === 'DOODLE'}
            onClick={() => setMode('DOODLE')}
            className="mode-button"
            aria-label="Doodle Mode"
          >
            <SketchingIcon />
            <span>Doodle</span>
          </Button>
          <Button
            data-style="ghost"
            data-active={mode === 'ERASER'}
            onClick={() => setMode('ERASER')}
            className="mode-button"
            aria-label="Eraser Mode"
          >
            <EraserLineIcon />
            <span>Eraser</span>
          </Button>
        </ToolbarGroup>

        {/* Group 3: Mode-Dependent Controls */}
        <ToolbarGroup className="toolbar-group">
          {mode === 'DOODLE' ? (
            <>
              {/* Color Picker Button */}
              <div className="control-button-wrapper" ref={colorPickerRef}>
                <Button
                  data-style="ghost"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="control-button"
                  aria-label="Color"
                >
                  <span>Color:</span>
                  <div 
                    className="color-indicator" 
                    style={{ backgroundColor: color }}
                  />
                </Button>
                {showColorPicker && (
                  <div className="popover color-picker-popover">
                    <div className="color-picker-header">
                      <span>Select Color</span>
                      <button
                        className="color-picker-close"
                        onClick={() => setShowColorPicker(false)}
                        aria-label="Close color picker"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value)
                        // Don't close on color change - only close via X button
                      }}
                      className="color-picker-input"
                    />
                  </div>
                )}
              </div>

              {/* Pen Size Button */}
              <div className="control-button-wrapper" ref={penSizePickerRef}>
                <Button
                  data-style="ghost"
                  onClick={() => setShowPenSizePicker(!showPenSizePicker)}
                  className="control-button"
                  aria-label="Pen Size"
                >
                  <PenIcon />
                  <span>Pen Size: {penSize}px</span>
                </Button>
                {showPenSizePicker && (
                  <div className="popover wide">
                    <div className="slider-container">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={penSize}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          setPenSize(value)
                        }}
                        className="size-slider pen-size-slider"
                        style={{
                          '--slider-percent': `${((penSize - 1) / (50 - 1)) * 100}%`
                        } as React.CSSProperties}
                      />
                      <span className="slider-value">{penSize}px</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Eraser Size Button */
            <div className="control-button-wrapper" ref={eraserSizePickerRef}>
              <Button
                data-style="ghost"
                onClick={() => setShowEraserSizePicker(!showEraserSizePicker)}
                className="control-button"
                aria-label="Eraser Size"
              >
                <div className="eraser-icon-circle" />
                <span>Eraser Radius {eraserSize}px</span>
              </Button>
              {showEraserSizePicker && (
                <div className="popover wide">
                  <div className="slider-container">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={eraserSize}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setEraserSize(value)
                      }}
                      className="size-slider eraser-size-slider"
                      style={{
                        '--slider-percent': `${((eraserSize - 5) / (100 - 5)) * 100}%`
                      } as React.CSSProperties}
                    />
                    <span className="slider-value">{eraserSize}px</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ToolbarGroup>
      </Toolbar>
    </div>
  )
}

