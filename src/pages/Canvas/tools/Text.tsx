import { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from '../types'

export interface TextElement {
    x: number
    y: number
    id: number
    text: string
    fontSize: number
    fontFamily: string
    fontWeight: string
    color: string
    width: number
    height: number
}

interface Point {
    x: number
    y: number
}

export const useTextTool = (
    texts: TextElement[],
    setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>
): CanvasTool => {
    const [textContent, setTextContent] = useState('Text')
    const [fontSize, setFontSize] = useState(24)
    const [fontFamily, setFontFamily] = useState('Arial')
    const [fontWeight, setFontWeight] = useState('400')
    const [color, setColor] = useState('#000000')
    const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const canvasRefForRedraw = useRef<HTMLCanvasElement | null>(null)
    const canvasStateBeforeDrag = useRef<ImageData | null>(null)
    const mouseDownPosition = useRef<Point | null>(null)
    const hasMoved = useRef(false)
    const resizeHandleSize = 8

    // Redraw canvas when texts change
    useEffect(() => {
        if (canvasRefForRedraw.current) {
            const canvas = canvasRefForRedraw.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Redraw all texts
            texts.forEach(text => {
                drawText(ctx, text)
            })
        }
    }, [texts])

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

    const measureText = (
        ctx: CanvasRenderingContext2D,
        text: string,
        fontSize: number,
        fontFamily: string,
        fontWeight: string
    ): { width: number; height: number } => {
        ctx.save()
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
        const metrics = ctx.measureText(text)
        ctx.restore()
        return {
            width: metrics.width,
            height: fontSize * 1.2 // Approximate height based on fontSize
        }
    }

    const drawText = (
        ctx: CanvasRenderingContext2D,
        textElement: TextElement,
        showSelection = false
    ) => {
        ctx.save()

        // Set font properties
        ctx.font = `${textElement.fontWeight} ${textElement.fontSize}px ${textElement.fontFamily}`
        ctx.fillStyle = textElement.color
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'

        // Draw text
        ctx.fillText(textElement.text, textElement.x, textElement.y)

        // Draw selection box and resize handles if selected
        if (showSelection && selectedTextIndex !== null) {
            const bounds = {
                x: textElement.x - 5,
                y: textElement.y - 5,
                width: textElement.width + 10,
                height: textElement.height + 10
            }

            // Draw selection border
            ctx.strokeStyle = '#007aff'
            ctx.lineWidth = 2
            ctx.setLineDash([5, 5])
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
            ctx.setLineDash([])

            // Draw resize handles (corners)
            ctx.fillStyle = '#007aff'
            const handles = [
                { x: bounds.x, y: bounds.y }, // top-left
                { x: bounds.x + bounds.width, y: bounds.y }, // top-right
                { x: bounds.x, y: bounds.y + bounds.height }, // bottom-left
                { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // bottom-right
            ]

            handles.forEach(handle => {
                ctx.fillRect(
                    handle.x - resizeHandleSize / 2,
                    handle.y - resizeHandleSize / 2,
                    resizeHandleSize,
                    resizeHandleSize
                )
            })
        }

        ctx.restore()
    }

    const findTextAtPosition = (x: number, y: number): number | null => {
        // Check from top to bottom (most recent first)
        for (let i = texts.length - 1; i >= 0; i--) {
            const text = texts[i]
            const bounds = {
                x: text.x - 5,
                y: text.y - 5,
                width: text.width + 10,
                height: text.height + 10
            }

            if (
                x >= bounds.x &&
                x <= bounds.x + bounds.width &&
                y >= bounds.y &&
                y <= bounds.y + bounds.height
            ) {
                return i
            }
        }
        return null
    }

    const findResizeHandle = (
        x: number,
        y: number,
        textElement: TextElement
    ): { corner: string } | null => {
        if (selectedTextIndex === null) return null

        const bounds = {
            x: textElement.x - 5,
            y: textElement.y - 5,
            width: textElement.width + 10,
            height: textElement.height + 10
        }

        const handles = [
            { corner: 'top-left', x: bounds.x, y: bounds.y },
            { corner: 'top-right', x: bounds.x + bounds.width, y: bounds.y },
            { corner: 'bottom-left', x: bounds.x, y: bounds.y + bounds.height },
            { corner: 'bottom-right', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        ]

        for (const handle of handles) {
            const dx = x - handle.x
            const dy = y - handle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance <= resizeHandleSize + 5) {
                return { corner: handle.corner }
            }
        }
        return null
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

        // Check if clicking on resize handle
        if (selectedTextIndex !== null) {
            const selectedText = texts[selectedTextIndex]
            const resizeHandle = findResizeHandle(x, y, selectedText)
            if (resizeHandle) {
                setIsResizing(true)
                mouseDownPosition.current = { x, y }
                hasMoved.current = false
                const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
                canvasStateBeforeDrag.current = currentState
                return
            }
        }

        // Check if clicking on existing text
        const textIndex = findTextAtPosition(x, y)

        if (textIndex !== null) {
            // Select this text
            setSelectedTextIndex(textIndex)
            const selectedText = texts[textIndex]
            setTextContent(selectedText.text)
            setFontSize(selectedText.fontSize)
            setFontFamily(selectedText.fontFamily)
            setFontWeight(selectedText.fontWeight)
            setColor(selectedText.color)

            // Save canvas state for dragging
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvasStateBeforeDrag.current = currentState
            mouseDownPosition.current = { x, y }
            hasMoved.current = false
            setIsDragging(true)
        } else {
            // Deselect and create new text
            setSelectedTextIndex(null)

            // Measure text dimensions
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
            const metrics = measureText(ctx, textContent, fontSize, fontFamily, fontWeight)

            // Create new text element
            const newText: TextElement = {
                x,
                y,
                id: Date.now(),
                text: textContent,
                fontSize,
                fontFamily,
                fontWeight,
                color,
                width: metrics.width,
                height: metrics.height
            }

            // Draw the text
            drawText(ctx, newText)

            // Add to state
            setTexts(prev => [...prev, newText])

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

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        if (isResizing && selectedTextIndex !== null && canvasStateBeforeDrag.current && mouseDownPosition.current) {
            const selectedText = texts[selectedTextIndex]
            const dx = x - mouseDownPosition.current.x
            const dy = y - mouseDownPosition.current.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 3) {
                hasMoved.current = true

                // Calculate new font size based on drag distance
                // Use average of x and y movement for scaling
                const scale = 1 + (dx + dy) / 200 // Adjust sensitivity
                const newFontSize = Math.max(12, Math.min(200, selectedText.fontSize * scale))

                // Restore canvas state
                ctx.putImageData(canvasStateBeforeDrag.current, 0, 0)

                // Measure new text dimensions
                ctx.font = `${selectedText.fontWeight} ${newFontSize}px ${selectedText.fontFamily}`
                const metrics = measureText(ctx, selectedText.text, newFontSize, selectedText.fontFamily, selectedText.fontWeight)

                // Update text element
                const updatedText: TextElement = {
                    ...selectedText,
                    fontSize: newFontSize,
                    width: metrics.width,
                    height: metrics.height
                }

                // Draw text with selection
                drawText(ctx, updatedText, true)

                // Update in state
                setTexts(prev => {
                    const newTexts = [...prev]
                    if (selectedTextIndex < newTexts.length) {
                        newTexts[selectedTextIndex] = updatedText
                    }
                    return newTexts
                })
            }
        } else if (isDragging && selectedTextIndex !== null && canvasStateBeforeDrag.current && mouseDownPosition.current) {
            const dx = x - mouseDownPosition.current.x
            const dy = y - mouseDownPosition.current.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > 3) {
                hasMoved.current = true
            }

            // Restore canvas state
            ctx.putImageData(canvasStateBeforeDrag.current, 0, 0)

            const selectedText = texts[selectedTextIndex]
            if (selectedText) {
                // Calculate new position based on mouse delta from initial click position
                const newTextX = selectedText.x + (x - mouseDownPosition.current.x)
                const newTextY = selectedText.y + (y - mouseDownPosition.current.y)

                const draggedText: TextElement = {
                    ...selectedText,
                    x: newTextX,
                    y: newTextY
                }

                // Draw text at new position with selection
                drawText(ctx, draggedText, true)
            }
        }
    }

    const onMouseUp = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        const canvas = canvasRef.current
        if (!canvas) return

        if (isResizing && selectedTextIndex !== null) {
            if (hasMoved.current) {
                // Already updated in onMouseMove
                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
            }
            setIsResizing(false)
            canvasStateBeforeDrag.current = null
            mouseDownPosition.current = null
            hasMoved.current = false
        } else if (isDragging && selectedTextIndex !== null) {
            if (hasMoved.current && mouseDownPosition.current) {
                // Update text position permanently
                const { x, y } = getCoordinates(canvasRef, e)
                const selectedText = texts[selectedTextIndex]
                const startX = mouseDownPosition.current.x
                const startY = mouseDownPosition.current.y

                setTexts(prev => {
                    const newTexts = [...prev]
                    if (selectedTextIndex < newTexts.length) {
                        newTexts[selectedTextIndex] = {
                            ...newTexts[selectedTextIndex],
                            x: selectedText.x + (x - startX),
                            y: selectedText.y + (y - startY)
                        }
                    }
                    return newTexts
                })

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

    const onMouseLeave = (
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        e: React.MouseEvent<HTMLCanvasElement>,
        deps: Record<string, any>
    ) => {
        if (isResizing && selectedTextIndex !== null) {
            if (hasMoved.current) {
                if (deps.saveToHistory) {
                    deps.saveToHistory()
                }
            }
            setIsResizing(false)
            canvasStateBeforeDrag.current = null
            mouseDownPosition.current = null
            hasMoved.current = false
        } else if (isDragging && selectedTextIndex !== null) {
            if (hasMoved.current && mouseDownPosition.current) {
                const { x, y } = getCoordinates(canvasRef, e)
                const selectedText = texts[selectedTextIndex]
                const startX = mouseDownPosition.current.x
                const startY = mouseDownPosition.current.y

                setTexts(prev => {
                    const newTexts = [...prev]
                    if (selectedTextIndex < newTexts.length) {
                        newTexts[selectedTextIndex] = {
                            ...newTexts[selectedTextIndex],
                            x: selectedText.x + (x - startX),
                            y: selectedText.y + (y - startY)
                        }
                    }
                    return newTexts
                })

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

    // Update selected text when properties change
    useEffect(() => {
        if (selectedTextIndex !== null && !isDragging && !isResizing) {
            const canvas = canvasRefForRedraw.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Clear and redraw the selected text with new properties
            setTexts(prev => {
                const newTexts = [...prev]
                if (selectedTextIndex < newTexts.length) {
                    const selectedText = newTexts[selectedTextIndex]
                    
                    // Clear old text area
                    ctx.fillStyle = '#ffffff'
                    ctx.fillRect(
                        selectedText.x - 10,
                        selectedText.y - 10,
                        selectedText.width + 20,
                        selectedText.height + 20
                    )

                    // Measure new text dimensions
                    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
                    const metrics = measureText(ctx, textContent, fontSize, fontFamily, fontWeight)

                    // Update text element
                    newTexts[selectedTextIndex] = {
                        ...selectedText,
                        text: textContent,
                        fontSize,
                        fontFamily,
                        fontWeight,
                        color,
                        width: metrics.width,
                        height: metrics.height
                    }

                    // Draw updated text with selection
                    drawText(ctx, newTexts[selectedTextIndex], true)
                }
                return newTexts
            })
        }
    }, [textContent, fontSize, fontFamily, fontWeight, color, selectedTextIndex, isDragging, isResizing])

    const toolbar = (
        <>
            <div className="toolbar-group">
                <label>Text:</label>
                <input
                    type="text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter text..."
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0',
                        fontSize: '14px',
                        minWidth: '150px',
                        outline: 'none'
                    }}
                />
            </div>
            <div className="toolbar-group">
                <label>Font:</label>
                <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Impact">Impact</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                </select>
            </div>
            <div className="toolbar-group">
                <label>Weight:</label>
                <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value)}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="100">Thin</option>
                    <option value="300">Light</option>
                    <option value="400">Regular</option>
                    <option value="500">Medium</option>
                    <option value="700">Bold</option>
                    <option value="900">Black</option>
                </select>
            </div>
            <div className="toolbar-group">
                <label>Size: {fontSize}px</label>
                <input
                    type="range"
                    min="12"
                    max="200"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="brush-size-slider"
                />
            </div>
            <div className="toolbar-group">
                <label>Color:</label>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="color-picker"
                />
            </div>
        </>
    )

    return {
        toolbar,
        cursor: selectedTextIndex !== null ? 'move' : 'crosshair',
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave
    }
}

