import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'
import TransitToolbar from '@/components/TransitToolbar/TransitToolbar'

interface Point {
    x: number
    y: number
}

interface TransitOption {
    type: 'drive' | 'bus' | 'train' | 'flight' | 'walk' | 'bicycle'
    duration: string
    distance?: string
    cost?: string
    price?: {
        amount: number
        currency: string
    }
    icon: string
    provider?: string
}

interface TransitLine {
    start: Point
    end: Point
    distance: number
    id: number
    transitOptions?: TransitOption[]
    selectedOptionIndex?: number
    lineColor?: string
    lineWidth?: number
}

export const useTransitTool = (
    pins: LocationPin[],
    savedLines: TransitLine[] = [],
    setSavedLines?: React.Dispatch<React.SetStateAction<TransitLine[]>>
): CanvasTool => {
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
    const [fetchedTransitOptions, setFetchedTransitOptions] = useState<TransitOption[]>([])
    const [isFetchingTransit, setIsFetchingTransit] = useState(false)
    const [actualDistance, setActualDistance] = useState<number | null>(null)
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

    // Redraw all saved transit lines when they change or canvas is available
    useEffect(() => {
        // Get canvas from the canvas ref passed via deps
        // We'll redraw when canvas is available through the tool's interaction
    }, [savedLines, lineColor, lineWidth])

    // Redraw canvas when animation frame changes (to animate the loader)
    useEffect(() => {
        if (showLoader && isDrawing && startPoint && currentPoint && canvasStateBeforeDrawing.current && canvasRefForRedraw.current) {
            const canvas = canvasRefForRedraw.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Restore the canvas to the state before drawing started
            ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

            // Redraw all saved lines first
            savedLines.forEach(line => {
                drawLine(
                    ctx,
                    line.start,
                    line.end,
                    line.lineColor || lineColor,
                    line.lineWidth || lineWidth,
                    line.distance,
                    'distance',
                    0,
                    line.transitOptions,
                    line.selectedOptionIndex || 0
                )
            })

            // Redraw the preview line with updated animation frame
            const distance = calculateDistance(startPoint, currentPoint)
            drawLine(ctx, startPoint, currentPoint, lineColor, lineWidth, distance, 'loader', animationFrame, undefined, 0)
        }
    }, [animationFrame, showLoader, isDrawing, startPoint, currentPoint, lineColor, lineWidth, savedLines])

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

        // Check if click is within the panel bounds (with tolerance for easier clicking)
        const tolerance = 10
        if (x < panelX - tolerance || x > panelX + panelWidth + tolerance || 
            y < startPanelY - tolerance || y > startPanelY + totalHeight + tolerance) {
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

    // Map backend travel option types to our TransitOption format
    const mapTravelOptionToTransitOption = (option: any): TransitOption => {
        const typeMap: Record<string, 'drive' | 'bus' | 'train' | 'flight' | 'walk' | 'bicycle'> = {
            'drive': 'drive',
            'bus': 'bus',
            'train': 'train',
            'flight': 'flight',
            'walk': 'walk',
            'bicycle': 'bicycle'
        }

        const iconMap: Record<string, string> = {
            'drive': '🚗',
            'bus': '🚌',
            'train': '🚆',
            'flight': '✈️',
            'walk': '🚶',
            'bicycle': '🚴'
        }

        const type = typeMap[option.type] || 'drive'
        const cost = option.price 
            ? `$${option.price.amount}` 
            : option.cost || undefined

        return {
            type,
            duration: option.duration || 'N/A',
            distance: option.distance,
            cost,
            price: option.price,
            icon: iconMap[type] || '🚗',
            provider: option.provider
        }
    }

    // Fetch transit options from backend API
    const fetchTransitOptions = async (originPlaceId: string, destinationPlaceId: string): Promise<TransitOption[]> => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
            const response = await fetch(
                `${apiUrl}/api/travel/options?origin=${encodeURIComponent(originPlaceId)}&destination=${encodeURIComponent(destinationPlaceId)}`
            )

            if (response.ok) {
                const data = await response.json()
                // Map backend options to our format
                const options = (data.options || []).map(mapTravelOptionToTransitOption)
                return options
            } else {
                console.warn('Failed to fetch transit options from API')
                return []
            }
        } catch (error) {
            console.error('Error fetching transit options:', error)
            return []
        }
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

            // Use actual distance from API if available, otherwise use calculated distance
            let distanceText = `${distance} km`
            if (transitOptions && transitOptions.length > 0 && transitOptions[0].distance) {
                // Extract distance from first option (format: "123.45 km (76.67 mi)")
                const distMatch = transitOptions[0].distance.match(/([\d.]+)\s*km/i)
                if (distMatch) {
                    distanceText = `${parseFloat(distMatch[1]).toFixed(0)} km`
                }
            }

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

                // Draw selection background for selected option (more prominent)
                if (isSelected) {
                    // Draw a more prominent selection indicator
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)' // Slightly darker blue background
                    ctx.beginPath()
                    const inset = 2
                    const rowBorderRadius = 8
                    ctx.roundRect(panelX + inset, y + inset, panelWidth - inset * 2, rowHeight - inset * 2, rowBorderRadius)
                    ctx.fill()
                    
                    // Draw border around selected option
                    ctx.strokeStyle = '#2563eb'
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.roundRect(panelX + inset, y + inset, panelWidth - inset * 2, rowHeight - inset * 2, rowBorderRadius)
                    ctx.stroke()
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
                const typeName = option.type === 'drive' ? 'Drive' :
                                option.type === 'bus' ? 'Bus' :
                                option.type === 'train' ? 'Train' :
                                option.type === 'flight' ? 'Flight' :
                                option.type === 'walk' ? 'Walk' :
                                option.type === 'bicycle' ? 'Bicycle' : 'Drive'

                // Draw type and duration
                ctx.font = isSelected ? 'bold 15px system-ui, -apple-system, sans-serif' : '15px system-ui, -apple-system, sans-serif'
                ctx.textAlign = 'left'
                ctx.fillStyle = isSelected ? '#2563eb' : '#1f2937' // Blue when selected
                const textX = iconX + 38
                const durationText = option.duration || 'N/A'
                ctx.fillText(`${typeName} - ${durationText}`, textX, rowCenterY)

                // Draw cost on the right (if available)
                if (option.cost) {
                    ctx.font = isSelected ? 'bold 15px system-ui, -apple-system, sans-serif' : '15px system-ui, -apple-system, sans-serif'
                    ctx.textAlign = 'right'
                    ctx.fillStyle = isSelected ? '#2563eb' : '#9ca3af' // Blue when selected
                    const costX = panelX + panelWidth - panelPadding - 8
                    ctx.fillText(option.cost, costX, rowCenterY)
                }
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
        
        // Also store in deps for access by other tools
        if (_deps?.canvasRef) {
            _deps.canvasRef.current = canvas
        }

        // First, check if clicking on any saved transit line's options panel
        if (savedLines.length > 0 && setSavedLines) {
            for (const savedLine of savedLines) {
                if (savedLine.transitOptions && savedLine.transitOptions.length > 0) {
                    const clickedOptionIndex = getClickedTransitOption(
                        x, 
                        y, 
                        savedLine.start, 
                        savedLine.end, 
                        savedLine.transitOptions
                    )

                    if (clickedOptionIndex !== null) {
                        // Clicked on a transit option - prevent event propagation
                        e.preventDefault()
                        e.stopPropagation()
                        
                        // Update the saved line's selected option
                        setSavedLines((prev: TransitLine[]) => 
                            prev.map(line => 
                                line.id === savedLine.id 
                                    ? { ...line, selectedOptionIndex: clickedOptionIndex }
                                    : line
                            )
                        )

                        // State update will trigger redraw through Canvas useEffect
                        // No need to manually redraw here

                        return // Don't start a new line or do anything else
                    }
                }
            }
        }

        // Check if clicking on transit options panel during drawing
        if (isDrawing && startPoint && currentPoint && showDistance && fetchedTransitOptions.length > 0) {
            const clickedOptionIndex = getClickedTransitOption(x, y, startPoint, currentPoint, fetchedTransitOptions)

            if (clickedOptionIndex !== null) {
                // Clicked on a transit option - prevent event propagation
                e.preventDefault()
                e.stopPropagation()
                
                // Update selected index
                setSelectedTransitIndex(clickedOptionIndex)

                // Redraw with selected option
                if (canvasStateBeforeDrawing.current) {
                    ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
                    const distance = actualDistance || calculateDistance(startPoint, currentPoint)
                    drawLine(ctx, startPoint, currentPoint, lineColor, lineWidth, Math.round(distance), 'distance', animationFrame, fetchedTransitOptions, clickedOptionIndex)
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
        let endPin: LocationPin | null = null
        if (pinIndex !== null && pinIndex !== startPinIndex) {
            endPin = pins[pinIndex]
            endPoint = { x: endPin.x, y: endPin.y }
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

        if (isSnappedToPin && startPinIndex !== null && endPin) {
            const startPin = pins[startPinIndex]
            
            // Check if both pins have placeIds for API call
            const canFetchFromAPI = startPin.placeId && endPin.placeId

            if (canFetchFromAPI && !isFetchingTransit && fetchedTransitOptions.length === 0 && startPin.placeId && endPin.placeId) {
                // Fetch transit options from API
                setIsFetchingTransit(true)
                setShowLoader(true)
                setShowDistance(false)
                displayMode = 'loader'

                fetchTransitOptions(startPin.placeId, endPin.placeId)
                    .then(options => {
                        setFetchedTransitOptions(options)
                        setIsFetchingTransit(false)
                        setShowLoader(false)
                        setShowDistance(true)
                        // Extract distance from first option if available
                        if (options.length > 0 && options[0].distance) {
                            const distMatch = options[0].distance.match(/([\d.]+)\s*km/i)
                            if (distMatch) {
                                setActualDistance(parseFloat(distMatch[1]))
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching transit options:', error)
                        setIsFetchingTransit(false)
                        setShowLoader(false)
                        setShowDistance(false)
                    })
            } else if (showDistance && fetchedTransitOptions.length > 0) {
                // Already showing distance with fetched options
                displayMode = 'distance'
            } else if (showLoader || isFetchingTransit) {
                // Currently showing loader or fetching
                displayMode = 'loader'
            } else if (!canFetchFromAPI) {
                // No placeIds, use pixel-based distance calculation
                const distance = calculateDistance(startPoint, endPoint)
                setActualDistance(distance)
                setShowLoader(true)
                setShowDistance(false)
                displayMode = 'loader'
                
                // After 500ms, show the distance with generated options
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
            setFetchedTransitOptions([])
            setIsFetchingTransit(false)
            setActualDistance(null)
            displayMode = 'none'
        }

        // Restore the canvas to the state before drawing started
        ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)

        // Draw the preview line (use selected index if available)
        const distance = actualDistance || calculateDistance(startPoint, endPoint)
        const transitOpts = displayMode === 'distance' 
            ? (fetchedTransitOptions.length > 0 ? fetchedTransitOptions : undefined)
            : undefined
        const optionIndexToShow = transitOpts && transitOpts.length > 0 
            ? Math.min(selectedTransitIndex, transitOpts.length - 1)
            : 0
        drawLine(ctx, startPoint, endPoint, lineColor, lineWidth, Math.round(distance), displayMode, animationFrame, transitOpts, optionIndexToShow)
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

            const distance = actualDistance || calculateDistance(startPoint, endPoint)
            const transitOpts = fetchedTransitOptions.length > 0 ? fetchedTransitOptions : undefined

            // Restore canvas state and draw final line with selected option
            if (canvasStateBeforeDrawing.current) {
                ctx.putImageData(canvasStateBeforeDrawing.current, 0, 0)
            }
            
            // Ensure selected index is valid
            const validSelectedIndex = transitOpts && transitOpts.length > 0
                ? Math.min(selectedTransitIndex, transitOpts.length - 1)
                : 0
            
            drawLine(ctx, startPoint, endPoint, lineColor, lineWidth, Math.round(distance), 'distance', 0, transitOpts, validSelectedIndex)

            // Save the line with selected option
            const newLine: TransitLine = {
                start: startPoint,
                end: endPoint,
                distance: Math.round(distance),
                id: Date.now(),
                transitOptions: transitOpts,
                selectedOptionIndex: validSelectedIndex,
                lineColor,
                lineWidth
            }
            
            // Update saved lines if setter is provided
            if (setSavedLines) {
                setSavedLines((prev: TransitLine[]) => [...prev, newLine])
            }

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
        setFetchedTransitOptions([])
        setIsFetchingTransit(false)
        setActualDistance(null)
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
        setFetchedTransitOptions([])
        setIsFetchingTransit(false)
        setActualDistance(null)
        canvasStateBeforeDrawing.current = null

        // Clear timeout if any
        if (loaderTimeoutRef.current !== null) {
            clearTimeout(loaderTimeoutRef.current)
            loaderTimeoutRef.current = null
        }
    }

    const toolbar = (deps: Record<string, any>) => (
        <TransitToolbar
            deps={{
                undo: deps.undo || (() => {}),
                redo: deps.redo || (() => {}),
                saveToHistory: deps.saveToHistory || (() => {}),
                canUndo: deps.historyStep > 0,
                canRedo: deps.historyStep < (deps.history?.length || 0) - 1,
            }}
            lineColor={lineColor}
            setLineColor={setLineColor}
            lineWidth={lineWidth}
            setLineWidth={setLineWidth}
        />
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
