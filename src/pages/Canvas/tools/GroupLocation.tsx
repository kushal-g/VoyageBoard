import { useState, useRef } from 'react'
import type { CanvasTool } from '../types'
import type { LocationPin } from '../Canvas'
import GroupToolbar from '@/components/GroupToolbar/GroupToolbar'

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

    const toolbar = (deps: Record<string, any>) => (
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
            onUpdateGroupLabel={updateGroupLabel}
            onDeleteGroup={deleteGroup}
            onSetActiveGroup={setActiveGroupId}
        />
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
