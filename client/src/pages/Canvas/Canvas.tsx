import { useRef, useState, useEffect } from 'react'
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
}

export interface LocationPin {
    x: number
    y: number
    id: number
    location: string
    color?: string
    groupId?: string
}

export interface LocationGroup {
    id: string
    color: string
    label: string
    pinIds: number[]
}

export default function Canvas({ currentTool, onGroupsChange, onPinsChange, onDeleteGroup, onUpdateGroupLabel }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [history, setHistory] = useState<ImageData[]>([])
    const [historyStep, setHistoryStep] = useState(-1)
    const [pins, setPins] = useState<LocationPin[]>([])
    const [groups, setGroups] = useState<LocationGroup[]>([])

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

    // Tool instances
    const doodleTool = useDoodleTool()
    const eraserTool = useEraserTool(pins) // Pass pins to eraser to check for locations
    const locationTool = useLocationTool(pins, setPins)
    const transitTool = useTransitTool(pins)
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
