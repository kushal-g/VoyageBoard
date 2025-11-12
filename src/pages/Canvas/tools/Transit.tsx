import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'

interface Point {
    x: number
    y: number
}

interface TransitOption {
    type: 'car' | 'bus' | 'public_transport' | 'flight'
    duration: string
    cost: string
    icon: string
}

interface TransitLine {
    start: Point
    end: Point
    distance: number
    id: number
    transitOptions?: TransitOption[]
    selectedOptionIndex?: number
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
    const [selectedTransitIndex, setSelectedTransitIndex] = useState<number>(0)
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
            drawLine(ctx, startPoint, currentPoint, lineColor, lineWidth, distance, 'loader', animationFrame, undefined, 0)
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

    const getClickedTransitOption = (
        x: number,
        y: number,
        lineStart: Point,
        lineEnd: Point,
        transitOptions?: TransitOption[]
    ): number | null => {
        if (!transitOptions || transitOptions.length === 0) return null

        const midX = (lineStart.x + lineEnd.x) / 2
        const midY = (lineStart.y + lineEnd.y) / 2
        const startPanelY = midY + 30
        const panelWidth = 280
        const rowHeight = 45
        const panelPadding = 12
        const totalHeight = transitOptions.length * rowHeight + panelPadding * 2
        const panelX = midX - panelWidth / 2

        // Check if click is within the panel bounds
        if (x < panelX || x > panelX + panelWidth || y < startPanelY || y > startPanelY + totalHeight) {
            return null
        }

        // Determine which row was clicked
        const relativeY = y - (startPanelY + panelPadding)
        if (relativeY < 0) return null

        const clickedIndex = Math.floor(relativeY / rowHeight)
        if (clickedIndex >= 0 && clickedIndex < transitOptions.length) {
            return clickedIndex
        }

        return null
    }

    const generateTransitOptions = (distance: number): TransitOption[] => {
        // Generate realistic transit options based on distance
        const options: TransitOption[] = []

        // Car - available for most distances
        if (distance < 1000) {
            const carTime = Math.max(Math.round(distance / 60 * 60), 15) // ~60 km/h average speed
            const carCost = Math.round(distance * 0.15) // ~$0.15 per km (fuel + wear)
            options.push({
                type: 'car',
                duration: carTime < 60 ? `${carTime}m` : `${Math.floor(carTime / 60)}h ${carTime % 60}m`,
                cost: `$${carCost}`,
                icon: '🚗'
            })
        }

        // Bus - available for short to medium distances
        if (distance < 500) {
            const busTime = Math.max(Math.round(distance / 40 * 60), 20) // ~40 km/h average speed
            const busCost = Math.max(Math.round(distance * 0.05), 2) // ~$0.05 per km, min $2
            options.push({
                type: 'bus',
                duration: busTime < 60 ? `${busTime}m` : `${Math.floor(busTime / 60)}h ${busTime % 60}m`,
                cost: `$${busCost}`,
                icon: '🚌'
            })
        }

        // Public Transport (train/metro) - available for medium distances
        if (distance >= 20 && distance < 800) {
            const trainTime = Math.max(Math.round(distance / 80 * 60), 15) // ~80 km/h average speed
            const trainCost = Math.max(Math.round(distance * 0.08), 3) // ~$0.08 per km, min $3
            options.push({
                type: 'public_transport',
                duration: trainTime < 60 ? `${trainTime}m` : `${Math.floor(trainTime / 60)}h ${trainTime % 60}m`,
                cost: `$${trainCost}`,
                icon: '🚆'
            })
        }

        // Flight - only for long distances
        if (distance >= 300) {
            // Flight time includes airport time (~2h) + flight time (~800 km/h)
            const flightTime = Math.round(120 + (distance / 800 * 60))
            const flightCost = Math.round(50 + distance * 0.20) // Base cost + per km
            options.push({
                type: 'flight',
                duration: flightTime < 60 ? `${flightTime}m` : `${Math.floor(flightTime / 60)}h ${flightTime % 60}m`,
                cost: `$${flightCost}`,
                icon: '✈️'
            })
        }

        // Sort by cost (lowest first)
        options.sort((a, b) => {
            const costA = parseInt(a.cost.replace('$', ''))
            const costB = parseInt(b.cost.replace('$', ''))
            return costA - costB
        })

        return options
    }

