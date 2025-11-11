import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'

interface Point {
    x: number
    y: number
}

interface LocationPin {
    x: number
    y: number
    id: number
    location: string
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

export const useLocationTool = (): CanvasTool => {
    const [pins, setPins] = useState<LocationPin[]>([])
    const [pinColor, setPinColor] = useState('#FF0000')
    const [pinLocation, setPinLocation] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [filteredDestinations, setFilteredDestinations] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)
    const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hoverPinIndex, setHoverPinIndex] = useState<number | null>(null)
    const canvasRefForRedraw = useRef<HTMLCanvasElement | null>(null)
    const canvasStateBeforeDrag = useRef<ImageData | null>(null)

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

    const handleLocationSelect = (location: string) => {
        setPinLocation(location)
        setShowSuggestions(false)
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
            ctx.fillStyle = '#000000'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'

            // Add a white background behind the text for readability
            const textMetrics = ctx.measureText(location)
            const textWidth = textMetrics.width
            const textHeight = 18
            const padding = 4
            const textX = x + size / 2 + 8
            const textY = y - size / 2

            // Draw white background with slight transparency
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
            ctx.fillRect(
                textX - padding,
                textY - textHeight / 2 - padding,
                textWidth + padding * 2,
                textHeight + padding * 2
            )

            // Draw border around text background
            ctx.strokeStyle = '#e0e0e0'
            ctx.lineWidth = 1
            ctx.strokeRect(
                textX - padding,
                textY - textHeight / 2 - padding,
                textWidth + padding * 2,
                textHeight + padding * 2
            )

            // Draw the text
            ctx.fillStyle = '#000000'
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
            // Save canvas state before starting drag (including all pins)
            canvasStateBeforeDrag.current = ctx.getImageData(0, 0, canvas.width, canvas.height)

            // Start dragging existing pin
            setSelectedPinIndex(pinIndex)
            setIsDragging(true)
        } else {
            // Create new pin
            drawPin(ctx, x, y, pinColor, pinLocation || 'Location')

            // Add pin to state
            const newPin: LocationPin = {
                x,
                y,
                id: Date.now(),
                location: pinLocation || 'Location'
            }
            setPins(prev => [...prev, newPin])

            // Save to history
            if (deps.saveToHistory) {
                deps.saveToHistory()
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
            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Restore canvas to state before drag started
            ctx.putImageData(canvasStateBeforeDrag.current, 0, 0)

            // Draw all pins with updated position for the selected pin
            pins.forEach((pin, index) => {
                if (index === selectedPinIndex) {
                    // Draw the dragged pin at new position
                    drawPin(ctx, x, y, pinColor, pin.location)
                } else {
                    // Draw other pins at their original positions
                    drawPin(ctx, pin.x, pin.y, pinColor, pin.location)
                }
            })
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

            setIsDragging(false)
            setSelectedPinIndex(null)
            canvasStateBeforeDrag.current = null
        }
    }

    const onMouseLeave = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isDragging && selectedPinIndex !== null) {
            const { x, y } = getCoordinates(canvasRef, e)

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

            setIsDragging(false)
            setSelectedPinIndex(null)
            canvasStateBeforeDrag.current = null
        }
    }

    const toolbar = (
        <>
            <div className="toolbar-group">
                <label>Pin Color:</label>
                <input
                    type="color"
                    value={pinColor}
                    onChange={(e) => setPinColor(e.target.value)}
                    className="color-picker"
                />
            </div>
            <div className="toolbar-group location-input-group">
                <label>Pin Location:</label>
                <div style={{ position: 'relative' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={pinLocation}
                        onChange={(e) => setPinLocation(e.target.value)}
                        onFocus={() => pinLocation && setShowSuggestions(filteredDestinations.length > 0)}
                        placeholder="Enter location..."
                        className="location-input"
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0',
                            fontSize: '14px',
                            minWidth: '200px',
                            outline: 'none'
                        }}
                    />
                    {showSuggestions && (
                        <div
                            className="location-suggestions"
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                background: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000
                            }}
                        >
                            {filteredDestinations.map((dest, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleLocationSelect(dest)}
                                    style={{
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        borderBottom: index < filteredDestinations.length - 1 ? '1px solid #f0f0f0' : 'none'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    {dest}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    )

    return {
        toolbar,
        cursor: hoverPinIndex !== null ? 'move' : 'crosshair',
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
