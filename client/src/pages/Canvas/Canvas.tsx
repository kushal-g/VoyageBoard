import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import './Canvas.css'
import type { TOOL } from '../../constants/types'
import { useDoodleTool } from './tools/Doodle'
import { useEraserTool } from './tools/Eraser'
import { useLocationTool } from './tools/Location'
import { useTransitTool } from './tools/Transit'
import { useGroupLocationTool } from './tools/GroupLocation'
import { 
    saveCanvasStateToLocalStorage, 
    loadCanvasStateFromLocalStorage,
    restoreImageDataFromBase64,
    type SerializedCanvasState
} from '../../utils/canvasSerialization'
// Import SVG icons for transit options
import carIcon from '@/components/icons/car-sport-outline (1).svg'
import busIcon from '@/components/icons/bus-outline.svg'
import trainIcon from '@/components/icons/train-outline.svg'
import airplaneIcon from '@/components/icons/airplane-outline.svg'
import walkIcon from '@/components/icons/walk-outline.svg'
import bicycleIcon from '@/components/icons/bicycle-outline.svg'

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
    tripId?: string
    autoSave?: boolean
    onSaveComplete?: () => void
}

export interface CanvasHandle {
    save: () => void
    load: () => Promise<void>
    getState: () => {
        pins: LocationPin[]
        groups: LocationGroup[]
        transitLines: TransitLine[]
        history: ImageData[]
        historyStep: number
    }
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
    isDashed?: boolean // true for dashed, false for solid line
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ 
    currentTool, 
    onGroupsChange, 
    onPinsChange, 
    onDeleteGroup, 
    onUpdateGroupLabel, 
    placesToAdd, 
    onTransitLinesChange,
    tripId,
    autoSave = true,
    onSaveComplete
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [history, setHistory] = useState<ImageData[]>([])
    const [historyStep, setHistoryStep] = useState(-1)
    const [pins, setPins] = useState<LocationPin[]>([])
    const [groups, setGroups] = useState<LocationGroup[]>([])
    const [transitLines, setTransitLines] = useState<TransitLine[]>([])
    const [expandedTransitLineId, setExpandedTransitLineId] = useState<number | null>(null) // Track which line shows options
    const addedPlacesRef = useRef<Set<string>>(new Set())
    const isInitializedRef = useRef(false)
    const isRestoringRef = useRef(false)
    const iconCacheRef = useRef<Map<string, HTMLImageElement>>(new Map()) // Cache for preloaded icons

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

    // Preload all transit icons as images for canvas drawing
    useEffect(() => {
        const iconSrcMap: Record<string, string> = {
            'car-sport-outline': carIcon,
            'bus-outline': busIcon,
            'train-outline': trainIcon,
            'airplane-outline': airplaneIcon,
            'walk-outline': walkIcon,
            'bicycle-outline': bicycleIcon
        }
        
        const cache = iconCacheRef.current
        Object.entries(iconSrcMap).forEach(([iconName, iconSrc]) => {
            if (!cache.has(iconName)) {
                const img = new Image()
                img.onload = () => {
                    cache.set(iconName, img)
                }
                img.src = iconSrc
            }
        })
    }, [])

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

            // Calculate positions in a scattered/random layout
            const margin = 100
            const minSpacing = 150