    const drawLine = (
        ctx: CanvasRenderingContext2D,
        start: Point,
        end: Point,
        color: string,
        width: number,
        distance: number,
        displayMode: 'none' | 'loader' | 'distance' = 'none',
        animFrame: number = 0,
        transitOptions?: TransitOption[],
        selectedIndex: number = 0
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

        // Draw transit options panel below the line when available and in distance mode
        if (displayMode === 'distance' && transitOptions && transitOptions.length > 0) {
            const midX = (start.x + end.x) / 2
            const midY = (start.y + end.y) / 2

            // Calculate position below the line
            const startPanelY = midY + 30

            // Panel dimensions (vertical list layout)
            const panelWidth = 280
            const rowHeight = 45
            const panelPadding = 12
            const totalHeight = transitOptions.length * rowHeight + panelPadding * 2
            const panelX = midX - panelWidth / 2

            // Draw container background with shadow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
            ctx.shadowBlur = 16
            ctx.shadowOffsetY = 4
            ctx.beginPath()
            ctx.roundRect(panelX, startPanelY, panelWidth, totalHeight, 12)
            ctx.fill()

            // Reset shadow
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetY = 0

            // Draw each transit option as a row
            transitOptions.forEach((option, index) => {
                const y = startPanelY + panelPadding + index * rowHeight
                const isSelected = index === selectedIndex

                // Draw selection background for selected option
                if (isSelected) {
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)' // Light blue background
                    ctx.beginPath()
                    const inset = 4
                    const rowBorderRadius = 8
                    ctx.roundRect(panelX + inset, y + inset, panelWidth - inset * 2, rowHeight - inset * 2, rowBorderRadius)
                    ctx.fill()
                }

                // Draw separator line (except for first item)
                if (index > 0) {
                    ctx.strokeStyle = '#e5e7eb'
                    ctx.lineWidth = 1
                    ctx.beginPath()
                    ctx.moveTo(panelX + panelPadding, y)
                    ctx.lineTo(panelX + panelWidth - panelPadding, y)
                    ctx.stroke()
                }

                // Draw icon on the left
                ctx.font = '24px Arial, sans-serif'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                ctx.fillStyle = isSelected ? '#2563eb' : '#1f2937' // Blue when selected
                const iconX = panelX + panelPadding + 8
                const rowCenterY = y + rowHeight / 2
                ctx.fillText(option.icon, iconX, rowCenterY)

                // Get transport type name
                const typeName = option.type === 'car' ? 'Drive' :
                                option.type === 'bus' ? 'Bus' :
                                option.type === 'public_transport' ? 'Train' : 'Flight'

                // Draw type and duration
                ctx.font = isSelected ? 'bold 15px system-ui, -apple-system, sans-serif' : '15px system-ui, -apple-system, sans-serif'
                ctx.textAlign = 'left'
                ctx.fillStyle = isSelected ? '#2563eb' : '#1f2937' // Blue when selected
                const textX = iconX + 38
                ctx.fillText(`${typeName} - ${option.duration}`, textX, rowCenterY)

                // Draw cost on the right
                ctx.font = isSelected ? 'bold 15px system-ui, -apple-system, sans-serif' : '15px system-ui, -apple-system, sans-serif'
                ctx.textAlign = 'right'
                ctx.fillStyle = isSelected ? '#2563eb' : '#9ca3af' // Blue when selected
                const costX = panelX + panelWidth - panelPadding - 8
                ctx.fillText(option.cost, costX, rowCenterY)
            })
        }

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

        // Check if clicking on transit options panel during drawing
        if (isDrawing && startPoint && currentPoint && showDistance) {
            const distance = calculateDistance(startPoint, currentPoint)
            const transitOpts = generateTransitOptions(distance)
            const clickedOptionIndex = getClickedTransitOption(x, y, startPoint, currentPoint, transitOpts)

            if (clickedOptionIndex !== null) {
                // Clicked on a transit option
                setSelectedTransitIndex(clickedOptionIndex)

                if (canvasStateBeforeDrawing.current) {
                    ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
                    drawLine(ctx, startPoint, currentPoint, lineColor, lineWidth, distance, 'distance', animationFrame, transitOpts, clickedOptionIndex)
                }
                return // Don't start a new line
            }
        }

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
        setSelectedTransitIndex(0) // Reset to first option
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
        const transitOpts = displayMode === 'distance' ? generateTransitOptions(distance) : undefined
        drawLine(ctx, startPoint, endPoint, lineColor, lineWidth, distance, displayMode, animationFrame, transitOpts, selectedTransitIndex)
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
            const transitOpts = generateTransitOptions(distance)

            // Restore canvas state and draw final line
            if (canvasStateBeforeDrawing.current) {
                ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
            }
            drawLine(ctx, startPoint, endPoint, lineColor, lineWidth, distance, 'distance', 0, transitOpts, selectedTransitIndex)

            // Save the line
            const newLine: TransitLine = {
                start: startPoint,
                end: endPoint,
                distance,
                id: Date.now(),
                transitOptions: transitOpts,
                selectedOptionIndex: selectedTransitIndex
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
        setSelectedTransitIndex(0)
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
        setSelectedTransitIndex(0)
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
