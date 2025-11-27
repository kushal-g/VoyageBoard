import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'
import LocationToolbar from '@/components/LocationToolbar/LocationToolbar'

interface Point {
    x: number
    y: number
}

// Static list of popular destinations
const DESTINATIONS = [
    'Paris, France',
    'Tokyo, Japan',
    'New York, USA',
    'London, UK',
    'Rome, Italy',
    'Barcelona, Spain',
    'Dubai, UAE',
    'Singapore',
    'Sydney, Australia',
    'Bangkok, Thailand',
    'Istanbul, Turkey',
    'Amsterdam, Netherlands',
    'Los Angeles, USA',
    'Hong Kong',
    'Berlin, Germany',
    'Vienna, Austria',
    'Prague, Czech Republic',
    'Bali, Indonesia',
    'Santorini, Greece',
    'Maldives',
    'Reykjavik, Iceland',
    'Cairo, Egypt',
    'Marrakech, Morocco',
    'Mumbai, India',
    'Rio de Janeiro, Brazil',
    'Cape Town, South Africa',
    'Seoul, South Korea',
    'Mexico City, Mexico',
    'Venice, Italy',
    'Florence, Italy'
].sort()

export const useLocationTool = (
    pins: LocationPin[],
    setPins: React.Dispatch<React.SetStateAction<LocationPin[]>>
): CanvasTool => {
    const [pinColor] = useState('#808080') // Default gray color for all locations
    const [pinLocation, setPinLocation] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [filteredDestinations, setFilteredDestinations] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)
    const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hoverPinIndex, setHoverPinIndex] = useState<number | null>(null)
    const [isEditingLocation, setIsEditingLocation] = useState(false)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const canvasRefForRedraw = useRef<HTMLCanvasElement | null>(null)
    const canvasStateBeforeDrag = useRef<ImageData | null>(null)
    const mouseDownPosition = useRef<Point | null>(null)
    const hasMoved = useRef(false)

    // Filter destinations based on input
    useEffect(() => {
        if (pinLocation.trim() === '') {
            setFilteredDestinations([])
            setShowSuggestions(false)
        } else {
            const filtered = DESTINATIONS.filter(dest =>
                dest.toLowerCase().includes(pinLocation.toLowerCase())
            ).slice(0, 5) // Limit to 5 suggestions
            setFilteredDestinations(filtered)
            setShowSuggestions(filtered.length > 0)
        }
    }, [pinLocation])

    // Redraw canvas when pins change (to show updated location text)
    useEffect(() => {
        if (canvasRefForRedraw.current) {
            const canvas = canvasRefForRedraw.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Only redraw if we have pins to draw
            if (pins.length > 0) {
                // Redraw all locations with flag + badge
                pins.forEach(pin => {
                    // Draw location with flag + badge (use pin's color if stored, otherwise default)
                    const color = (pin as any).color || pinColor
                    drawLocation(ctx, pin.x, pin.y, color, pin.location)
                })
            }
        }
    }, [pins, pinColor])

    const handleLocationSelect = (location: string) => {
        setPinLocation(location)
        setShowSuggestions(false)

        // If editing a selected pin, update its location
        if (selectedPinIndex !== null && isEditingLocation) {
            updatePinLocation(selectedPinIndex, location)
        }
    }

    const updatePinLocation = (pinIndex: number, newLocation: string) => {
        setPins(prev => {
            const newPins = [...prev]
            if (pinIndex < newPins.length) {
                newPins[pinIndex] = {
                    ...newPins[pinIndex],
                    location: newLocation
                }
            }
            return newPins
        })
    }

    const handleLocationChange = (newLocation: string) => {
        setPinLocation(newLocation)

        // If editing a selected pin, update its location in real-time
        if (selectedPinIndex !== null && isEditingLocation) {
            updatePinLocation(selectedPinIndex, newLocation)
        }
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

    // Convert hex color to muted (lighter) version
    const getMutedColor = (hexColor: string): { r: number; g: number; b: number } => {
        // Remove # if present
        const hex = hexColor.replace('#', '')
        
        // Parse RGB
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        
        // Lighten by mixing with white (60% white, 40% original)
        const lightenFactor = 0.6
        return {
            r: Math.round(r + (255 - r) * lightenFactor),
            g: Math.round(g + (255 - g) * lightenFactor),
            b: Math.round(b + (255 - b) * lightenFactor)
        }
    }

    // Check if a point is near a location flag (within clickable radius)
    const findPinAtPosition = (x: number, y: number): number | null => {
        const clickRadius = 30 // Radius to detect clicks on flag icons

        for (let i = pins.length - 1; i >= 0; i--) {
            const pin = pins[i]
            // Check distance from flag pole position
            const dx = x - pin.x
            const dy = y - pin.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance <= clickRadius) {
                return i
            }
        }

        return null
    }

    // Handle Select mode toggle
    const handleSelectModeToggle = () => {
        setIsSelectMode(prev => !prev)
        setIsEditingLocation(false)
        setSelectedPinIndex(null)
    }

    // Handle adding location via button click - add immediately to center of canvas
    const handleAddLocation = (canvasRef: React.RefObject<HTMLCanvasElement | null> | undefined) => {
        if (!pinLocation.trim() || filteredDestinations.length === 0) return
        
        const canvas = canvasRef?.current
        if (!canvas) {
            console.warn('Canvas ref not available')
            return
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Get canvas dimensions in CSS pixels (not accounting for device pixel ratio)
        // The canvas context is already scaled for DPR
        const rect = canvas.getBoundingClientRect()
        const x = rect.width / 2
        const y = rect.height / 2

        // Create new pin
        const newPin: LocationPin & { color?: string } = {
            x,
            y,
            id: Date.now(),
            location: pinLocation,
            color: pinColor
        }

        // Draw location on canvas immediately
        drawLocation(ctx, x, y, pinColor, pinLocation)

        // Add pin to state
        setPins(prev => [...prev, newPin])

        // Save canvas ref for future use
        canvasRefForRedraw.current = canvas

        // Clear location input
        setPinLocation('')
        setFilteredDestinations([])
        setShowSuggestions(false)
    }

    // Draw flag icon on canvas
    const drawFlagIcon = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        size: number = 24
    ) => {
        ctx.save()
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Flag pole (vertical line)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y - size * 0.8)
        ctx.stroke()

        // Flag shape (rectangle)
        const flagWidth = size * 0.6
        const flagHeight = size * 0.4
        ctx.beginPath()
        ctx.moveTo(x, y - size * 0.8)
        ctx.lineTo(x + flagWidth, y - size * 0.8)
        ctx.lineTo(x + flagWidth, y - size * 0.8 + flagHeight)
        ctx.lineTo(x, y - size * 0.8 + flagHeight)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
    }

    // Draw location with flag icon + badge
    const drawLocation = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        location: string
    ) => {
        ctx.save()
        
        const flagSize = 24
        const flagPoleX = x
        const flagPoleY = y
        
        // Draw flag icon
        drawFlagIcon(ctx, flagPoleX, flagPoleY, color, flagSize)

        // Draw badge with location text
        if (location) {
            const mutedColor = getMutedColor(color)
            const padding = 6
            const badgePadding = 4
            
            ctx.font = '12px Arial, sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            
            const textMetrics = ctx.measureText(location)
            const textWidth = textMetrics.width
            const textHeight = 16
            const badgeX = flagPoleX + flagSize * 0.6 + padding
            const badgeY = flagPoleY - flagSize * 0.6

            // Draw badge background (rounded rectangle)
            const badgeWidth = textWidth + badgePadding * 2
            const badgeHeight = textHeight + badgePadding * 2
            const radius = 6

            ctx.fillStyle = `rgba(${mutedColor.r}, ${mutedColor.g}, ${mutedColor.b}, 0.9)`
            ctx.beginPath()
            ctx.moveTo(badgeX + radius, badgeY - badgeHeight / 2)
            ctx.lineTo(badgeX + badgeWidth - radius, badgeY - badgeHeight / 2)
            ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY - badgeHeight / 2, badgeX + badgeWidth, badgeY - badgeHeight / 2 + radius)
            ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight / 2 - radius)
            ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight / 2, badgeX + badgeWidth - radius, badgeY + badgeHeight / 2)
            ctx.lineTo(badgeX + radius, badgeY + badgeHeight / 2)
            ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight / 2, badgeX, badgeY + badgeHeight / 2 - radius)
            ctx.lineTo(badgeX, badgeY - badgeHeight / 2 + radius)
            ctx.quadraticCurveTo(badgeX, badgeY - badgeHeight / 2, badgeX + radius, badgeY - badgeHeight / 2)
            ctx.closePath()
            ctx.fill()

            // Draw border
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            ctx.stroke()

            // Draw text in badge
            ctx.fillStyle = color
            ctx.fillText(location, badgeX + badgePadding, badgeY)
        }

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

        const { x, y } = getCoordinates(canvasRef, e)
        canvasRefForRedraw.current = canvas

        // Check if clicking on an existing location flag
        const pinIndex = findPinAtPosition(x, y)

        // Only allow dragging in Select mode
        if (isSelectMode && pinIndex !== null) {
            // Select this location and prepare for dragging
            setSelectedPinIndex(pinIndex)

            // Save the current canvas state (with all locations) for potential dragging
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvasStateBeforeDrag.current = currentState

            // Track mouse down position to detect if it's a click or drag
            mouseDownPosition.current = { x, y }
            hasMoved.current = false

            // Start dragging existing location
            setIsDragging(true)
        } else if (!isSelectMode) {
            // When not in Select mode, clicking on canvas does nothing
            // (locations are added via button click only)
            return
        } else {
            // In Select mode but not clicking on a location - deselect
            setSelectedPinIndex(null)
            setIsEditingLocation(false)
        }
    }

    const onMouseMove = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const { x, y } = getCoordinates(canvasRef, e)

        if (isDragging && selectedPinIndex !== null && canvasStateBeforeDrag.current) {
            // Mark that we've moved (not just a click)
            if (mouseDownPosition.current) {
                const dx = x - mouseDownPosition.current.x
                const dy = y - mouseDownPosition.current.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance > 3) { // Threshold to detect drag vs click
                    hasMoved.current = true
                }
            }

            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Restore the original canvas state (this has all the drawing + all pins)
            ctx.putImageData(canvasStateBeforeDrag.current, 0, 0)

            const pin = pins[selectedPinIndex]
            if (pin) {
                const color = (pin as any).color || pinColor
                
                // Calculate the area to clear (old location flag + badge)
                const flagSize = 24
                ctx.font = '12px Arial, sans-serif'
                const textWidth = ctx.measureText(pin.location).width
                const clearWidth = flagSize * 0.6 + textWidth + 50
                const clearHeight = flagSize + 30

                // Clear the old location (erase old flag + badge)
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(
                    pin.x - 10,
                    pin.y - flagSize - 15,
                    clearWidth,
                    clearHeight
                )

                // Draw the location at new position
                drawLocation(ctx, x, y, color, pin.location)
            }
        } else if (isSelectMode) {
            // Check if hovering over a location flag (for cursor change)
            const pinIndex = findPinAtPosition(x, y)
            setHoverPinIndex(pinIndex)
        }
    }

    const onMouseUp = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isDragging && selectedPinIndex !== null) {
            const { x, y } = getCoordinates(canvasRef, e)

            // Only update position if the pin was actually dragged
            if (hasMoved.current) {
                // Update pin position permanently
                setPins(prev => {
                    const newPins = [...prev]
                    if (selectedPinIndex < newPins.length) {
                        newPins[selectedPinIndex] = {
                            ...newPins[selectedPinIndex],
                            x,
                            y
                        }
                    }
                    return newPins
                })

                // Save to history after dragging
                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
            } else {
                // It was just a click (selection), restore canvas to original state
                const canvas = canvasRef.current
                if (canvas && canvasStateBeforeDrag.current) {
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.putImageData(canvasStateBeforeDrag.current, 0, 0)
                    }
                }
            }

            setIsDragging(false)
            // Keep the pin selected for editing
            // setSelectedPinIndex(null) - don't clear selection
            canvasStateBeforeDrag.current = null
            mouseDownPosition.current = null
            hasMoved.current = false
        }
    }

    const onMouseLeave = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isDragging && selectedPinIndex !== null) {
            const { x, y } = getCoordinates(canvasRef, e)

            // Only update position if the pin was actually dragged
            if (hasMoved.current) {
                // Update pin position permanently
                setPins(prev => {
                    const newPins = [...prev]
                    if (selectedPinIndex < newPins.length) {
                        newPins[selectedPinIndex] = {
                            ...newPins[selectedPinIndex],
                            x,
                            y
                        }
                    }
                    return newPins
                })

                // Save to history after dragging
                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
            }

            setIsDragging(false)
            canvasStateBeforeDrag.current = null
            mouseDownPosition.current = null
            hasMoved.current = false
        }
    }

    const toolbar = (deps: Record<string, any>) => (
        <LocationToolbar
            deps={{
                undo: deps.undo || (() => {}),
                redo: deps.redo || (() => {}),
                saveToHistory: deps.saveToHistory || (() => {}),
                canUndo: deps.historyStep > 0,
                canRedo: deps.historyStep < (deps.history?.length || 0) - 1,
                canvasRef: deps.canvasRef,
            }}
            pinLocation={pinLocation}
            filteredDestinations={filteredDestinations}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            onLocationSelect={handleLocationSelect}
            onLocationChange={handleLocationChange}
            onAddLocation={handleAddLocation}
            inputRef={inputRef}
            isSelectMode={isSelectMode}
            onSelectModeToggle={handleSelectModeToggle}
        />
    )

    return {
        toolbar,
        cursor: isSelectMode ? (hoverPinIndex !== null ? 'move' : 'default') : 'default',
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
