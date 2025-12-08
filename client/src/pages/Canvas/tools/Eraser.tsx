import { useState, useRef } from 'react'
import type { CanvasTool } from '../types'
import type { DrawingPrimitive } from '../../utils/canvasDrawingPrimitives'

interface Point {
    x: number
    y: number
}

interface EraserToolProps {
    pins?: Array<{ x: number; y: number; id: number }>
    transitLines?: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>
}

export const useEraserTool = (
    pins?: Array<{ x: number; y: number; id: number }>,
    transitLines?: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>,
    drawingPrimitives?: DrawingPrimitive[],
    setDrawingPrimitives?: React.Dispatch<React.SetStateAction<DrawingPrimitive[]>>
): CanvasTool => {
    const [eraserSize, setEraserSize] = useState(20)
    const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const isErasingRef = useRef(false)
    const eraserPointsRef = useRef<Point[]>([])

    // Check if point is near a location flag (within clickable radius)
    const isNearLocation = (x: number, y: number): boolean => {
        if (!pins || pins.length === 0) return false
        const clickRadius = 35 // Account for flag + badge area

        for (const pin of pins) {
            const dx = x - pin.x
            const dy = y - pin.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance <= clickRadius) {
                return true
            }
        }
        return false
    }

    // Check if point is near a transit line
    const isNearTransitLine = (x: number, y: number): boolean => {
        if (!transitLines || transitLines.length === 0) return false
        const tolerance = eraserSize / 2 + 5 // Eraser radius + small buffer

        for (const line of transitLines) {
            const { start, end } = line

            // Calculate distance from point to line segment
            const dx = end.x - start.x
            const dy = end.y - start.y
            const lineLength = Math.sqrt(dx * dx + dy * dy)

            if (lineLength === 0) continue

            const px = x - start.x
            const py = y - start.y

            const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (lineLength * lineLength)))

            const closestX = start.x + t * dx
            const closestY = start.y + t * dy

            const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2)

            if (distance <= tolerance) {
                return true
            }
        }
        return false
    }

    const getCoordinates = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>
    ): Point => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
    }

    const onMouseDown = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const { x, y } = getCoordinates(canvasRef, e)

        // Don't erase if clicking on a location flag/badge or transit line
        if (isNearLocation(x, y) || isNearTransitLine(x, y)) {
            return
        }

        // Start collecting eraser points
        eraserPointsRef.current = [{ x, y }]
        isErasingRef.current = true
    }

    const onMouseMove = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const { x, y } = getCoordinates(canvasRef, e)

        // Use client coordinates for fixed positioning cursor
        setCursorPosition({
            x: e.clientX,
            y: e.clientY
        })
        setIsVisible(true)

        if (!isErasingRef.current) return

        // Don't erase if hovering over a location flag/badge or transit line
        if (isNearLocation(x, y) || isNearTransitLine(x, y)) {
            return
        }

        // Collect eraser points
        eraserPointsRef.current.push({ x, y })
    }

    const onMouseUp = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isErasingRef.current) {
            isErasingRef.current = false

            // Add eraser stroke to drawing primitives
            if (setDrawingPrimitives && eraserPointsRef.current.length > 0) {
                const eraserStroke: DrawingPrimitive = {
                    type: 'eraser',
                    id: `eraser-${Date.now()}`,
                    points: [...eraserPointsRef.current],
                    eraserSize: eraserSize,
                    timestamp: Date.now()
                }

                setDrawingPrimitives(prev => [...prev, eraserStroke])
                eraserPointsRef.current = []
            }

            // Call saveToHistory if provided in deps
            if (deps.saveToHistory) {
                deps.saveToHistory()
            }
        }
    }

    const onMouseLeave = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        setIsVisible(false)
        if (isErasingRef.current) {
            isErasingRef.current = false

            // Add eraser stroke to drawing primitives
            if (setDrawingPrimitives && eraserPointsRef.current.length > 0) {
                const eraserStroke: DrawingPrimitive = {
                    type: 'eraser',
                    id: `eraser-${Date.now()}`,
                    points: [...eraserPointsRef.current],
                    eraserSize: eraserSize,
                    timestamp: Date.now()
                }

                setDrawingPrimitives(prev => [...prev, eraserStroke])
                eraserPointsRef.current = []
            }

            // Call saveToHistory if provided in deps
            if (deps.saveToHistory) {
                deps.saveToHistory()
            }
        }
    }

    const toolbar = (
        <div className="toolbar-group">
            <label>Eraser Size: {eraserSize}px</label>
            <input
                type="range"
                min="5"
                max="100"
                value={eraserSize}
                onChange={(e) => setEraserSize(Number(e.target.value))}
                className="brush-size-slider"
            />
        </div>
    )

    const cursorElement = isVisible && cursorPosition ? (
        <div
            className="eraser-cursor"
            style={{
                position: 'fixed',
                left: `${cursorPosition.x}px`,
                top: `${cursorPosition.y}px`,
                width: `${eraserSize}px`,
                height: `${eraserSize}px`,
                marginLeft: `-${eraserSize / 2}px`,
                marginTop: `-${eraserSize / 2}px`,
                pointerEvents: 'none',
            }}
        />
    ) : null

    return {
        toolbar,
        cursor: 'none',
        cursorElement,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
