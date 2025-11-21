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
    const [pinColor, setPinColor] = useState('#FF0000')
    const [pinLocation, setPinLocation] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [filteredDestinations, setFilteredDestinations] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)
    const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hoverPinIndex, setHoverPinIndex] = useState<number | null>(null)
    const [isEditingLocation, setIsEditingLocation] = useState(false)
    const [isAddMode, setIsAddMode] = useState(false)
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
        if (canvasRefForRedraw.current && selectedPinIndex !== null) {
            const canvas = canvasRefForRedraw.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Save current state, clear, and redraw all pins
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
            ctx.putImageData(currentState, 0, 0)

            // Redraw all pins with updated locations
            pins.forEach(pin => {
                // Clear old pin area first
                const size = 30
                ctx.font = '14px Arial, sans-serif'
                const textWidth = ctx.measureText(pin.location).width
                const clearWidth = size + textWidth + 30
                const clearHeight = size + 25

                ctx.fillStyle = '#ffffff'
                ctx.fillRect(
                    pin.x - size,
                    pin.y - size - 5,
                    clearWidth,
                    clearHeight
                )

                // Draw pin with updated location
                drawPin(ctx, pin.x, pin.y, pinColor, pin.location)
            })
        }
    }, [pins, selectedPinIndex, pinColor])

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

    // Check if a point is near a pin (within clickable radius)
    const findPinAtPosition = (x: number, y: number): number | null => {
        const clickRadius = 20 // Radius to detect clicks on pins

        for (let i = pins.length - 1; i >= 0; i--) {
            const pin = pins[i]
            const dx = x - pin.x
            const dy = y - pin.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance <= clickRadius) {
                return i
            }
        }

        return null
    }

    // Handle adding location via button click
    const handleAddLocation = () => {
        if (!pinLocation.trim() || filteredDestinations.length === 0) return
        
        // Enable add mode - next canvas click will add the pin
        setIsAddMode(true)
        setIsEditingLocation(false)
        setSelectedPinIndex(null)
    }

    const drawPin = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        location: string
    ) => {
        const size = 30 // Fixed size
        // Draw location pin shape
        ctx.save()

        // Pin body (teardrop shape)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y - size / 2, size / 3, 0, Math.PI * 2)
        ctx.fill()

        // Pin point
        ctx.beginPath()
        ctx.moveTo(x - size / 4, y - size / 4)
        ctx.lineTo(x, y + size / 4)
        ctx.lineTo(x + size / 4, y - size / 4)
        ctx.closePath()
        ctx.fill()

        // Inner circle (white)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y - size / 2, size / 6, 0, Math.PI * 2)
        ctx.fill()

        // Pin outline
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1.5

        // Outline the main circle
        ctx.beginPath()
        ctx.arc(x, y - size / 2, size / 3, 0, Math.PI * 2)
        ctx.stroke()

        // Outline the point
        ctx.beginPath()
        ctx.moveTo(x - size / 4, y - size / 4)
        ctx.lineTo(x, y + size / 4)
        ctx.lineTo(x + size / 4, y - size / 4)
        ctx.closePath()
        ctx.stroke()

        // Draw location text next to the pin
        if (location) {
            ctx.font = '14px Arial, sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'

            // Add a white background behind the text for readability
            const textMetrics = ctx.measureText(location)
            const textWidth = textMetrics.width
            const textHeight = 18
            const padding = 4
            const textX = x + size / 2 + 8
            const textY = y - size / 2

            // Convert color to muted version (lighter, less saturated)
            const mutedColor = getMutedColor(color)

            // Draw background with muted color
            ctx.fillStyle = `rgba(${mutedColor.r}, ${mutedColor.g}, ${mutedColor.b}, 0.9)`
            ctx.fillRect(
                textX - padding,
                textY - textHeight / 2 - padding,
                textWidth + padding * 2,
                textHeight + padding * 2
            )

            // Draw border around text background in muted color
            ctx.strokeStyle = `rgba(${mutedColor.r}, ${mutedColor.g}, ${mutedColor.b}, 0.6)`
            ctx.lineWidth = 1
            ctx.strokeRect(
                textX - padding,
                textY - textHeight / 2 - padding,
                textWidth + padding * 2,
                textHeight + padding * 2
            )

            // Draw the text in muted color
            ctx.fillStyle = `rgba(${mutedColor.r}, ${mutedColor.g}, ${mutedColor.b}, 0.9)`
            ctx.fillText(location, textX, textY)
        }

        ctx.restore()
    }

    const onMouseDown = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(canvasRef, e)
        canvasRefForRedraw.current = canvas

        // Check if clicking on an existing pin
        const pinIndex = findPinAtPosition(x, y)

        if (pinIndex !== null) {
            // If in add mode, don't select - just add at clicked position
            if (isAddMode && pinLocation.trim() && filteredDestinations.length > 0) {
                // Add pin at clicked position even if it's on an existing pin
                drawPin(ctx, x, y, pinColor, pinLocation)

                const newPin: LocationPin = {
                    x,
                    y,
                    id: Date.now(),
                    location: pinLocation
                }
                setPins(prev => [...prev, newPin])

                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
                
                setIsAddMode(false)
                setPinLocation('')
                return
            }

            // Select this pin and load its location into the text field
            setSelectedPinIndex(pinIndex)
            setPinLocation(pins[pinIndex].location)
            setIsEditingLocation(true)

            // Save the current canvas state (with all pins) for potential dragging
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvasStateBeforeDrag.current = currentState

            // Track mouse down position to detect if it's a click or drag
            mouseDownPosition.current = { x, y }
            hasMoved.current = false

            // Start dragging existing pin
            setIsDragging(true)
            setIsAddMode(false)
        } else {
            // If in add mode, add pin at clicked position
            if (isAddMode && pinLocation.trim() && filteredDestinations.length > 0) {
                drawPin(ctx, x, y, pinColor, pinLocation)

                const newPin: LocationPin = {
                    x,
                    y,
                    id: Date.now(),
                    location: pinLocation
                }
                setPins(prev => [...prev, newPin])

                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
                
                setIsAddMode(false)
                setPinLocation('')
                return
            }

            // Deselect any selected pin
            setSelectedPinIndex(null)
            setIsEditingLocation(false)
            setIsAddMode(false)

            // Create new pin (with empty location if not specified)
            if (pinLocation.trim()) {
                drawPin(ctx, x, y, pinColor, pinLocation)

                // Add pin to state
                const newPin: LocationPin = {
                    x,
                    y,
                    id: Date.now(),
                    location: pinLocation
                }
                setPins(prev => [...prev, newPin])

                // Save to history
                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
            }
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
                // Calculate the area to clear (old pin location)
                const size = 30
                // Set font to match what we use in drawPin
                ctx.font = '14px Arial, sans-serif'
                const textWidth = ctx.measureText(pin.location).width
                const clearWidth = size + textWidth + 30 // Extra space for padding and borders
                const clearHeight = size + 25

                // Clear the old pin location (erase old pin)
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(
                    pin.x - size,
                    pin.y - size - 5,
                    clearWidth,
                    clearHeight
                )

                // Draw the pin at new position
                drawPin(ctx, x, y, pinColor, pin.location)
            }
        } else {
            // Check if hovering over a pin (for cursor change)
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
            }}
            pinColor={pinColor}
            setPinColor={setPinColor}
            pinLocation={pinLocation}
            filteredDestinations={filteredDestinations}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            onLocationSelect={handleLocationSelect}
            onLocationChange={handleLocationChange}
            onAddLocation={handleAddLocation}
            inputRef={inputRef}
        />
    )

    return {
        toolbar,
        cursor: isAddMode ? 'crosshair' : hoverPinIndex !== null ? 'move' : 'crosshair',
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
