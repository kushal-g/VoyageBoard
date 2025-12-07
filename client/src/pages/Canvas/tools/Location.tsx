import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'
import LocationToolbar from '@/components/LocationToolbar/LocationToolbar'
import './Location.css'

interface Point {
    x: number
    y: number
}

// Location Pin Component - renders as HTML overlay
const LocationPinElement = ({
    pin,
    isSelected,
    isHovered,
    isDeleteMode,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
    style
}: {
    pin: LocationPin
    isSelected: boolean
    isHovered: boolean
    isDeleteMode: boolean
    onMouseDown: (e: React.MouseEvent) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
    style: React.CSSProperties
}) => {
    return (
        <div
            className={`location-pin ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isDeleteMode ? 'delete-mode' : ''}`}
            style={style}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <svg
                className="location-pin-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 22s-5-5.2-5-10.5a5 5 0 0 1 10 0C17 16.8 12 22 12 22z"/>
                <circle cx="12" cy="11.5" r="2.4"/>
            </svg>
            <div 
                className="location-pin-label"
                style={{
                    borderColor: (pin as any).color || '#000000',
                    borderWidth: (pin as any).color ? '2px' : '1px',
                    backgroundColor: (pin as any).color ? `${(pin as any).color}15` : '#ffffff'
                }}
            >
                {pin.location}
            </div>
        </div>
    )
}

