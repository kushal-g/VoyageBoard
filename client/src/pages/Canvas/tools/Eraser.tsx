import { useState, useRef } from 'react'
import type { CanvasTool } from '../types'

interface Point {
    x: number
    y: number
}

interface EraserToolProps {
    pins?: Array<{ x: number; y: number; id: number }>
}

export const useEraserTool = (pins?: Array<{ x: number; y: number; id: number }>): CanvasTool => {
    const [eraserSize, setEraserSize] = useState(20)
    const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const isErasingRef = useRef(false)

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
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(canvasRef, e)

        // Don't erase if clicking on a location flag/badge
        if (isNearLocation(x, y)) {
            return
        }

        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = eraserSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(x, y)
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

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Don't erase if hovering over a location flag/badge
        if (isNearLocation(x, y)) {
            return
        }

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const onMouseUp = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isErasingRef.current) {
            isErasingRef.current = false
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
