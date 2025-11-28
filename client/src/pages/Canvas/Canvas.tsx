import { useRef, useState, useEffect, useCallback } from 'react'
import './Canvas.css'
import type { TOOL } from '../../constants/types'
import { useDoodleTool } from './tools/Doodle'
import { useEraserTool } from './tools/Eraser'
import { useLocationTool } from './tools/Location'
import { useTransitTool } from './tools/Transit'
import { useGroupLocationTool } from './tools/GroupLocation'

interface CanvasProps {
    currentTool: TOOL
    onGroupsChange?: (groups: LocationGroup[]) => void
    onPinsChange?: (pins: LocationPin[]) => void
    onDeleteGroup?: (groupId: string) => void
    onUpdateGroupLabel?: (groupId: string, newLabel: string) => void
    placesToAdd?: Array<{
        name: string
        placeId?: string
        formattedAddress?: string
        coordinates?: { latitude: number; longitude: number }
    }>
    onTransitLinesChange?: (lines: TransitLine[]) => void
}

export interface LocationPin {
    x: number
    y: number
    id: number
    location: string
    color?: string
    groupId?: string
    placeId?: string // Google Places API place ID
}

export interface LocationGroup {
    id: string
    color: string
    label: string
    pinIds: number[]
}

export interface TransitLine {
    start: { x: number; y: number }
    end: { x: number; y: number }
    distance: number
    id: number
    transitOptions?: Array<{
        type: 'drive' | 'bus' | 'train' | 'flight' | 'walk' | 'bicycle'
        duration: string
        distance?: string
        cost?: string
        icon: string
    }>
    selectedOptionIndex?: number
    lineColor?: string
    lineWidth?: number
}

