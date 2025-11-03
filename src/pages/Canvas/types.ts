import type { ReactNode } from "react";

type CanvasToolMouseEventHandler = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    deps: Record<string, any>
) => void

export interface CanvasTool {
    toolbar: ReactNode | undefined,
    cursor?: string,
    cursorElement?: ReactNode,
    onMouseDown: CanvasToolMouseEventHandler,
    onMouseMove: CanvasToolMouseEventHandler,
    onMouseUp: CanvasToolMouseEventHandler,
    onMouseLeave: CanvasToolMouseEventHandler
}