export const useLocationTool = (
    pins: LocationPin[],
    setPins: React.Dispatch<React.SetStateAction<LocationPin[]>>,
    _transitLines: any[] = [],
    currentTool?: string
): CanvasTool => {
    const [pinColor] = useState('#808080') // Default gray color for all locations
    const [pinLocation, setPinLocation] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [filteredDestinations, setFilteredDestinations] = useState<string[]>([])
    const [destinationPredictions, setDestinationPredictions] = useState<any[]>([]) // Store full prediction data
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hoverPinIndex, setHoverPinIndex] = useState<number | null>(null)
    const [isEditingLocation, setIsEditingLocation] = useState(false)
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const canvasRefForRedraw = useRef<HTMLCanvasElement | null>(null)
    const mouseDownPosition = useRef<Point | null>(null)
    const dragOffset = useRef<Point | null>(null)
    const hasMoved = useRef(false)
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Fetch autocomplete suggestions from backend API
    useEffect(() => {
        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }

        if (pinLocation.trim() === '') {
            setFilteredDestinations([])
            setShowSuggestions(false)
            setIsLoadingSuggestions(false)
            return
        }

        // Debounce API calls (wait 300ms after user stops typing)
        debounceTimer.current = setTimeout(async () => {
            setIsLoadingSuggestions(true)
            
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
                const response = await fetch(
                    `${apiUrl}/api/places/autocomplete?input=${encodeURIComponent(pinLocation.trim())}`
                )

                if (response.ok) {
                    const data = await response.json()
                    // Store full predictions for placeId access
                    const predictions = data.predictions?.slice(0, 5) || []
                    setDestinationPredictions(predictions)
                    // Extract descriptions from predictions
                    const suggestions = predictions.map((pred: any) => pred.description) || []
                    setFilteredDestinations(suggestions)
                    setShowSuggestions(suggestions.length > 0)
                } else {
                    // API request failed - log error and show empty results
                    const errorText = await response.text().catch(() => 'Unknown error')
                    console.error('API request failed:', response.status, errorText)
                    setDestinationPredictions([])
                    setFilteredDestinations([])
                    setShowSuggestions(false)
                }
            } catch (error) {
                // API is unavailable - log error and show empty results
                console.error('API request error:', error)
                setDestinationPredictions([])
                setFilteredDestinations([])
                setShowSuggestions(false)
            } finally {
                setIsLoadingSuggestions(false)
            }
        }, 300) // 300ms debounce

        // Cleanup function
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current)
            }
        }
    }, [pinLocation])

    const handleLocationSelect = (location: string) => {
        setPinLocation(location)
        setShowSuggestions(false)

        // Find the prediction for this location to get placeId
        const prediction = destinationPredictions.find((pred: any) => pred.description === location)

        // If editing a selected pin, update its location and placeId
        if (selectedPinIndex !== null && isEditingLocation) {
            updatePinLocation(selectedPinIndex, location, prediction?.placeId)
        }
    }

    const updatePinLocation = (pinIndex: number, newLocation: string, placeId?: string) => {
        setPins(prev => {
            const newPins = [...prev]
            if (pinIndex < newPins.length) {
                newPins[pinIndex] = {
                    ...newPins[pinIndex],
                    location: newLocation,
                    ...(placeId && { placeId })
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

    // Check if a point is near a location pin (within clickable radius)
    const findPinAtPosition = (x: number, y: number): number | null => {
        const clickRadius = 30 // Radius to detect clicks on location pins

        for (let i = pins.length - 1; i >= 0; i--) {
            const pin = pins[i]
            // Check distance from location pin position
            const dx = x - pin.x
            const dy = y - pin.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance <= clickRadius) {
                return i
            }
        }

        return null
    }

    const handleDeleteModeToggle = () => {
        setIsDeleteMode(prev => !prev)
        setIsEditingLocation(false)
        setSelectedPinIndex(null)
    }

    const handleDeletePin = (pinIndex: number, deps: Record<string, any>) => {
        if (pinIndex === null || pinIndex < 0 || pinIndex >= pins.length) return

        const pinToDelete = pins[pinIndex]

        // Remove the pin from the array
        setPins(prev => {
            const newPins = prev.filter((_, index) => index !== pinIndex)
            return newPins
        })

        // Save to history after a small delay to ensure state update is complete
        if (deps.saveToHistory) {
            setTimeout(() => {
                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
            }, 100)
        }
    }

    // Handle adding location via button click - add immediately to center of canvas
    const handleAddLocation = (canvasRef: React.RefObject<HTMLCanvasElement | null> | undefined) => {
        if (!pinLocation.trim() || filteredDestinations.length === 0) return
        
        const canvas = canvasRef?.current
        if (!canvas) {
            console.warn('Canvas ref not available')
            return
        }

        // Get canvas dimensions in CSS pixels
        const rect = canvas.getBoundingClientRect()
        const x = rect.width / 2
        const y = rect.height / 2

        // Find the prediction for this location to get placeId
        const prediction = destinationPredictions.find((pred: any) => pred.description === pinLocation)

        // Create new pin
        const newPin: LocationPin & { color?: string } = {
            x,
            y,
            id: Date.now(),
            location: pinLocation,
            color: pinColor,
            ...(prediction?.placeId && { placeId: prediction.placeId })
        }

        // Add pin to state
        setPins(prev => [...prev, newPin])

        // Save canvas ref for future use
        canvasRefForRedraw.current = canvas

        // Clear location input
        setPinLocation('')
        setFilteredDestinations([])
        setDestinationPredictions([])
        setShowSuggestions(false)
    }

    const onMouseDown = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const { x, y } = getCoordinates(canvasRef, e)
        canvasRefForRedraw.current = canvas

        // Check if clicking on an existing location pin
        const pinIndex = findPinAtPosition(x, y)

        // Handle delete mode - delete the pin if clicked
        if (isDeleteMode && pinIndex !== null) {
            handleDeletePin(pinIndex, _deps)
            return
        }

        // Always allow dragging when clicking on a pin (unless in delete mode)
        if (pinIndex !== null) {
            // Select this location and prepare for dragging
            setSelectedPinIndex(pinIndex)

            const pin = pins[pinIndex]
            // Calculate offset from pin center
            dragOffset.current = {
                x: x - pin.x,
                y: y - pin.y
            }

            // Track mouse down position to detect if it's a click or drag
            mouseDownPosition.current = { x, y }
            hasMoved.current = false

            // Start dragging existing location
            setIsDragging(true)
        } else if (!isDeleteMode) {
            // When not clicking on a location and not in delete mode, deselect
            setSelectedPinIndex(null)
            setIsEditingLocation(false)
        } else {
            // In Delete mode but not clicking on a location - deselect
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

        if (isDragging && selectedPinIndex !== null && dragOffset.current) {
            // Mark that we've moved (not just a click)
            if (mouseDownPosition.current) {
                const dx = x - mouseDownPosition.current.x
                const dy = y - mouseDownPosition.current.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance > 3) { // Threshold to detect drag vs click
                    hasMoved.current = true
                }
            }

                // Update pin position in real-time during drag
                const newX = x - dragOffset.current.x
                const newY = y - dragOffset.current.y

                setPins(prev => {
                    const newPins = [...prev]
                    if (selectedPinIndex < newPins.length) {
                        newPins[selectedPinIndex] = {
                            ...newPins[selectedPinIndex],
                            x: newX,
                            y: newY
                        }
                    }
                    return newPins
                })
        } else {
            // Always check if hovering over a location pin (for cursor change)
            const pinIndex = findPinAtPosition(x, y)
            setHoverPinIndex(pinIndex)
        }
    }

    const onMouseUp = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        // Handled by global mouse up handler
    }

    const onMouseLeave = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        // Handled by global mouse up handler
    }

    // Global mouse event handlers for dragging (attached to document)
    useEffect(() => {
        if (!isDragging) return

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging || selectedPinIndex === null || !dragOffset.current) return

            const canvas = canvasRefForRedraw.current
            if (!canvas) return

            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            // Mark that we've moved (not just a click)
            if (mouseDownPosition.current) {
                const dx = x - mouseDownPosition.current.x
                const dy = y - mouseDownPosition.current.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance > 3) { // Threshold to detect drag vs click
                    hasMoved.current = true
                }
            }

            // Update pin position in real-time during drag
            const newX = x - dragOffset.current.x
            const newY = y - dragOffset.current.y

            setPins(prev => {
                const newPins = [...prev]
                if (selectedPinIndex < newPins.length) {
                    newPins[selectedPinIndex] = {
                        ...newPins[selectedPinIndex],
                        x: newX,
                        y: newY
                    }
                }
                return newPins
            })
        }

        const handleGlobalMouseUp = () => {
            if (isDragging && selectedPinIndex !== null) {
                // Save to history if pin was actually moved
                if (hasMoved.current && depsRef.current?.saveToHistory) {
                    depsRef.current.saveToHistory()
                }
                
                setIsDragging(false)
                dragOffset.current = null
                mouseDownPosition.current = null
                hasMoved.current = false
            }
        }

        document.addEventListener('mousemove', handleGlobalMouseMove)
        document.addEventListener('mouseup', handleGlobalMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove)
            document.removeEventListener('mouseup', handleGlobalMouseUp)
        }
    }, [isDragging, selectedPinIndex, pins])

    // Handle pin element mouse down
    const handlePinMouseDown = (e: React.MouseEvent, pinIndex: number, pin: LocationPin) => {
        e.stopPropagation()
        
        const canvas = canvasRefForRedraw.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Handle delete mode - delete the pin if clicked
        if (isDeleteMode) {
            handleDeletePin(pinIndex, { saveToHistory: () => {} })
            return
        }

        // Select this location and prepare for dragging
        setSelectedPinIndex(pinIndex)

        // Calculate offset from pin center
        dragOffset.current = {
            x: x - pin.x,
            y: y - pin.y
        }

        // Track mouse down position to detect if it's a click or drag
        mouseDownPosition.current = { x, y }
        hasMoved.current = false

        // Start dragging existing location
        setIsDragging(true)
    }

    // Store deps ref for saving history after drag
    const depsRef = useRef<Record<string, any> | null>(null)

    // Render location pins as HTML elements
    const renderLocationPins = (deps: Record<string, any>): ReactNode => {
        // Store deps in ref for use in global mouse handlers
        depsRef.current = deps

        return (
            <div className="location-pins-overlay">
                {pins.map((pin, index) => (
                    <LocationPinElement
                        key={pin.id}
                        pin={pin}
                        isSelected={selectedPinIndex === index}
                        isHovered={hoverPinIndex === index}
                        isDeleteMode={isDeleteMode}
                        onMouseDown={(e) => handlePinMouseDown(e, index, pin)}
                        onMouseEnter={() => setHoverPinIndex(index)}
                        onMouseLeave={() => {
                            if (hoverPinIndex === index) {
                                setHoverPinIndex(null)
                            }
                        }}
                        style={{
                            position: 'absolute',
                            left: `${pin.x}px`,
                            top: `${pin.y}px`,
                            transform: 'translate(-50%, -100%)',
                            // Only handle events when Location tool is active, otherwise let canvas handle them
                            pointerEvents: currentTool === 'LOCATION_PIN' ? 'auto' : 'none',
                            zIndex: selectedPinIndex === index ? 1000 : 100
                        }}
                    />
                ))}
            </div>
        )
    }

    const toolbar = (deps: Record<string, any>) => (
        <>
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
                isDeleteMode={isDeleteMode}
                onDeleteModeToggle={handleDeleteModeToggle}
                isLoadingSuggestions={isLoadingSuggestions}
            />
            {isDeleteMode && (
                <div className="delete-mode-message">
                    <div className="delete-mode-message-content">
                        <span className="delete-mode-icon">🗑️</span>
                        <span>Delete mode enabled. Click on a location to remove it.</span>
                    </div>
                </div>
            )}
        </>
    )

    return {
        toolbar,
        locationPins: (deps: Record<string, any>) => renderLocationPins(deps),
        cursor: isDeleteMode 
            ? (hoverPinIndex !== null ? 'pointer' : 'default')
            : (hoverPinIndex !== null ? 'move' : 'default'),
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