export default function Canvas({ currentTool, onGroupsChange, onPinsChange, onDeleteGroup, onUpdateGroupLabel, placesToAdd, onTransitLinesChange }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [history, setHistory] = useState<ImageData[]>([])
    const [historyStep, setHistoryStep] = useState(-1)
    const [pins, setPins] = useState<LocationPin[]>([])
    const [groups, setGroups] = useState<LocationGroup[]>([])
    const [transitLines, setTransitLines] = useState<TransitLine[]>([])
    const addedPlacesRef = useRef<Set<string>>(new Set())

    // Notify parent of changes
    useEffect(() => {
        if (onGroupsChange) {
            onGroupsChange(groups)
        }
    }, [groups, onGroupsChange])

    useEffect(() => {
        if (onPinsChange) {
            onPinsChange(pins)
        }
    }, [pins, onPinsChange])

    useEffect(() => {
        if (onTransitLinesChange) {
            onTransitLinesChange(transitLines)
        }
    }, [transitLines, onTransitLinesChange])

    // Add places from Idea Dump to canvas
    useEffect(() => {
        if (placesToAdd && placesToAdd.length > 0 && canvasRef.current) {
            const canvas = canvasRef.current
            const rect = canvas.getBoundingClientRect()
            const canvasWidth = rect.width
            const canvasHeight = rect.height

            // Filter out places that have already been added
            const newPlaces = placesToAdd.filter(place => {
                const key = place.placeId || place.name
                if (addedPlacesRef.current.has(key)) return false
                addedPlacesRef.current.add(key)
                return true
            })

            if (newPlaces.length === 0) return

            // Calculate positions in a grid layout
            const cols = Math.ceil(Math.sqrt(newPlaces.length))
            const spacing = 150
            const startX = canvasWidth / 2 - (cols - 1) * spacing / 2
            const startY = canvasHeight / 2

            const newPins: LocationPin[] = newPlaces.map((place, index) => {
                const row = Math.floor(index / cols)
                const col = index % cols
                const x = startX + col * spacing
                const y = startY + row * spacing

                // Create new pin
                return {
                    x,
                    y,
                    id: Date.now() + index,
                    location: place.formattedAddress || place.name,
                    color: '#808080',
                    placeId: place.placeId
                }
            })

            // Add all pins at once
            setPins(prev => [...prev, ...newPins])
        }
    }, [placesToAdd])

    // Tool instances
    const doodleTool = useDoodleTool()
    const eraserTool = useEraserTool(pins) // Pass pins to eraser to check for locations
    const locationTool = useLocationTool(pins, setPins, transitLines)
    const transitTool = useTransitTool(pins, transitLines, setTransitLines)
    const groupLocationTool = useGroupLocationTool(pins, setPins, groups, setGroups)

    // Map of tools
    const tools = {
        DOODLE: doodleTool,
        ERASER: eraserTool,
        LOCATION_PIN: locationTool,
        TRANSIT: transitTool,
        GROUP: groupLocationTool,
        // Add more tools here as they are implemented
    }

    // Get current active tool
    const activeTool = tools[currentTool as keyof typeof tools]

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let initialized = false

        const resizeCanvas = (width: number, height: number, saveState = false) => {
            if (width <= 0 || height <= 0) return

            // Get device pixel ratio for high-DPI displays
            const dpr = window.devicePixelRatio || 1
            const scaledWidth = Math.floor(width * dpr)
            const scaledHeight = Math.floor(height * dpr)

            if (scaledWidth === canvas.width && scaledHeight === canvas.height) return

            let imageData: ImageData | null = null
            const oldDpr = canvas.width / parseFloat(canvas.style.width || String(canvas.width))

            if (saveState && canvas.width > 0 && canvas.height > 0) {
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            }

            // Set canvas internal size (scaled for high-DPI)
            canvas.width = scaledWidth
            canvas.height = scaledHeight

            // Set canvas CSS size (actual display size)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`

            // Scale the context to match device pixel ratio
            ctx.scale(dpr, dpr)

            // Fill with white background (using CSS dimensions)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, width, height)

            if (imageData) {
                // Restore imageData at the correct scale
                if (oldDpr === dpr) {
                    ctx.putImageData(imageData, 0, 0)
                } else {
                    // If DPR changed, we need to redraw the image
                    const tempCanvas = document.createElement('canvas')
                    tempCanvas.width = imageData.width
                    tempCanvas.height = imageData.height
                    const tempCtx = tempCanvas.getContext('2d')
                    if (tempCtx) {
                        tempCtx.putImageData(imageData, 0, 0)
                        ctx.drawImage(tempCanvas, 0, 0)
                    }
                }
            }

            // Save initial state only once
            if (!initialized && !imageData) {
                initialized = true
                saveToHistory()
            }
        }

        // Use ResizeObserver to watch container size changes
        const container = canvas.parentElement
        if (container) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect
                    resizeCanvas(width, height, initialized)
                }
            })

            resizeObserver.observe(container)

            return () => {
                resizeObserver.disconnect()
            }
        }
    }, [])


    const saveToHistory = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const newHistory = history.slice(0, historyStep + 1)
        newHistory.push(imageData)
        setHistory(newHistory)
        setHistoryStep(newHistory.length - 1)
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        saveToHistory()
    }

    const undo = () => {
        if (historyStep > 0) {
            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const newStep = historyStep - 1
            setHistoryStep(newStep)
            ctx.putImageData(history[newStep], 0, 0)
        }
    }

    const redo = () => {
        if (historyStep < history.length - 1) {
            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const newStep = historyStep + 1
            setHistoryStep(newStep)
            ctx.putImageData(history[newStep], 0, 0)
        }
    }

    // Helper function to redraw a transit line
    const redrawTransitLine = useCallback((ctx: CanvasRenderingContext2D, line: TransitLine) => {
        ctx.save()

        const color = line.lineColor || '#000000'
        const width = line.lineWidth || 3

        // Draw the line
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.setLineDash([10, 5])

        ctx.beginPath()
        ctx.moveTo(line.start.x, line.start.y)
        ctx.lineTo(line.end.x, line.end.y)
        ctx.stroke()

        ctx.setLineDash([])

        // Draw arrow head
        const angle = Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x)
        const arrowLength = 15
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(line.end.x, line.end.y)
        ctx.lineTo(
            line.end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            line.end.y - arrowLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
            line.end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            line.end.y - arrowLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fill()

        // Draw distance label
        const midX = (line.start.x + line.end.x) / 2
        const midY = (line.start.y + line.end.y) / 2
        const labelOffsetY = -15

        ctx.font = 'bold 14px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        let distanceText = `${line.distance} km`
        if (line.transitOptions && line.transitOptions.length > 0 && line.transitOptions[0].distance) {
            const distMatch = line.transitOptions[0].distance.match(/([\d.]+)\s*km/i)
            if (distMatch) {
                distanceText = `${parseFloat(distMatch[1]).toFixed(0)} km`
            }
        }

        const textMetrics = ctx.measureText(distanceText)
        const textWidth = textMetrics.width
        const padding = 6

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.fillRect(
            midX - textWidth / 2 - padding,
            midY + labelOffsetY - 18,
            textWidth + padding * 2,
            22
        )

        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(
            midX - textWidth / 2 - padding,
            midY + labelOffsetY - 18,
            textWidth + padding * 2,
            22
        )

        ctx.fillStyle = color
        ctx.fillText(distanceText, midX, midY + labelOffsetY)

        // Draw transit options panel with selected option
        if (line.transitOptions && line.transitOptions.length > 0) {
            const startPanelY = midY + 30
            const panelWidth = 280
            const rowHeight = 45
            const panelPadding = 12
            const totalHeight = line.transitOptions.length * rowHeight + panelPadding * 2
            const panelX = midX - panelWidth / 2

            // Draw container
            ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
            ctx.shadowBlur = 16
            ctx.shadowOffsetY = 4
            ctx.beginPath()
            ctx.roundRect(panelX, startPanelY, panelWidth, totalHeight, 12)
            ctx.fill()

            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetY = 0

            // Draw options
            line.transitOptions.forEach((option, index) => {
                const y = startPanelY + panelPadding + index * rowHeight
                const isSelected = index === (line.selectedOptionIndex || 0)

                if (isSelected) {
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
                    ctx.beginPath()
                    const inset = 2
                    ctx.roundRect(panelX + inset, y + inset, panelWidth - inset * 2, rowHeight - inset * 2, 8)
                    ctx.fill()
                    
                    ctx.strokeStyle = '#2563eb'
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.roundRect(panelX + inset, y + inset, panelWidth - inset * 2, rowHeight - inset * 2, 8)
                    ctx.stroke()
                }

                if (index > 0) {
                    ctx.strokeStyle = '#e5e7eb'
                    ctx.lineWidth = 1
                    ctx.beginPath()
                    ctx.moveTo(panelX + panelPadding, y)
                    ctx.lineTo(panelX + panelWidth - panelPadding, y)
                    ctx.stroke()
                }

                const iconX = panelX + panelPadding + 8
                const rowCenterY = y + rowHeight / 2

                ctx.font = '24px Arial, sans-serif'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                ctx.fillStyle = isSelected ? '#2563eb' : '#1f2937'
                ctx.fillText(option.icon, iconX, rowCenterY)

                const typeName = option.type === 'drive' ? 'Drive' :
                                option.type === 'bus' ? 'Bus' :
                                option.type === 'train' ? 'Train' :
                                option.type === 'flight' ? 'Flight' :
                                option.type === 'walk' ? 'Walk' :
                                option.type === 'bicycle' ? 'Bicycle' : 'Drive'

                ctx.font = isSelected ? 'bold 15px system-ui, -apple-system, sans-serif' : '15px system-ui, -apple-system, sans-serif'
                ctx.fillStyle = isSelected ? '#2563eb' : '#1f2937'
                ctx.fillText(`${typeName} - ${option.duration || 'N/A'}`, iconX + 38, rowCenterY)

                if (option.cost) {
                    ctx.font = isSelected ? 'bold 15px system-ui, -apple-system, sans-serif' : '15px system-ui, -apple-system, sans-serif'
                    ctx.textAlign = 'right'
                    ctx.fillStyle = isSelected ? '#2563eb' : '#9ca3af'
                    ctx.fillText(option.cost, panelX + panelWidth - panelPadding - 8, rowCenterY)
                }
            })
        }

        ctx.restore()
    }, [])

    // Function to redraw all transit lines (can be called from tools)
    const redrawAllTransitLines = useCallback(() => {
        if (canvasRef.current && transitLines.length > 0) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Redraw all transit lines
            transitLines.forEach((transitLine) => {
                redrawTransitLine(ctx, transitLine)
            })
        }
    }, [transitLines, redrawTransitLine])

    // Redraw transit lines whenever canvas is redrawn or transit lines change
    useEffect(() => {
        if (canvasRef.current && transitLines.length > 0) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Small delay to ensure other redraws complete first
            const timeoutId = setTimeout(() => {
                if (canvasRef.current && ctx) {
                    // Redraw all transit lines
                    transitLines.forEach((transitLine) => {
                        redrawTransitLine(ctx, transitLine)
                    })
                }
            }, 50)

            return () => clearTimeout(timeoutId)
        }
    }, [transitLines, pins, redrawTransitLine])

    // Dependencies to pass to tool handlers
    const toolDeps = {
        saveToHistory,
        clearCanvas,
        undo,
        redo,
        historyStep,
        history,
        canvasRef, // Pass canvas ref to tools
        groups, // Pass groups to tools
        setGroups, // Pass setGroups to tools
        transitLines, // Pass transit lines to tools
        setTransitLines, // Pass setter for transit lines
        redrawTransitLines: redrawAllTransitLines, // Function to redraw all transit lines
    }

    return (
        <div className="canvas-container">
            <canvas
                ref={canvasRef}
                onMouseDown={(e) => activeTool?.onMouseDown(canvasRef, e, toolDeps)}
                onMouseMove={(e) => activeTool?.onMouseMove(canvasRef, e, toolDeps)}
                onMouseUp={(e) => activeTool?.onMouseUp(canvasRef, e, toolDeps)}
                onMouseLeave={(e) => activeTool?.onMouseLeave(canvasRef, e, toolDeps)}
                className="drawing-canvas"
                style={{ cursor: activeTool?.cursor || 'crosshair' }}
            />

            {activeTool?.cursorElement}

            {activeTool?.toolbar && (
                typeof activeTool.toolbar === 'function' 
                    ? activeTool.toolbar(toolDeps)
                    : activeTool.toolbar
            )}
        </div>
    )
}
