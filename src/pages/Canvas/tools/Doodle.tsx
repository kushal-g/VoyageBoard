import React, { useState, useRef } from 'react'
import type { CanvasTool } from '../types'

interface Point {
    x: number
    y: number
}

export const useDoodleTool = (): CanvasTool => {
    const [color, setColor] = useState('#000000')
    const [brushSize, setBrushSize] = useState(2)
    const isDrawingRef = useRef(false)

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

        ctx.strokeStyle = color
        ctx.lineWidth = brushSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(x, y)
        isDrawingRef.current = true
    }

    const onMouseMove = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        if (!isDrawingRef.current) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(canvasRef, e)
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const onMouseUp = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isDrawingRef.current) {
            isDrawingRef.current = false
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
        if (isDrawingRef.current) {
            isDrawingRef.current = false
            // Call saveToHistory if provided in deps
            if (deps.saveToHistory) {
                deps.saveToHistory()
            }
        }
    }

    const toolbar = (
        <>
            <div className="toolbar-group">
                <label>Color:</label>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="color-picker"
                />
            </div>
            <div className="toolbar-group">
                <label>Size: {brushSize}px</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="brush-size-slider"
                />
            </div>
        </>
    )

    return {
        toolbar,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
