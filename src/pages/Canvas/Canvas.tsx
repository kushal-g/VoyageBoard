import { useRef, useState, useEffect } from 'react'
import './Canvas.css'
import type { TOOL } from '../../constants/types'
import { useDoodleTool } from './tools/Doodle'
import { useEraserTool } from './tools/Eraser'

interface CanvasProps {
    currentTool: TOOL
}

export default function Canvas({ currentTool }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [history, setHistory] = useState<ImageData[]>([])
    const [historyStep, setHistoryStep] = useState(-1)

    // Tool instances
    const doodleTool = useDoodleTool()
    const eraserTool = useEraserTool()

    // Map of tools
    const tools = {
        DOODLE: doodleTool,
        ERASER: eraserTool,
        // Add more tools here as they are implemented
    }

    // Get current active tool
    const activeTool = tools[currentTool as keyof typeof tools]

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size to window size
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        // Fill with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Save initial state
        saveToHistory()

        // Handle window resize
        const handleResize = () => {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.putImageData(imageData, 0, 0)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
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
    }

    return (
        <div className="canvas-container">
            {activeTool?.toolbar && (
                <div className="toolbar">
                    {activeTool.toolbar}

                    <div className="toolbar-group">
                        <button onClick={undo} disabled={historyStep <= 0}>
                            Undo
                        </button>
                        <button onClick={redo} disabled={historyStep >= history.length - 1}>
                            Redo
                        </button>
                        <button onClick={clearCanvas}>
                            Clear
                        </button>
                    </div>
                </div>
            )}

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
        </div>
    )
}
