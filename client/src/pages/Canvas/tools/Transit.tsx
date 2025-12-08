import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'
import { IonIcon } from '@ionic/react'
import { carSportOutline, busOutline, trainOutline, airplaneOutline, walkOutline, bicycleOutline } from 'ionicons/icons'

interface Point {
    x: number
    y: number
}

export interface TransitOption {
    type: string
    duration: string
    distance?: string
    cost?: string
    provider?: string
}

export interface TransitLine {
    start: Point
    end: Point
    distance: number
    id: number
    startPinId: number
    endPinId: number
    transitOptions?: TransitOption[]
    selectedOption?: TransitOption
}

export const useTransitTool = (
    pins: LocationPin[],
    savedLines: TransitLine[] = [],
    setSavedLines?: React.Dispatch<React.SetStateAction<TransitLine[]>>
): CanvasTool => {
    const [startPoint, setStartPoint] = useState<Point | null>(null)
    const [startPinIndex, setStartPinIndex] = useState<number | null>(null)
    const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hoveredPinIndex, setHoveredPinIndex] = useState<number | null>(null)
    const [showLoader, setShowLoader] = useState(false)
    const [animationFrame, setAnimationFrame] = useState(0)
    const [actualDistance, setActualDistance] = useState<number | null>(null)
    const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
    const [isLoadingOptions, setIsLoadingOptions] = useState(false)

    const loaderTimeoutRef = useRef<number | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const canvasRefForRedraw = useRef<HTMLCanvasElement | null>(null)
    const canvasStateBeforeDrawing = useRef<ImageData | null>(null)
    const canvasStateBeforeTransitLines = useRef<ImageData | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setSelectedLineId(null)
                setMenuPosition(null)
            }
        }

        if (selectedLineId !== null) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [selectedLineId])

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

    // Update line positions when pins change and redraw them
    useEffect(() => {
        if (!setSavedLines) return

        const hasPositionChanges = savedLines.some(line => {
            const startPin = pins.find(p => p.id === line.startPinId)
            const endPin = pins.find(p => p.id === line.endPinId)

            if (startPin && endPin) {
                return line.start.x !== startPin.x || line.start.y !== startPin.y ||
                    line.end.x !== endPin.x || line.end.y !== endPin.y
            }
            return false
        })

        if (hasPositionChanges) {
            // Update line positions - Canvas will automatically re-render from primitives
            const updatedLines = savedLines.map(line => {
                const startPin = pins.find(p => p.id === line.startPinId)
                const endPin = pins.find(p => p.id === line.endPinId)

                if (startPin && endPin) {
                    return {
                        ...line,
                        start: { x: startPin.x, y: startPin.y },
                        end: { x: endPin.x, y: endPin.y }
                    }
                }
                return line
            })

            setSavedLines(updatedLines)
        }
    }, [pins, savedLines, setSavedLines])

    // Redraw canvas when animation frame changes (to animate the loader)
    useEffect(() => {
        if (showLoader && isDrawing && startPoint && currentPoint && canvasStateBeforeDrawing.current && canvasRefForRedraw.current) {
            const canvas = canvasRefForRedraw.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

            savedLines.forEach(line => {
                drawLine(ctx, line.start, line.end, line.distance, 'distance', 0, line.selectedOption)
            })

            const previewDistance = actualDistance !== null ? actualDistance : 0
            drawLine(ctx, startPoint, currentPoint, previewDistance, 'loader', animationFrame)
        }
    }, [animationFrame, showLoader, isDrawing, startPoint, currentPoint, savedLines, actualDistance])

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

    const findPinAtPosition = (x: number, y: number): number | null => {
        const snapRadius = 30

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

    const isPointNearLine = (x: number, y: number, lineStart: Point, lineEnd: Point): boolean => {
        const tolerance = 10
        const endPointExclusionRadius = 35 // Exclude area near the endpoints (location pins)

        const dx = lineEnd.x - lineStart.x
        const dy = lineEnd.y - lineStart.y
        const lineLength = Math.sqrt(dx * dx + dy * dy)

        if (lineLength === 0) return false

        const px = x - lineStart.x
        const py = y - lineStart.y

        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (lineLength * lineLength)))

        // Check if we're too close to either endpoint
        const distToStart = Math.sqrt((x - lineStart.x) ** 2 + (y - lineStart.y) ** 2)
        const distToEnd = Math.sqrt((x - lineEnd.x) ** 2 + (y - lineEnd.y) ** 2)

        if (distToStart < endPointExclusionRadius || distToEnd < endPointExclusionRadius) {
            return false
        }

        const closestX = lineStart.x + t * dx
        const closestY = lineStart.y + t * dy

        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2)

        return distance <= tolerance
    }

    const findLineAtPosition = (x: number, y: number): TransitLine | null => {
        for (let i = savedLines.length - 1; i >= 0; i--) {
            const line = savedLines[i]
            if (isPointNearLine(x, y, line.start, line.end)) {
                return line
            }
        }
        return null
    }

    const fetchTransitDistance = async (originPlaceId: string, destinationPlaceId: string): Promise<number | null> => {
        try {
            console.log(import.meta.env.VITE_API_URL, "import.meta.env.VITE_API_URL")
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
            const response = await fetch(
                `${apiUrl}/api/travel/options?origin=${encodeURIComponent(originPlaceId)}&destination=${encodeURIComponent(destinationPlaceId)}`
            )

            if (response.ok) {
                const data = await response.json()
                if (data.options && data.options.length > 0) {
                    // Try to get distance from recommended option
                    const distanceStr = data.summary?.recommended?.distance
                    if (distanceStr) {
                        const match = distanceStr.match(/([\d.]+)\s*km/i)
                        if (match) {
                            return parseFloat(match[1])
                        }
                    }

                    // If no distance in recommended option (e.g., flights), calculate from coordinates
                    if (data.origin && data.destination) {
                        const { latitude: lat1, longitude: lon1 } = data.origin
                        const { latitude: lat2, longitude: lon2 } = data.destination

                        // Haversine formula to calculate distance between two points
                        const R = 6371 // Earth's radius in kilometers
                        const dLat = (lat2 - lat1) * Math.PI / 180
                        const dLon = (lon2 - lon1) * Math.PI / 180
                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2)
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                        const distance = R * c

                        return distance
                    }
                }
            }
            return null
        } catch (error) {
            console.error('Error fetching transit distance:', error)
            return null
        }
    }

    const fetchTransitOptions = async (originPlaceId: string, destinationPlaceId: string): Promise<TransitOption[]> => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
            const response = await fetch(
                `${apiUrl}/api/travel/options?origin=${encodeURIComponent(originPlaceId)}&destination=${encodeURIComponent(destinationPlaceId)}`
            )

            if (response.ok) {
                const data = await response.json()
                if (data.options && data.options.length > 0) {
                    return data.options.map((opt: any) => ({
                        type: opt.type,
                        duration: opt.duration,
                        distance: opt.distance,
                        cost: opt.price ? `$${opt.price.amount}` : opt.cost,
                        provider: opt.provider
                    }))
                }
            }
            return []
        } catch (error) {
            console.error('Error fetching transit options:', error)
            return []
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'drive': return carSportOutline
            case 'bus': return busOutline
            case 'train': return trainOutline
            case 'flight': return airplaneOutline
            case 'walk': return walkOutline
            case 'bicycle': return bicycleOutline
            default: return carSportOutline
        }
    }

    const drawLine = (
        ctx: CanvasRenderingContext2D,
        start: Point,
        end: Point,
        distance: number,
        displayMode: 'none' | 'loader' | 'distance' = 'distance',
        animFrame: number = 0,
        selectedOption?: TransitOption
    ) => {
        ctx.save()

        const color = '#000000'
        const width = 3

        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.setLineDash([12, 6])

        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        ctx.setLineDash([])

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

        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2

        // Calculate the angle of the line
        const lineAngle = Math.atan2(end.y - start.y, end.x - start.x)

        if (displayMode === 'distance' && distance > 0) {
            ctx.save()

            // Translate to midpoint and rotate to line angle
            ctx.translate(midX, midY)
            ctx.rotate(lineAngle)

            // Keep text upright (don't let it be upside down)
            if (lineAngle > Math.PI / 2 || lineAngle < -Math.PI / 2) {
                ctx.rotate(Math.PI)
            }

            ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'

            const distanceText = `${distance.toFixed(2)} km`
            const textMetrics = ctx.measureText(distanceText)
            const textWidth = textMetrics.width
            const padding = 6
            const offsetY = -8 // Position above the line

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.fillRect(
                -textWidth / 2 - padding,
                offsetY - 16,
                textWidth + padding * 2,
                20
            )

            ctx.fillStyle = color
            ctx.fillText(distanceText, 0, offsetY)

            ctx.restore()
        } else if (displayMode === 'loader') {
            const loaderRadius = 8

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.beginPath()
            ctx.arc(midX, midY, loaderRadius + 4, 0, Math.PI * 2)
            ctx.fill()

            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(midX, midY, loaderRadius + 4, 0, Math.PI * 2)
            ctx.stroke()

            const dotRadius = 2
            const dotSpacing = 6
            const cycle = Math.floor(animFrame / 4) % 3

            for (let i = 0; i < 3; i++) {
                const dotX = midX - dotSpacing + i * dotSpacing
                let opacity = 0.3
                if (i === cycle) {
                    opacity = 1.0
                } else if (i === (cycle + 2) % 3) {
                    opacity = 0.5
                }

                ctx.fillStyle = color
                ctx.globalAlpha = opacity
                ctx.beginPath()
                ctx.arc(dotX, midY, dotRadius, 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.globalAlpha = 1.0
        }

        // Draw selected transit option details below the line
        if (selectedOption && displayMode === 'distance') {
            ctx.save()

            // Translate to midpoint and rotate to line angle
            ctx.translate(midX, midY)
            ctx.rotate(lineAngle)

            // Keep text upright (don't let it be upside down)
            if (lineAngle > Math.PI / 2 || lineAngle < -Math.PI / 2) {
                ctx.rotate(Math.PI)
            }

            const offsetY = 12 // Position below the line

            // Format type: capitalize first letter
            const formatType = (type: string) => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
            const typeText = formatType(selectedOption.type)

            // Get Material Icon name based on type
            const type = selectedOption.type.toLowerCase()
            let iconName = ''
            if (type === 'drive') iconName = 'directions_car'
            else if (type === 'bus') iconName = 'directions_bus'
            else if (type === 'train') iconName = 'directions_transit'
            else if (type === 'flight') iconName = 'flight'
            else if (type === 'walk') iconName = 'directions_walk'
            else if (type === 'bicycle') iconName = 'directions_bike'
            else iconName = 'circle'

            // Build text without icon
            const textOnly = `${typeText} • ${selectedOption.duration}${selectedOption.cost ? ' • ' + selectedOption.cost : ''}`

            const iconSize = 16
            const iconPadding = 6

            // Measure text to get width
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
            const textMetrics = ctx.measureText(textOnly)
            const textWidth = textMetrics.width

            // Measure icon width
            ctx.font = `${iconSize}px "Material Icons"`
            const iconMetrics = ctx.measureText(iconName)
            const iconWidth = iconMetrics.width || iconSize

            const totalWidth = iconWidth + iconPadding + textWidth
            const startX = -totalWidth / 2

            // Draw Material Icon
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#007aff'
            ctx.font = `${iconSize}px "Material Icons"`
            ctx.fillText(iconName, startX, offsetY + 8)

            // Draw text
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
            ctx.fillStyle = '#000000'
            ctx.fillText(textOnly, startX + iconWidth + iconPadding, offsetY + 8)

            ctx.restore()
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(start.x, start.y, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(end.x, end.y, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }

    const onMouseDown = async (
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

        console.log('Transit tool click at:', x, y)
        console.log('Saved lines:', savedLines)

        // Check if clicking on an existing line first
        const clickedLine = findLineAtPosition(x, y)
        console.log('Clicked line:', clickedLine)
        if (clickedLine) {
            // Prevent the click from propagating to the document (which would close the menu)
            e.stopPropagation()


            // Get canvas bounding rect for absolute positioning
            const rect = canvas.getBoundingClientRect()
            const midX = (clickedLine.start.x + clickedLine.end.x) / 2
            const midY = (clickedLine.start.y + clickedLine.end.y) / 2

            console.log('Setting menu position:', {
                x: rect.left + midX,
                y: rect.top + midY,
                lineId: clickedLine.id
            })

            setSelectedLineId(clickedLine.id)
            setMenuPosition({
                x: rect.left + midX,
                y: rect.top + midY
            })

            // Always fetch fresh transit options when menu is opened
            setIsLoadingOptions(true)
            const startPin = pins.find(p => p.id === clickedLine.startPinId)
            const endPin = pins.find(p => p.id === clickedLine.endPinId)

            if (startPin?.placeId && endPin?.placeId) {
                const options = await fetchTransitOptions(startPin.placeId, endPin.placeId)

                // Update the line with transit options
                if (setSavedLines) {
                    setSavedLines(prev => prev.map(line =>
                        line.id === clickedLine.id
                            ? { ...line, transitOptions: options }
                            : line
                    ))
                }
            }
            setIsLoadingOptions(false)
            return
        }

        const pinIndex = findPinAtPosition(x, y)

        if (pinIndex !== null) {
            // Close menu when starting to draw
            setSelectedLineId(null)
            setMenuPosition(null)

            const pin = pins[pinIndex]
            setStartPoint({ x: pin.x, y: pin.y })
            setStartPinIndex(pinIndex)
            setCurrentPoint({ x: pin.x, y: pin.y })
            setIsDrawing(true)

            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvasStateBeforeDrawing.current = currentState
        } else {
            // Clicked on empty space - close menu
            setSelectedLineId(null)
            setMenuPosition(null)
        }
    }

    const [hoveredLineId, setHoveredLineId] = useState<number | null>(null)

    const onMouseMove = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const { x, y } = getCoordinates(canvasRef, e)
        const pinIndex = findPinAtPosition(x, y)
        setHoveredPinIndex(pinIndex)

        // Check if hovering over a transit line (only when not drawing)
        if (!isDrawing) {
            const hoveredLine = findLineAtPosition(x, y)
            setHoveredLineId(hoveredLine?.id ?? null)
        }

        if (isDrawing && startPoint && canvasStateBeforeDrawing.current) {
            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

            savedLines.forEach(line => {
                drawLine(ctx, line.start, line.end, line.distance, 'distance', 0, line.selectedOption)
            })

            const snappedPin = pinIndex
            const endPoint = snappedPin !== null ? { x: pins[snappedPin].x, y: pins[snappedPin].y } : { x, y }
            setCurrentPoint(endPoint)

            if (!showLoader) {
                drawLine(ctx, startPoint, endPoint, 0, 'none')
            }
        }
    }

    const onMouseUp = async (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isDrawing && startPoint && startPinIndex !== null) {
            const { x, y } = getCoordinates(canvasRef, e)
            const endPinIndex = findPinAtPosition(x, y)

            if (endPinIndex !== null && endPinIndex !== startPinIndex) {
                const endPin = pins[endPinIndex]
                const startPin = pins[startPinIndex]

                const canvas = canvasRef.current
                if (!canvas) return

                const ctx = canvas.getContext('2d')
                if (!ctx) return

                // Stop drawing mode immediately to prevent line from following cursor
                setIsDrawing(false)

                // Clear the preview line by restoring the canvas state
                if (canvasStateBeforeDrawing.current) {
                    ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
                }

                // Redraw existing lines
                savedLines.forEach(line => {
                    drawLine(ctx, line.start, line.end, line.distance, 'distance', 0, line.selectedOption)
                })

                if (startPin.placeId && endPin.placeId) {
                    // Draw the line with loader animation
                    const lineStart = { x: startPin.x, y: startPin.y }
                    const lineEnd = { x: endPin.x, y: endPin.y }

                    // Draw the new line immediately with loader animation
                    drawLine(ctx, lineStart, lineEnd, 0, 'loader', 0)

                    setStartPoint(lineStart)
                    setCurrentPoint(lineEnd)
                    setShowLoader(true)
                    setActualDistance(null)

                    loaderTimeoutRef.current = window.setTimeout(() => {
                        setShowLoader(false)
                    }, 30000)

                    const distance = await fetchTransitDistance(startPin.placeId, endPin.placeId)

                    if (loaderTimeoutRef.current !== null) {
                        clearTimeout(loaderTimeoutRef.current)
                        loaderTimeoutRef.current = null
                    }

                    setShowLoader(false)

                    if (distance !== null) {
                        setActualDistance(distance)

                        const newLine: TransitLine = {
                            start: { x: startPin.x, y: startPin.y },
                            end: { x: endPin.x, y: endPin.y },
                            distance,
                            id: Date.now(),
                            startPinId: startPin.id,
                            endPinId: endPin.id
                        }

                        if (setSavedLines) {
                            setSavedLines(prev => [...prev, newLine])
                        }

                        // Restore canvas and redraw all lines including the new one
                        if (canvasStateBeforeDrawing.current) {
                            ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

                            // Store this as the base state (before transit lines)
                            canvasStateBeforeTransitLines.current = canvasStateBeforeDrawing.current

                            const allLines = [...savedLines, newLine]
                            allLines.forEach(line => {
                                drawLine(ctx, line.start, line.end, line.distance, 'distance', 0, line.selectedOption)
                            })
                        }

                        if (deps.saveToHistory) {
                            deps.saveToHistory()
                        }
                    } else {
                        // If distance fetch failed, restore the canvas
                        if (canvasStateBeforeDrawing.current) {
                            ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
                            savedLines.forEach(line => {
                                drawLine(ctx, line.start, line.end, line.distance, 'distance', 0, line.selectedOption)
                            })
                        }
                    }
                }
            }

            // Clean up drawing state (isDrawing already set to false earlier)
            setStartPoint(null)
            setStartPinIndex(null)
            setCurrentPoint(null)
            canvasStateBeforeDrawing.current = null
            setActualDistance(null)
        }
    }

    const onMouseLeave = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isDrawing) {
            onMouseUp(canvasRef, e, deps)
        }
        setHoveredPinIndex(null)
    }

    const toolbar = (deps: Record<string, any>) => {
        const selectedLine = savedLines.find(line => line.id === selectedLineId)

        console.log('Toolbar render - menuPosition:', menuPosition, 'selectedLineId:', selectedLineId, 'selectedLine:', selectedLine)

        return (
            <>
                <div style={{ padding: '10px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>Transit Tool</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Draw lines between location pins to see distances
                    </div>
                </div>

                {/* Transit Tool Enabled Message */}
                <div className="transit-mode-message">
                    <div className="transit-mode-message-content">
                        <span className="transit-mode-icon">🚇</span>
                        <span>Transit tool enabled. Drag a line between any two points to measure distance and get transit insights.</span>
                    </div>
                </div>

                {/* Transit Options Menu */}
                {menuPosition && selectedLine && (
                    <div
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            left: `${menuPosition.x}px`,
                            top: `${menuPosition.y}px`,
                            transform: 'translate(-50%, -50%)',
                            background: 'white',
                            borderRadius: '10px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            padding: '10px',
                            minWidth: '240px',
                            maxWidth: '280px',
                            zIndex: 1000,
                        }}
                    >
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                            Transit Options
                        </div>

                        {isLoadingOptions ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                                Loading options...
                            </div>
                        ) : selectedLine.transitOptions && selectedLine.transitOptions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {selectedLine.transitOptions.map((option, index) => {
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                console.log('Selected transit option:', option)
                                                console.log('Has base state:', !!canvasStateBeforeTransitLines.current)

                                                // Update the line with the selected option
                                                if (setSavedLines && canvasRefForRedraw.current) {
                                                    const canvas = canvasRefForRedraw.current
                                                    const ctx = canvas.getContext('2d')

                                                    if (ctx && canvasStateBeforeTransitLines.current) {
                                                        // Restore the base canvas state (before ANY transit lines)
                                                        ctx.putImageData(canvasStateBeforeTransitLines.current, 0, 0)

                                                        // Update the savedLines with the new selection
                                                        const updatedLines = savedLines.map(line =>
                                                            line.id === selectedLineId
                                                                ? { ...line, selectedOption: option }
                                                                : line
                                                        )

                                                        // Redraw ALL transit lines with the updated data
                                                        updatedLines.forEach(line => {
                                                            drawLine(ctx, line.start, line.end, line.distance, 'distance', 0, line.selectedOption)
                                                        })

                                                        // Update state
                                                        setSavedLines(updatedLines)

                                                        // Save to history
                                                        if (deps.saveToHistory) {
                                                            deps.saveToHistory()
                                                        }
                                                    } else {
                                                        // Fallback: just update state without redrawing
                                                        setSavedLines(prev => prev.map(line =>
                                                            line.id === selectedLineId
                                                                ? { ...line, selectedOption: option }
                                                                : line
                                                        ))
                                                    }
                                                }

                                                setSelectedLineId(null)
                                                setMenuPosition(null)
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                background: '#f9fafb',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                fontSize: '13px',
                                                gap: '8px',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#f3f4f6'
                                                e.currentTarget.style.borderColor = '#d1d5db'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#f9fafb'
                                                e.currentTarget.style.borderColor = '#e5e7eb'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                <IonIcon icon={getTypeIcon(option.type)} style={{ fontSize: '18px', color: '#6b7280' }} />
                                                <span style={{ fontWeight: '500', color: '#1f2937', textTransform: 'capitalize' }}>
                                                    {option.type}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                                    {option.duration}
                                                </span>
                                                {option.cost && (
                                                    <span style={{ fontWeight: '600', color: '#2563eb', fontSize: '12px' }}>
                                                        {option.cost}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                                No transit options available
                            </div>
                        )}
                    </div>
                )}
            </>
        )
    }

    return {
        toolbar,
        cursor: hoveredLineId !== null ? 'pointer' : (hoveredPinIndex !== null ? 'crosshair' : 'default'),
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
