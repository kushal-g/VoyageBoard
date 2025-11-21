import React, { useState, useRef } from 'react'
import type { CanvasTool } from '../types'
import DoodleToolbar from '@/components/DoodleToolbar/DoodleToolbar'

interface Point {
    x: number
    y: number
}

type DoodleMode = 'DOODLE' | 'ERASER'

export const useDoodleTool = (): CanvasTool => {
    const [mode, setMode] = useState<DoodleMode>('DOODLE')
    const [color, setColor] = useState('#000000')
    const [penSize, setPenSize] = useState(2)
    const [eraserSize, setEraserSize] = useState(20)
    const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
    const [isCursorVisible, setIsCursorVisible] = useState(false)
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

        if (mode === 'DOODLE') {
            ctx.strokeStyle = color
            ctx.lineWidth = penSize
            ctx.globalCompositeOperation = 'source-over'
        } else {
            // ERASER mode
            ctx.globalCompositeOperation = 'destination-out'
            ctx.lineWidth = eraserSize
        }

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
        const { x, y } = getCoordinates(canvasRef, e)
        
        // Show cursor for eraser mode - use client coordinates for fixed positioning
        if (mode === 'ERASER') {
            const canvas = canvasRef.current
            if (canvas) {
                const rect = canvas.getBoundingClientRect()
                setCursorPosition({ 
                    x: e.clientX, 
                    y: e.clientY 
                })
                setIsCursorVisible(true)
            }
        }

        if (!isDrawingRef.current) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

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
        // Hide cursor for eraser mode
        if (mode === 'ERASER') {
            setIsCursorVisible(false)
        }

        if (isDrawingRef.current) {
            isDrawingRef.current = false
            // Call saveToHistory if provided in deps
            if (deps.saveToHistory) {
                deps.saveToHistory()
            }
        }
    }

    const toolbar = (deps: Record<string, any>) => (
        <DoodleToolbar
            deps={{
                undo: deps.undo || (() => {}),
                redo: deps.redo || (() => {}),
                saveToHistory: deps.saveToHistory || (() => {}),
                canUndo: deps.historyStep > 0,
                canRedo: deps.historyStep < (deps.history?.length || 0) - 1,
            }}
            mode={mode}
            setMode={setMode}
            color={color}
            setColor={setColor}
            penSize={penSize}
            setPenSize={setPenSize}
            eraserSize={eraserSize}
            setEraserSize={setEraserSize}
        />
    )

    // Cursor element for eraser mode - use fixed positioning for accurate placement
    const cursorElement = mode === 'ERASER' && isCursorVisible && cursorPosition ? (
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
        cursor: mode === 'ERASER' ? 'none' : 'crosshair',
        cursorElement,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
