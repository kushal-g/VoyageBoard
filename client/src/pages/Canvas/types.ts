import type { ReactNode } from "react";

type CanvasToolMouseEventHandler = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    deps: Record<string, any>
) => void

export interface CanvasTool {
    toolbar: ReactNode | ((deps: Record<string, any>) => ReactNode) | undefined,
    cursor?: string,
    cursorElement?: ReactNode,
    locationPins?: ReactNode | ((deps: Record<string, any>) => ReactNode),
    selectionOverlays?: ReactNode,
    messageOverlay?: ReactNode,
    onMouseDown: CanvasToolMouseEventHandler,
    onMouseMove: CanvasToolMouseEventHandler,
    onMouseUp: CanvasToolMouseEventHandler,
    onMouseLeave: CanvasToolMouseEventHandler
}