            const newPins: LocationPin[] = newPlaces.map((place, index) => {
                // Generate scattered random positions
                const x = margin + Math.random() * (canvasWidth - 2 * margin)
                const y = margin + Math.random() * (canvasHeight - 2 * margin)

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
    const transitTool = useTransitTool(pins, transitLines, setTransitLines, expandedTransitLineId, setExpandedTransitLineId)
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

    // Store onSaveComplete in a ref to avoid recreating saveCanvasState
    const onSaveCompleteRef = useRef(onSaveComplete)
    useEffect(() => {
        onSaveCompleteRef.current = onSaveComplete
    }, [onSaveComplete])

    // Save canvas state to localStorage
    const saveCanvasState = useCallback(() => {
        if (!tripId) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        try {
            saveCanvasStateToLocalStorage(
                tripId,
                pins,
                groups,
                transitLines,
                currentImageData,
                history,
                historyStep
            )
            
            if (onSaveCompleteRef.current) {
                onSaveCompleteRef.current()
            }
        } catch (error) {
            console.error('Failed to save canvas state:', error)
        }
    }, [tripId, pins, groups, transitLines, history, historyStep])

    // Load canvas state from localStorage
    const loadCanvasState = useCallback(async () => {
        if (!tripId) return

        const serialized = loadCanvasStateFromLocalStorage(tripId)
        if (!serialized) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        isRestoringRef.current = true

        try {
            // Restore pins, groups, and transit lines
            setPins(serialized.pins || [])
            setGroups(serialized.groups || [])
            setTransitLines(serialized.transitLines || [])

            // Restore canvas image data
            if (serialized.canvasImageData) {
                const imageData = await restoreImageDataFromBase64(
                    serialized.canvasImageData,
                    canvas.width,
                    canvas.height
                )
                if (imageData) {
                    ctx.putImageData(imageData, 0, 0)
                }
            }

            // Restore history
            if (serialized.history && serialized.history.length > 0) {
                const restoredHistory: ImageData[] = []
                for (const base64 of serialized.history) {
                    const imageData = await restoreImageDataFromBase64(
                        base64,
                        canvas.width,
                        canvas.height
                    )
                    if (imageData) {
                        restoredHistory.push(imageData)
                    }
                }
                setHistory(restoredHistory)
                setHistoryStep(serialized.historyStep ?? restoredHistory.length - 1)
            }

            // State updates will trigger redraws via useEffects
            // Just mark restoration as complete
            setTimeout(() => {
                isRestoringRef.current = false
            }, 200)
        } catch (error) {
            console.error('Failed to load canvas state:', error)
            isRestoringRef.current = false
        }
    }, [tripId])

    // Expose save/load methods via ref
    useImperativeHandle(ref, () => ({
        save: saveCanvasState,
        load: loadCanvasState,
        getState: () => ({
            pins,
            groups,
            transitLines,
            history,
            historyStep
        })
    }), [saveCanvasState, loadCanvasState, pins, groups, transitLines, history, historyStep])

    // Auto-save on state changes
    useEffect(() => {
        if (!autoSave || !tripId || isRestoringRef.current || !isInitializedRef.current) return

        // Debounce auto-save
        const timeoutId = setTimeout(() => {
            saveCanvasState()
        }, 1000) // Save 1 second after last change

        return () => clearTimeout(timeoutId)
    }, [pins, groups, transitLines, history, historyStep, autoSave, tripId, saveCanvasState])

    // Load state on mount if tripId is provided
    useEffect(() => {
        if (!tripId) return

        // Reset initialization flag when tripId changes
        isInitializedRef.current = false

        // Wait for canvas to be initialized
        const checkCanvas = setInterval(() => {
            const canvas = canvasRef.current
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                clearInterval(checkCanvas)
                isInitializedRef.current = true
                loadCanvasState()
            }
        }, 100)

        return () => {
            clearInterval(checkCanvas)
            // Reset flag on cleanup when tripId changes
            isInitializedRef.current = false
        }
    }, [tripId, loadCanvasState])

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

    // Helper function to draw an icon on canvas
    const drawIcon = useCallback((ctx: CanvasRenderingContext2D, iconName: string, x: number, y: number, size: number = 20, color: string = '#1f2937') => {
        const cachedIcon = iconCacheRef.current.get(iconName)
        if (cachedIcon && cachedIcon.complete) {
            ctx.save()
            ctx.globalAlpha = 1
            const iconSize = size
            const iconX = x - iconSize / 2
            const iconY = y - iconSize / 2
            
            // Create a temporary canvas to apply color filter
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = iconSize
            tempCanvas.height = iconSize
            const tempCtx = tempCanvas.getContext('2d')
            if (tempCtx) {
                tempCtx.drawImage(cachedIcon, 0, 0, iconSize, iconSize)
                tempCtx.globalCompositeOperation = 'source-in'
                tempCtx.fillStyle = color
                tempCtx.fillRect(0, 0, iconSize, iconSize)
            }
            ctx.drawImage(tempCanvas, iconX, iconY)
            ctx.restore()
        } else {
            // Fallback: draw a simple shape if icon not loaded yet
            ctx.save()
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(x, y, size / 4, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    }, [])

    // Helper function to redraw a transit line
    const redrawTransitLine = useCallback((ctx: CanvasRenderingContext2D, line: TransitLine, expandedLineId: number | null) => {
        ctx.save()

        const color = line.lineColor || '#000000'
        const width = line.lineWidth || 3
        const isDashed = line.isDashed !== false // Default to dashed if not specified

        // Draw the line
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        if (isDashed) {
            ctx.setLineDash([12, 6]) // Dashed line pattern (12px dash, 6px gap) - more visible
        } else {
            ctx.setLineDash([]) // Solid line - empty array means solid
        }

        ctx.beginPath()
        ctx.moveTo(line.start.x, line.start.y)
        ctx.lineTo(line.end.x, line.end.y)
        ctx.stroke()

        // Reset line dash after drawing
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

        // Extract distance from transit options if available (more accurate than stored distance)
        let distanceText = `${line.distance} km`
        if (line.transitOptions && line.transitOptions.length > 0) {
            // Try to get distance from the selected option, or first option
            const selectedIndex = line.selectedOptionIndex || 0
            const option = line.transitOptions[selectedIndex] || line.transitOptions[0]
            if (option && option.distance) {
                const distStr = option.distance.toString()
                // Match format like "5.2 km (3.2 mi)" or "5.2 km"
                const distMatch = distStr.match(/([\d.]+)\s*km/i)
                if (distMatch) {
                    const distanceKm = parseFloat(distMatch[1])
                    distanceText = `${Math.round(distanceKm)} km`
                } else {
                    // Try meters format
                    const mMatch = distStr.match(/([\d.]+)\s*m/i)
                    if (mMatch) {
                        const distanceM = parseFloat(mMatch[1])
                        distanceText = `${Math.round(distanceM / 1000)} km`
                    }
                }
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

        // Draw transit options panel ONLY when this line is expanded (clicked)
        const isExpanded = expandedLineId === line.id
        const shouldShowOptions = isExpanded && line.transitOptions && line.transitOptions.length > 0
        // Show empty state if expanded and transit options are empty array (tried to fetch but got nothing)
        // Don't show if transitOptions is undefined (never tried to fetch - no placeIds)
        const shouldShowEmptyState = isExpanded && Array.isArray(line.transitOptions) && line.transitOptions.length === 0
        
        // Hover preview: show a simplified preview on hover (if not expanded)
        if (shouldShowOptions) {
            const startPanelY = midY + 30
            const panelWidth = 260
            const rowHeight = 40
            const panelPadding = 10
            const totalHeight = (line.transitOptions?.length || 0) * rowHeight + panelPadding * 2
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
            line.transitOptions?.forEach((option, index) => {
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

                const iconX = panelX + panelPadding + 18
                const rowCenterY = y + rowHeight / 2
                const iconColor = isSelected ? '#2563eb' : '#6b7280'
                
                // Draw icon using the helper function
                if (option.icon && option.icon.length > 1 && !option.icon.match(/[\u{1F300}-\u{1F9FF}]/u)) {
                    // It's an icon name - draw the actual SVG icon
                    drawIcon(ctx, option.icon, iconX, rowCenterY, 20, iconColor)
                } else {
                    // Fallback to text (emoji) if icon name not recognized
                    ctx.font = '18px Arial, sans-serif'
                    ctx.textAlign = 'left'
                    ctx.textBaseline = 'middle'
                    ctx.fillStyle = iconColor
                    ctx.fillText(option.icon || '🚗', iconX - 10, rowCenterY)
                }

                const typeName = option.type === 'drive' ? 'Drive' :
                                option.type === 'bus' ? 'Bus' :
                                option.type === 'train' ? 'Train' :
                                option.type === 'flight' ? 'Flight' :
                                option.type === 'walk' ? 'Walk' :
                                option.type === 'bicycle' ? 'Bicycle' : 'Drive'

                // Smaller, cleaner font
                ctx.font = isSelected ? '600 12px system-ui, -apple-system, sans-serif' : '12px system-ui, -apple-system, sans-serif'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                ctx.fillStyle = isSelected ? '#2563eb' : '#1f2937'
                ctx.fillText(`${typeName} - ${option.duration || 'N/A'}`, iconX + 30, rowCenterY)

                if (option.cost) {
                    ctx.font = isSelected ? '600 12px system-ui, -apple-system, sans-serif' : '12px system-ui, -apple-system, sans-serif'
                    ctx.textAlign = 'right'
                    ctx.fillStyle = isSelected ? '#2563eb' : '#6b7280'
                    ctx.fillText(option.cost, panelX + panelWidth - panelPadding - 8, rowCenterY)
                }
            })
        }
        
        // Draw empty state message if line is expanded but has no transit options
        if (shouldShowEmptyState) {
            const startPanelY = midY + 30
            const panelWidth = 280
            const panelHeight = 60
            const panelX = midX - panelWidth / 2
            
            // Draw container
            ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
            ctx.shadowBlur = 16
            ctx.shadowOffsetY = 4
            ctx.beginPath()
            ctx.roundRect(panelX, startPanelY, panelWidth, panelHeight, 12)
            ctx.fill()
            
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetY = 0
            
            // Draw message
            ctx.font = '14px system-ui, -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#6b7280'
            ctx.fillText('No route data available', midX, startPanelY + panelHeight / 2)
            
            // Draw explanation - check if we have placeIds (transitOptions is empty array) vs don't have placeIds (undefined)
            ctx.font = '12px system-ui, -apple-system, sans-serif'
            ctx.fillStyle = '#9ca3af'
            // If transitOptions is empty array, it means we tried to fetch but got nothing
            // If undefined, it means we never tried (no placeIds)
            const explanation = line.transitOptions !== undefined 
                ? 'Route unavailable between these locations'
                : 'Place IDs missing - unable to fetch route data'
            ctx.fillText(explanation, midX, startPanelY + panelHeight / 2 + 18)
        }

        ctx.restore()
    }, [expandedTransitLineId, drawIcon])

    // Function to redraw all transit lines (can be called from tools)
    const redrawAllTransitLines = useCallback(() => {
        if (canvasRef.current && transitLines.length > 0) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Redraw all transit lines
            transitLines.forEach((transitLine) => {
                redrawTransitLine(ctx, transitLine, expandedTransitLineId)
            })
        }
    }, [transitLines, redrawTransitLine, expandedTransitLineId])

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
                        redrawTransitLine(ctx, transitLine, expandedTransitLineId)
                    })
                }
            }, 50)

            return () => clearTimeout(timeoutId)
        }
    }, [transitLines, pins, redrawTransitLine, expandedTransitLineId])

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

    // Helper function to check if point is near a line segment
    const isPointNearLine = useCallback((x: number, y: number, lineStart: { x: number, y: number }, lineEnd: { x: number, y: number }, lineWidth: number): boolean => {
        const dx = lineEnd.x - lineStart.x
        const dy = lineEnd.y - lineStart.y
        const lineLengthSq = dx * dx + dy * dy
        
        if (lineLengthSq === 0) return false
        
        const t = Math.max(0, Math.min(1, ((x - lineStart.x) * dx + (y - lineStart.y) * dy) / lineLengthSq))
        const closestX = lineStart.x + t * dx
        const closestY = lineStart.y + t * dy
        
        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2)
        return distance <= lineWidth + 10 // 10px tolerance
    }, [])

    // Helper function to check if click is on transit line or its panels
    const isClickOnTransitElement = useCallback((x: number, y: number): boolean => {
        for (const line of transitLines) {
            // Check if clicking on the line itself
            if (isPointNearLine(x, y, line.start, line.end, line.lineWidth || 3)) {
                return true
            }
            
            // Check if clicking on options panel or empty state panel (if expanded)
            if (expandedTransitLineId === line.id) {
                const midX = (line.start.x + line.end.x) / 2
                const midY = (line.start.y + line.end.y) / 2
                const startPanelY = midY + 30
                const panelWidth = 260 // Match TRANSIT_PANEL_WIDTH
                const panelX = midX - panelWidth / 2
                
                if (line.transitOptions && line.transitOptions.length > 0) {
                    // Options panel
                    const rowHeight = 40 // Match TRANSIT_ROW_HEIGHT
                    const panelPadding = 10 // Match TRANSIT_PANEL_PADDING
                    const totalHeight = line.transitOptions.length * rowHeight + panelPadding * 2
                    if (x >= panelX && x <= panelX + panelWidth && 
                        y >= startPanelY && y <= startPanelY + totalHeight) {
                        return true
                    }
                } else {
                    // Empty state panel
                    const panelHeight = 60
                    if (x >= panelX && x <= panelX + panelWidth && 
                        y >= startPanelY && y <= startPanelY + panelHeight) {
                        return true
                    }
                }
            }
        }
        return false
    }, [transitLines, expandedTransitLineId, isPointNearLine])

    // Handle canvas click - close expanded transit line if clicking on empty space
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        // If there's an expanded transit line and we didn't click on it or its panels, close it
        if (expandedTransitLineId !== null && !isClickOnTransitElement(x, y)) {
            setExpandedTransitLineId(null)
        }
        
        // Then call the active tool's handler
        activeTool?.onMouseDown(canvasRef, e, toolDeps)
    }, [expandedTransitLineId, isClickOnTransitElement, activeTool, toolDeps])

    return (
        <div className="canvas-container">
            <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
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
})

Canvas.displayName = 'Canvas'

export default Canvas