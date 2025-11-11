import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'

interface Point {
    x: number
    y: number
}

interface TransitLine {
    start: Point
    end: Point
    distance: number
    id: number
}

export const useTransitTool = (pins: LocationPin[]): CanvasTool => {
    const [lines, setLines] = useState<TransitLine[]>([])
    const [lineColor, setLineColor] = useState('#000000')
    const [lineWidth, setLineWidth] = useState(3)
    const [startPoint, setStartPoint] = useState<Point | null>(null)
    const [startPinIndex, setStartPinIndex] = useState<number | null>(null)
    const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hoveredPinIndex, setHoveredPinIndex] = useState<number | null>(null)
    const [showLoader, setShowLoader] = useState(false)
    const [showDistance, setShowDistance] = useState(false)
    const [animationFrame, setAnimationFrame] = useState(0)
    const loaderTimeoutRef = useRef<number | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const canvasRefForRedraw = useRef<HTMLCanvasElement | null>(null)
    const canvasStateBeforeDrawing = useRef<ImageData | null>(null)

    // Animation loop for loader dots
    useEffect(() => {
        if (showLoader) {
            let frameCount = 0
            const animate = () => {
                frameCount++
                setAnimationFrame(frameCount)
                animationFrameRef.current = requestAnimationFrame(animate)
            }
            animationFrameRef.current = requestAnimationFrame(animate)
        } else {
            // Cancel animation when loader is not shown
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            setAnimationFrame(0)
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
        }
    }, [showLoader])

    // Redraw canvas when animation frame changes (to animate the loader)
    useEffect(() => {
        if (showLoader && isDrawing && startPoint && currentPoint && canvasStateBeforeDrawing.current && canvasRefForRedraw.current) {
            const canvas = canvasRefForRedraw.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Restore the canvas to the state before drawing started
            ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

            // Redraw the preview line with updated animation frame
            const distance = calculateDistance(startPoint, currentPoint)
            drawLine(ctx, startPoint, currentPoint, lineColor, lineWidth, distance, 'loader', animationFrame)
        }
    }, [animationFrame, showLoader, isDrawing, startPoint, currentPoint, lineColor, lineWidth])

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

    // Find the nearest pin within a certain radius
    const findPinAtPosition = (x: number, y: number): number | null => {
        const snapRadius = 30 // Radius to snap to pins

        for (let i = pins.length - 1; i >= 0; i--) {
            const pin = pins[i]
            const dx = x - pin.x
            const dy = y - pin.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance <= snapRadius) {
                return i
            }
        }

        return null
    }

    const calculateDistance = (p1: Point, p2: Point): number => {
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const pixelDistance = Math.sqrt(dx * dx + dy * dy)

        // Convert pixels to kilometers (assuming 1 pixel ≈ 10 km for visualization)
        // This is a rough approximation for display purposes
        const kmDistance = Math.round(pixelDistance * 0.5)

        return kmDistance
    }

    const drawLine = (
        ctx: CanvasRenderingContext2D,
        start: Point,
        end: Point,
        color: string,
        width: number,
        distance: number,
        displayMode: 'none' | 'loader' | 'distance' = 'none',
        animFrame: number = 0
    ) => {
        ctx.save()

        // Draw the line
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.setLineDash([10, 5]) // Dashed line pattern

        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        // Reset line dash for other drawings
        ctx.setLineDash([])

        // Draw arrow head at the end point
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const arrowLength = 15

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fill()

        // Calculate midpoint for label or loader
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        const labelOffsetY = -15

        // Show distance, loader, or nothing based on displayMode
        if (displayMode === 'distance') {
            ctx.font = 'bold 14px Arial, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'

            const distanceText = `${distance} km`
            const textMetrics = ctx.measureText(distanceText)
            const textWidth = textMetrics.width
            const padding = 6

            // Draw background for text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.fillRect(
                midX - textWidth / 2 - padding,
                midY + labelOffsetY - 18,
                textWidth + padding * 2,
                22
            )

            // Draw border around background
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.strokeRect(
                midX - textWidth / 2 - padding,
                midY + labelOffsetY - 18,
                textWidth + padding * 2,
                22
            )

            // Draw text
            ctx.fillStyle = color
            ctx.fillText(distanceText, midX, midY + labelOffsetY)
        } else if (displayMode === 'loader') {
            // Draw a small animated loader/spinner
            const loaderRadius = 8
            const loaderY = midY + labelOffsetY

            // Draw white circle background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.beginPath()
            ctx.arc(midX, loaderY, loaderRadius + 4, 0, Math.PI * 2)
            ctx.fill()

            // Draw border
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(midX, loaderY, loaderRadius + 4, 0, Math.PI * 2)
            ctx.stroke()

            // Draw three animated dots in a row
            const dotRadius = 2
            const dotSpacing = 6

            // Calculate animation cycle (0-11, 4 frames per dot)
            const cycle = Math.floor(animFrame / 4) % 3

            for (let i = 0; i < 3; i++) {
                const dotX = midX - dotSpacing + i * dotSpacing

                // Calculate opacity based on animation cycle
                // The active dot gets full opacity, others get reduced opacity
                let opacity = 0.3
                if (i === cycle) {
                    opacity = 1.0
                } else if (i === (cycle + 2) % 3) {
                    opacity = 0.5
                }

                ctx.fillStyle = color
                ctx.globalAlpha = opacity
                ctx.beginPath()
                ctx.arc(dotX, loaderY, dotRadius, 0, Math.PI * 2)
                ctx.fill()
            }

            // Reset global alpha
            ctx.globalAlpha = 1.0
        }
        // If displayMode is 'none', don't draw anything

        // Draw start and end points
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(start.x, start.y, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(end.x, end.y, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
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

        canvasRefForRedraw.current = canvas
        const { x, y } = getCoordinates(canvasRef, e)

        // Check if clicking on a pin
        const pinIndex = findPinAtPosition(x, y)

        // Only start drawing if clicking on a pin
        if (pinIndex === null) return

        const pin = pins[pinIndex]

        // Save the current canvas state before starting to draw
        canvasStateBeforeDrawing.current = ctx.getImageData(0, 0, canvas.width, canvas.height)

        // Start a new line from the pin's center
        setStartPoint({ x: pin.x, y: pin.y })
        setStartPinIndex(pinIndex)
        setCurrentPoint({ x: pin.x, y: pin.y })
        setIsDrawing(true)
    }

    const onMouseMove = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const { x, y } = getCoordinates(canvasRef, e)

        // Check if hovering over a pin (for cursor change)
        const pinIndex = findPinAtPosition(x, y)
        setHoveredPinIndex(pinIndex)

        if (!isDrawing || !startPoint || !canvasStateBeforeDrawing.current) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Snap to pin if hovering over one
        let endPoint = { x, y }
        let isSnappedToPin = false
        if (pinIndex !== null && pinIndex !== startPinIndex) {
            const pin = pins[pinIndex]
            endPoint = { x: pin.x, y: pin.y }
            isSnappedToPin = true
        }

        setCurrentPoint(endPoint)

        // Clear any existing timeout
        if (loaderTimeoutRef.current !== null) {
            clearTimeout(loaderTimeoutRef.current)
            loaderTimeoutRef.current = null
        }

        // Handle loader and distance display
        let displayMode: 'none' | 'loader' | 'distance' = 'none'

        if (isSnappedToPin) {
            if (showDistance) {
                // Already showing distance, keep showing it
                displayMode = 'distance'
            } else if (showLoader) {
                // Currently showing loader
                displayMode = 'loader'
            } else {
                // Just snapped, show loader first
                setShowLoader(true)
                setShowDistance(false)
                displayMode = 'loader'

                // After 500ms, show the distance
                loaderTimeoutRef.current = window.setTimeout(() => {
                    setShowLoader(false)
                    setShowDistance(true)
                    loaderTimeoutRef.current = null
                }, 500)
            }
        } else {
            // Not snapped to a pin, reset states
            setShowLoader(false)
            setShowDistance(false)
            displayMode = 'none'
        }

        // Restore the canvas to the state before drawing started
        ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

        // Draw the preview line
        const distance = calculateDistance(startPoint, endPoint)
        drawLine(ctx, startPoint, endPoint, lineColor, lineWidth, distance, displayMode, animationFrame)
    }

    const onMouseUp = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (!isDrawing || !startPoint) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(canvasRef, e)

        // Check if mouse up is on a pin
        const endPinIndex = findPinAtPosition(x, y)

        // Only create a line if ending on a different pin
        if (endPinIndex !== null && endPinIndex !== startPinIndex) {
            const endPin = pins[endPinIndex]
            const endPoint = { x: endPin.x, y: endPin.y }

            const distance = calculateDistance(startPoint, endPoint)

            // Restore canvas state and draw final line
            if (canvasStateBeforeDrawing.current) {
                ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
            }
            drawLine(ctx, startPoint, endPoint, lineColor, lineWidth, distance, 'distance')

            // Save the line
            const newLine: TransitLine = {
                start: startPoint,
                end: endPoint,
                distance,
                id: Date.now()
            }
            setLines(prev => [...prev, newLine])

            // Save to history
            if (deps.saveToHistory) {
                deps.saveToHistory()
            }
        } else {
            // If not ending on a valid pin, restore the canvas to original state
            if (canvasStateBeforeDrawing.current) {
                ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
            }
        }

        // Reset drawing state
        setIsDrawing(false)
        setStartPoint(null)
        setStartPinIndex(null)
        setCurrentPoint(null)
        setShowLoader(false)
        setShowDistance(false)
        canvasStateBeforeDrawing.current = null

        // Clear timeout if any
        if (loaderTimeoutRef.current !== null) {
            clearTimeout(loaderTimeoutRef.current)
            loaderTimeoutRef.current = null
        }
    }

    const onMouseLeave = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        // If drawing in progress, restore canvas to state before drawing started
        if (isDrawing && canvasStateBeforeDrawing.current) {
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
                }
            }
        }

        // Cancel drawing if mouse leaves canvas
        setIsDrawing(false)
        setStartPoint(null)
        setStartPinIndex(null)
        setCurrentPoint(null)
        setHoveredPinIndex(null)
        setShowLoader(false)
        setShowDistance(false)
        canvasStateBeforeDrawing.current = null

        // Clear timeout if any
        if (loaderTimeoutRef.current !== null) {
            clearTimeout(loaderTimeoutRef.current)
            loaderTimeoutRef.current = null
        }
    }

    const toolbar = (
        <>
            <div className="toolbar-group">
                <label>Line Color:</label>
                <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    className="color-picker"
                />
            </div>
            <div className="toolbar-group">
                <label>Line Width: {lineWidth}px</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="brush-size-slider"
                />
            </div>
        </>
    )

    return {
        toolbar,
        cursor: hoveredPinIndex !== null ? 'pointer' : 'crosshair',
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
