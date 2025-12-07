import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import './Canvas.css'
import type { TOOL } from '../../constants/types'
import { useDoodleTool } from './tools/Doodle'
import { useEraserTool } from './tools/Eraser'
import { useLocationTool } from './tools/Location'
import { useGroupLocationTool } from './tools/GroupLocation'
import { useTransitTool } from './tools/Transit'
import {
    saveCanvasStateToLocalStorage,
    loadCanvasStateFromLocalStorage,
    restoreImageDataFromBase64,
    type SerializedCanvasState
} from '../../utils/canvasSerialization'

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

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
    currentTool,
    onGroupsChange,
    onPinsChange,
    onDeleteGroup,
    onUpdateGroupLabel,
    placesToAdd,
    tripId,
    autoSave = true,
    onSaveComplete
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [history, setHistory] = useState<ImageData[]>([])
    const [historyStep, setHistoryStep] = useState(-1)
    const [pins, setPins] = useState<LocationPin[]>([])
    const [groups, setGroups] = useState<LocationGroup[]>([])
    const [transitLines, setTransitLines] = useState<any[]>([])
    const addedPlacesRef = useRef<Set<string>>(new Set())
    const isInitializedRef = useRef(false)
    const isRestoringRef = useRef(false)

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
    const locationTool = useLocationTool(pins, setPins, transitLines, currentTool)
    const groupLocationTool = useGroupLocationTool(pins, setPins, groups, setGroups)
    const transitTool = useTransitTool(pins, transitLines, setTransitLines)

    // Map of tools
    const tools = {
        DOODLE: doodleTool,
        ERASER: eraserTool,
        LOCATION_PIN: locationTool,
        GROUP: groupLocationTool,
        TRANSIT: transitTool,
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

    // Save canvas state to IndexedDB
    const saveCanvasState = useCallback(async () => {
        if (!tripId) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        try {
            await saveCanvasStateToLocalStorage(
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

    // Load canvas state from IndexedDB
    const loadCanvasState = useCallback(async () => {
        if (!tripId) return

        const serialized = await loadCanvasStateFromLocalStorage(tripId)
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
            history,
            historyStep
        })
    }), [saveCanvasState, loadCanvasState, pins, groups, history, historyStep])


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
    }

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        // Call the active tool's handler
        activeTool?.onMouseDown(canvasRef, e, toolDeps)
    }, [activeTool, toolDeps])

    // Convert touch events to mouse events for iPad support
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        if (e.touches.length !== 1) return
        e.preventDefault()

        const touch = e.touches[0]
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        })

        // Create a synthetic React MouseEvent
        const syntheticEvent = {
            ...mouseEvent,
            currentTarget: e.currentTarget,
            target: e.target,
            nativeEvent: mouseEvent,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            isPropagationStopped: () => false,
            persist: () => {},
            clientX: touch.clientX,
            clientY: touch.clientY
        } as unknown as React.MouseEvent<HTMLCanvasElement>

        activeTool?.onMouseDown(canvasRef, syntheticEvent, toolDeps)
    }, [activeTool, toolDeps, canvasRef])

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        if (e.touches.length !== 1) return
        e.preventDefault()

        const touch = e.touches[0]
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        })

        const syntheticEvent = {
            ...mouseEvent,
            currentTarget: e.currentTarget,
            target: e.target,
            nativeEvent: mouseEvent,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            isPropagationStopped: () => false,
            persist: () => {},
            clientX: touch.clientX,
            clientY: touch.clientY
        } as unknown as React.MouseEvent<HTMLCanvasElement>

        activeTool?.onMouseMove(canvasRef, syntheticEvent, toolDeps)
    }, [activeTool, toolDeps, canvasRef])

    const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault()

        const touch = e.changedTouches[0]
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        })

        const syntheticEvent = {
            ...mouseEvent,
            currentTarget: e.currentTarget,
            target: e.target,
            nativeEvent: mouseEvent,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            isPropagationStopped: () => false,
            persist: () => {},
            clientX: touch.clientX,
            clientY: touch.clientY
        } as unknown as React.MouseEvent<HTMLCanvasElement>

        activeTool?.onMouseUp(canvasRef, syntheticEvent, toolDeps)
    }, [activeTool, toolDeps, canvasRef])

    return (
        <div className="canvas-container">
            <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={(e) => activeTool?.onMouseMove(canvasRef, e, toolDeps)}
                onMouseUp={(e) => activeTool?.onMouseUp(canvasRef, e, toolDeps)}
                onMouseLeave={(e) => activeTool?.onMouseLeave(canvasRef, e, toolDeps)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className="drawing-canvas"
                style={{ cursor: activeTool?.cursor || 'crosshair', touchAction: 'none' }}
            />

            {/* Always render location pins (they handle their own interactions) */}
            {locationTool.locationPins && (
                typeof locationTool.locationPins === 'function'
                    ? locationTool.locationPins(toolDeps)
                    : locationTool.locationPins
            )}

            {/* Render selection overlays from Group Location tool */}
            {groupLocationTool.selectionOverlays}

            {activeTool?.cursorElement}

            {activeTool?.messageOverlay}

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