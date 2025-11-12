import { useState, useRef } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'

interface LocationGroup {
    id: string
    color: string
    label: string
    pinIds: number[]
}

interface Point {
    x: number
    y: number
}

export const useGroupLocationTool = (
    pins: LocationPin[],
    _setPins: React.Dispatch<React.SetStateAction<LocationPin[]>>
): CanvasTool => {
    const [groups, setGroups] = useState<LocationGroup[]>([])
    const [currentGroupColor, setCurrentGroupColor] = useState('#FFD700') // Gold default
    const [currentGroupLabel, setCurrentGroupLabel] = useState('')
    const [selectedPinIds, setSelectedPinIds] = useState<Set<number>>(new Set())
    const [hoverPinIndex, setHoverPinIndex] = useState<number | null>(null)
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
    const baseCanvasState = useRef<ImageData | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

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
        const clickRadius = 20

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

    // Draw glow effect around selected pins
    const drawGlowEffect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        size: number = 40
    ) => {
        ctx.save()

        // Create multiple layers for the glow effect
        for (let i = 3; i >= 0; i--) {
            const radius = size + (i * 5)
            const alpha = 0.15 - (i * 0.03)

            ctx.beginPath()
            ctx.arc(x, y - 15, radius, 0, Math.PI * 2)
            ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
            ctx.fill()
        }

        ctx.restore()
    }

    // Redraw all pins with glow effects
    const redrawPinsWithGlow = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        saveBase: boolean = false
    ) => {
        // If we need to save the base state (without glows), do it now
        if (saveBase || !baseCanvasState.current) {
            baseCanvasState.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
        }

        // Restore the base canvas state (without any glows)
        if (baseCanvasState.current) {
            ctx.putImageData(baseCanvasState.current, 0, 0)
        }

        // Draw glow for selected pins
        pins.forEach((pin) => {
            if (selectedPinIds.has(pin.id)) {
                drawGlowEffect(ctx, pin.x, pin.y, currentGroupColor)
            }
        })

        // Draw glow for grouped pins
        groups.forEach(group => {
            pins.forEach(pin => {
                if (group.pinIds.includes(pin.id)) {
                    drawGlowEffect(ctx, pin.x, pin.y, group.color)
                }
            })
        })
    }

    const createGroup = () => {
        if (selectedPinIds.size === 0) return

        const newGroup: LocationGroup = {
            id: Date.now().toString(),
            color: currentGroupColor,
            label: currentGroupLabel || `Group ${groups.length + 1}`,
            pinIds: Array.from(selectedPinIds)
        }

        setGroups(prev => [...prev, newGroup])
        setActiveGroupId(newGroup.id)
        setSelectedPinIds(new Set())
        setCurrentGroupLabel('')

        // Update base canvas state to include the newly created group's glow
        setTimeout(() => {
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) {
                    baseCanvasState.current = ctx.getImageData(
                        0, 0,
                        canvasRef.current.width,
                        canvasRef.current.height
                    )
                }
            }
        }, 50)
    }

    const deleteGroup = (groupId: string) => {
        setGroups(prev => prev.filter(g => g.id !== groupId))
        if (activeGroupId === groupId) {
            setActiveGroupId(null)
        }

        // Redraw without the deleted group and update base state
        setTimeout(() => {
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) {
                    redrawPinsWithGlow(canvasRef.current, ctx, false)
                    // Update base state after redraw
                    setTimeout(() => {
                        if (canvasRef.current && ctx) {
                            baseCanvasState.current = ctx.getImageData(
                                0, 0,
                                canvasRef.current.width,
                                canvasRef.current.height
                            )
                        }
                    }, 10)
                }
            }
        }, 0)
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

            // Redraw with glow
            setTimeout(() => {
                redrawPinsWithGlow(canvas, ctx, isFirstInteraction)
            }, 0)
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

        // Redraw with glow effects
        redrawPinsWithGlow(canvas, ctx)
    }

    const onMouseUp = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        // Nothing to do on mouse up for this tool
    }

    const onMouseLeave = (
        _canvasRef: React.RefObject<HTMLCanvasElement | null>,
        _e: React.MouseEvent<HTMLCanvasElement>,
        _deps: Record<string, any>
    ) => {
        setHoverPinIndex(null)
    }

    const toolbar = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className="toolbar-group">
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                    Create Group
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ minWidth: '80px' }}>Group Color:</label>
                        <input
                            type="color"
                            value={currentGroupColor}
                            onChange={(e) => setCurrentGroupColor(e.target.value)}
                            className="color-picker"
                            style={{ width: '50px', height: '32px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ minWidth: '80px' }}>Group Label:</label>
                        <input
                            type="text"
                            value={currentGroupLabel}
                            onChange={(e) => setCurrentGroupLabel(e.target.value)}
                            placeholder="e.g., Europe Trip"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #e0e0e0',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={createGroup}
                            disabled={selectedPinIds.size === 0}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: selectedPinIds.size === 0 ? '#cccccc' : '#4CAF50',
                                color: 'white',
                                cursor: selectedPinIds.size === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            Create Group ({selectedPinIds.size} pins selected)
                        </button>
                    </div>
                </div>
            </div>

            {groups.length > 0 && (
                <div className="toolbar-group">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                        Existing Groups
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {groups.map(group => (
                            <div
                                key={group.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: `2px solid ${activeGroupId === group.id ? group.color : '#e0e0e0'}`,
                                    backgroundColor: activeGroupId === group.id ? `${group.color}15` : 'white'
                                }}
                            >
                                <div
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '4px',
                                        backgroundColor: group.color,
                                        border: '2px solid #000',
                                        flexShrink: 0
                                    }}
                                />
                                <input
                                    type="text"
                                    value={group.label}
                                    onChange={(e) => updateGroupLabel(group.id, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '4px 8px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                    ({group.pinIds.length})
                                </span>
                                <button
                                    onClick={() => deleteGroup(group.id)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ff4444',
                                        backgroundColor: 'white',
                                        color: '#ff4444',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    )

    return {
        toolbar,
        cursor: hoverPinIndex !== null ? 'pointer' : 'default',
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}
