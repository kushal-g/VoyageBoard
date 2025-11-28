import { useState, useRef } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin, LocationGroup } from '../Canvas'
import GroupToolbar from '@/components/GroupToolbar/GroupToolbar'

interface Point {
    x: number
    y: number
}

interface SelectionBox {
    startX: number
    startY: number
    endX: number
    endY: number
}

export const useGroupLocationTool = (
    pins: LocationPin[],
    setPins: React.Dispatch<React.SetStateAction<LocationPin[]>>,
    groups: LocationGroup[],
    setGroups: React.Dispatch<React.SetStateAction<LocationGroup[]>>
): CanvasTool => {
    const [currentGroupColor, setCurrentGroupColor] = useState('#007AFF') // Default blue color
    const [currentGroupLabel, setCurrentGroupLabel] = useState('')
    const [selectedPinIds, setSelectedPinIds] = useState<Set<number>>(new Set())
    const [hoverPinIndex, setHoverPinIndex] = useState<number | null>(null)
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
    const [isSelecting, setIsSelecting] = useState(false)
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
    const baseCanvasState = useRef<ImageData | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const selectionStartPoint = useRef<Point | null>(null)
    const hasDragged = useRef(false)

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

    // Check if a point is near a location flag (within clickable radius)
    const findPinAtPosition = (x: number, y: number): number | null => {
        const clickRadius = 30 // Match flag icon size

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

    // Draw selection indicator (checkmark circle) for selected pins
    const drawSelectionIndicator = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string
    ) => {
        ctx.save()
        
        // Position checkmark at top-right of flag icon
        // Flag icon is at (x, y) with flag extending to the right
        const checkX = x + 10
        const checkY = y - 18
        const radius = 14
        
        // Draw circle background with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(checkX, checkY, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        // Draw white checkmark
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        // Checkmark path: bottom-left to center to top-right
        ctx.moveTo(checkX - 5, checkY)
        ctx.lineTo(checkX - 1, checkY + 4)
        ctx.lineTo(checkX + 5, checkY - 3)
        ctx.stroke()
        
        ctx.restore()
    }

    // Draw subtle border for grouped pins (only when hovering or active)
    const drawGroupBorder = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string
    ) => {
        ctx.save()
        
        const radius = 25
        
        // Draw subtle dashed border
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        
        ctx.restore()
    }

    // Draw selection box
    const drawSelectionBox = (
        ctx: CanvasRenderingContext2D,
        box: SelectionBox,
        color: string = '#007AFF'
    ) => {
        ctx.save()
        
        const x = Math.min(box.startX, box.endX)
        const y = Math.min(box.startY, box.endY)
        const width = Math.abs(box.endX - box.startX)
        const height = Math.abs(box.endY - box.startY)

        // Draw filled rectangle with transparency
        ctx.fillStyle = `${color}20` // 20 in hex = ~12.5% opacity
        ctx.fillRect(x, y, width, height)

        // Draw border
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(x, y, width, height)
        ctx.setLineDash([])

        ctx.restore()
    }

    // Check if a pin is inside the selection box
    const isPinInSelectionBox = (pin: LocationPin, box: SelectionBox): boolean => {
        const x = Math.min(box.startX, box.endX)
        const y = Math.min(box.startY, box.endY)
        const width = Math.abs(box.endX - box.startX)
        const height = Math.abs(box.endY - box.startY)

        return pin.x >= x && pin.x <= x + width && pin.y >= y && pin.y <= y + height
    }

    // Redraw selection indicators and selection box
    const redrawSelectionOverlay = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        saveBase: boolean = false
    ) => {
        // If we need to save the base state (without overlays), do it now
        if (saveBase || !baseCanvasState.current) {
            baseCanvasState.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
        }

        // Restore the base canvas state (without any overlays)
        if (baseCanvasState.current) {
            ctx.putImageData(baseCanvasState.current, 0, 0)
        }

        // Draw selection box if active
        if (selectionBox) {
            drawSelectionBox(ctx, selectionBox, currentGroupColor)
        }

        // Draw selection indicators (checkmarks) for actively selected pins only
        pins.forEach((pin) => {
            if (selectedPinIds.has(pin.id)) {
                drawSelectionIndicator(ctx, pin.x, pin.y, currentGroupColor)
            }
        })

        // Draw subtle border for grouped pins only when hovering
        if (hoverPinIndex !== null) {
            const hoveredPin = pins[hoverPinIndex]
            if (hoveredPin) {
                const group = groups.find(g => g.pinIds.includes(hoveredPin.id))
                if (group && !selectedPinIds.has(hoveredPin.id)) {
                    drawGroupBorder(ctx, hoveredPin.x, hoveredPin.y, group.color)
                }
            }
        }
    }

    // Get the next available day number
    const getNextDayNumber = (): number => {
        // Find the highest day number in existing groups
        let maxDay = 0
        groups.forEach(group => {
            const match = group.label.match(/^Day (\d+)/i)
            if (match) {
                const dayNum = parseInt(match[1], 10)
                if (dayNum > maxDay) {
                    maxDay = dayNum
                }
            }
        })
        return maxDay + 1
    }

    const createGroup = () => {
        if (selectedPinIds.size === 0) return

        // Auto-generate day label if not provided
        const dayLabel = currentGroupLabel.trim() || `Day ${getNextDayNumber()}`

        const newGroup: LocationGroup = {
            id: Date.now().toString(),
            color: currentGroupColor,
            label: dayLabel,
            pinIds: Array.from(selectedPinIds)
        }

        // Update pin colors to match group color
        setPins(prev => prev.map(pin => {
            if (selectedPinIds.has(pin.id)) {
                return { ...pin, color: currentGroupColor, groupId: newGroup.id }
            }
            return pin
        }))

        setGroups(prev => [...prev, newGroup])
        setActiveGroupId(newGroup.id)
        setSelectedPinIds(new Set())
        setCurrentGroupLabel('') // Clear label for next group
        setSelectionBox(null) // Clear selection box

        // Wait for Location tool to redraw pins with new colors, then update base state
        setTimeout(() => {
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) {
                    // Save the clean canvas state (without selection indicators)
                    baseCanvasState.current = ctx.getImageData(
                        0, 0,
                        canvasRef.current.width,
                        canvasRef.current.height
                    )
                    // Redraw to ensure clean state
                    if (baseCanvasState.current) {
                        ctx.putImageData(baseCanvasState.current, 0, 0)
                    }
                }
            }
        }, 100)
    }

    const deleteGroup = (groupId: string) => {
        const groupToDelete = groups.find(g => g.id === groupId)
        
        // Reset pin colors to default gray when group is deleted
        if (groupToDelete) {
            setPins(prev => prev.map(pin => {
                if (groupToDelete.pinIds.includes(pin.id)) {
                    return { 
                        ...pin, 
                        color: '#808080', // Reset to default gray
                        groupId: undefined
                    } as LocationPin & { color?: string; groupId?: string }
                }
                return pin
            }))
        }

        setGroups(prev => prev.filter(g => g.id !== groupId))
        if (activeGroupId === groupId) {
            setActiveGroupId(null)
        }

        // Wait for Location tool to redraw pins, then update base state
        setTimeout(() => {
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) {
                    // Save the clean canvas state (without selection indicators)
                    baseCanvasState.current = ctx.getImageData(
                        0, 0,
                        canvasRef.current.width,
                        canvasRef.current.height
                    )
                    // Redraw to ensure clean state
                    if (baseCanvasState.current) {
                        ctx.putImageData(baseCanvasState.current, 0, 0)
                    }
                }
            }
        }, 100)
    }

    const updateGroupLabel = (groupId: string, newLabel: string) => {
        setGroups(prev => prev.map(g =>
            g.id === groupId ? { ...g, label: newLabel } : g
        ))
    }

    const onMouseDown = (
        canvasRefParam: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const canvas = canvasRefParam.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Store canvas reference for later use
        canvasRef.current = canvas

        const { x, y } = getCoordinates(canvasRefParam, e)

        // Check if clicking on an existing pin
        const pinIndex = findPinAtPosition(x, y)

        if (pinIndex !== null) {
            const pin = pins[pinIndex]

            // Save base canvas state before any modifications (only on first interaction)
            const isFirstInteraction = selectedPinIds.size === 0 && groups.length === 0

            // Toggle selection
            setSelectedPinIds(prev => {
                const newSet = new Set(prev)
                if (newSet.has(pin.id)) {
                    newSet.delete(pin.id)
                } else {
                    newSet.add(pin.id)
                }
                return newSet
            })

            // Redraw with selection indicators
            setTimeout(() => {
                redrawSelectionOverlay(canvas, ctx, isFirstInteraction)
            }, 0)
        } else {
            // Prepare for potential selection box when clicking on empty space
            // Only start selection if user drags (not just clicks)
            selectionStartPoint.current = { x, y }
            hasDragged.current = false
            
            // If not holding Shift/Ctrl, clear previous selection on click
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                setSelectedPinIds(new Set())
                setSelectionBox(null)
                setTimeout(() => {
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d')
                        if (ctx) {
                            redrawSelectionOverlay(canvasRef.current, ctx, false)
                        }
                    }
                }, 0)
            }
        }
    }

    const onMouseMove = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        const { x, y } = getCoordinates(canvasRef, e)
        const pinIndex = findPinAtPosition(x, y)
        setHoverPinIndex(pinIndex)

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Update selection box if dragging
        if (selectionStartPoint.current) {
            const dx = x - selectionStartPoint.current.x
            const dy = y - selectionStartPoint.current.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Only start selection box if user has dragged more than 5 pixels
            if (distance > 5) {
                if (!isSelecting) {
                    setIsSelecting(true)
                }
                hasDragged.current = true
                
                setSelectionBox({
                    startX: selectionStartPoint.current.x,
                    startY: selectionStartPoint.current.y,
                    endX: x,
                    endY: y
                })

                // Update selected pins based on selection box
                const box: SelectionBox = {
                    startX: selectionStartPoint.current.x,
                    startY: selectionStartPoint.current.y,
                    endX: x,
                    endY: y
                }

                // If holding Shift/Ctrl, add to selection, otherwise replace
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    const pinsInBox = pins.filter(pin => isPinInSelectionBox(pin, box))
                    setSelectedPinIds(prev => {
                        const newSet = new Set(prev)
                        pinsInBox.forEach(pin => newSet.add(pin.id))
                        return newSet
                    })
                } else {
                    const pinsInBox = pins.filter(pin => isPinInSelectionBox(pin, box))
                    setSelectedPinIds(new Set(pinsInBox.map(pin => pin.id)))
                }
            }
        }

        // Redraw with selection indicators and selection box
        redrawSelectionOverlay(canvas, ctx)
    }

    const onMouseUp = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        // Finish selection box
        if (isSelecting || selectionStartPoint.current) {
            setIsSelecting(false)
            
            // If user didn't drag, it was just a click - clear selection box
            if (!hasDragged.current) {
                setSelectionBox(null)
            }
            
            selectionStartPoint.current = null
            hasDragged.current = false
        }
    }

    const onMouseLeave = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        setHoverPinIndex(null)
        
        // Finish selection box if active
        if (isSelecting) {
            setIsSelecting(false)
            selectionStartPoint.current = null
        }
        
        // Redraw without selection box
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
                redrawSelectionOverlay(canvasRef.current, ctx, false)
            }
        }
    }

    const toolbar = (deps: Record<string, any>) => {
        // Expose delete and update handlers that call both local and parent handlers
        const handleDeleteGroup = (groupId: string) => {
            deleteGroup(groupId)
            if (deps.onDeleteGroup) {
                deps.onDeleteGroup(groupId)
            }
        }

        const handleUpdateGroupLabel = (groupId: string, newLabel: string) => {
            updateGroupLabel(groupId, newLabel)
            if (deps.onUpdateGroupLabel) {
                deps.onUpdateGroupLabel(groupId, newLabel)
            }
        }

        return (
            <GroupToolbar
                deps={{
                    undo: deps.undo || (() => {}),
                    redo: deps.redo || (() => {}),
                    saveToHistory: deps.saveToHistory || (() => {}),
                    canUndo: deps.historyStep > 0,
                    canRedo: deps.historyStep < (deps.history?.length || 0) - 1,
                }}
                groupColor={currentGroupColor}
                setGroupColor={setCurrentGroupColor}
                groupLabel={currentGroupLabel}
                setGroupLabel={setCurrentGroupLabel}
                selectedPinCount={selectedPinIds.size}
                onCreateGroup={createGroup}
                groups={groups}
                activeGroupId={activeGroupId}
                onUpdateGroupLabel={handleUpdateGroupLabel}
                onDeleteGroup={handleDeleteGroup}
                onSetActiveGroup={setActiveGroupId}
            />
        )
    }

    return {
        toolbar,
        cursor: isSelecting ? 'crosshair' : (hoverPinIndex !== null ? 'pointer' : 'default'),
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
