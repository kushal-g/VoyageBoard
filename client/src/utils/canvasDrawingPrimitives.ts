/**
 * Canvas Drawing Primitives
 *
 * This module defines the drawing primitive types that make up the canvas state.
 * The canvas is rendered by applying these primitives in order to a blank canvas.
 */

export type DrawingPrimitive =
  | DoodleStroke
  | TransitLineDrawing
  | EraserStroke

export interface DoodleStroke {
  type: 'doodle'
  id: string
  points: Array<{ x: number; y: number }>
  color: string
  lineWidth: number
  timestamp: number
}

export interface TransitLineDrawing {
  type: 'transit'
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  distance: number
  color: string
  selectedOption?: {
    type: string
    duration: string
    distance?: string
    cost?: string
    provider?: string
  }
  timestamp: number
}

export interface EraserStroke {
  type: 'eraser'
  id: string
  points: Array<{ x: number; y: number }>
  eraserSize: number
  timestamp: number
}

/**
 * Renders all drawing primitives onto a canvas context
 * Eraser strokes only affect doodle primitives, not transit lines
 */
export function renderDrawingPrimitives(
  ctx: CanvasRenderingContext2D,
  primitives: DrawingPrimitive[],
  canvasWidth: number,
  canvasHeight: number
): void {
  // Clear canvas with white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Separate primitives by type
  const doodleStrokes: DoodleStroke[] = []
  const transitLines: TransitLineDrawing[] = []
  const eraserStrokes: EraserStroke[] = []

  for (const primitive of primitives) {
    if (primitive.type === 'doodle') {
      doodleStrokes.push(primitive)
    } else if (primitive.type === 'transit') {
      transitLines.push(primitive)
    } else if (primitive.type === 'eraser') {
      eraserStrokes.push(primitive)
    }
  }

  // Filter doodle strokes to remove parts that were erased
  const visibleDoodles = filterErasedDoodles(doodleStrokes, eraserStrokes)

  // Render visible doodles
  for (const doodle of visibleDoodles) {
    renderDoodleStroke(ctx, doodle)
  }

  // Render all transit lines (not affected by eraser)
  for (const transit of transitLines) {
    renderTransitLine(ctx, transit)
  }
}

/**
 * Filters doodle strokes to remove segments that overlap with eraser strokes
 */
function filterErasedDoodles(doodles: DoodleStroke[], erasers: EraserStroke[]): DoodleStroke[] {
  if (erasers.length === 0) return doodles

  const result: DoodleStroke[] = []

  for (const doodle of doodles) {
    const newPoints: Array<{ x: number; y: number }> = []

    for (const point of doodle.points) {
      let isErased = false

      // Check if this point overlaps with any eraser stroke
      for (const eraser of erasers) {
        for (const eraserPoint of eraser.points) {
          const dx = point.x - eraserPoint.x
          const dy = point.y - eraserPoint.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < eraser.eraserSize / 2 + doodle.lineWidth / 2) {
            isErased = true
            break
          }
        }
        if (isErased) break
      }

      if (!isErased) {
        newPoints.push(point)
      } else if (newPoints.length > 0) {
        // Create a new stroke segment for points before the erased section
        result.push({
          ...doodle,
          id: `${doodle.id}-segment-${result.length}`,
          points: newPoints.slice()
        })
        newPoints.length = 0
      }
    }

    // Add remaining points as a final segment
    if (newPoints.length > 0) {
      result.push({
        ...doodle,
        id: `${doodle.id}-segment-${result.length}`,
        points: newPoints
      })
    }
  }

  return result
}

function renderDoodleStroke(ctx: CanvasRenderingContext2D, stroke: DoodleStroke): void {
  if (stroke.points.length < 2) return

  ctx.save()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }

  ctx.stroke()
  ctx.restore()
}

function renderTransitLine(ctx: CanvasRenderingContext2D, line: TransitLineDrawing): void {
  ctx.save()

  const color = line.color
  const width = 3

  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.setLineDash([12, 6])

  ctx.beginPath()
  ctx.moveTo(line.start.x, line.start.y)
  ctx.lineTo(line.end.x, line.end.y)
  ctx.stroke()

  ctx.setLineDash([])

  // Draw arrow at end
  const angle = Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x)
  const arrowLength = 15

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(line.end.x, line.end.y)
  ctx.lineTo(
    line.end.x - arrowLength * Math.cos(angle - Math.PI / 6),
    line.end.y - arrowLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    line.end.x - arrowLength * Math.cos(angle + Math.PI / 6),
    line.end.y - arrowLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()

  const midX = (line.start.x + line.end.x) / 2
  const midY = (line.start.y + line.end.y) / 2

  const lineAngle = Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x)

  // Draw distance label
  if (line.distance > 0) {
    ctx.save()
    ctx.translate(midX, midY)
    ctx.rotate(lineAngle)

    if (lineAngle > Math.PI / 2 || lineAngle < -Math.PI / 2) {
      ctx.rotate(Math.PI)
    }

    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    const distanceText = `${line.distance.toFixed(2)} km`
    const textMetrics = ctx.measureText(distanceText)
    const textWidth = textMetrics.width
    const padding = 6
    const offsetY = -8

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(
      -textWidth / 2 - padding,
      offsetY - 16,
      textWidth + padding * 2,
      20
    )

    ctx.fillStyle = color
    ctx.fillText(distanceText, 0, offsetY)

    ctx.restore()
  }

  // Draw selected transit option
  if (line.selectedOption) {
    ctx.save()
    ctx.translate(midX, midY)
    ctx.rotate(lineAngle)

    if (lineAngle > Math.PI / 2 || lineAngle < -Math.PI / 2) {
      ctx.rotate(Math.PI)
    }

    const offsetY = 12
    const formatType = (type: string) => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    const typeText = formatType(line.selectedOption.type)

    const type = line.selectedOption.type.toLowerCase()
    let iconName = ''
    if (type === 'drive') iconName = 'directions_car'
    else if (type === 'bus') iconName = 'directions_bus'
    else if (type === 'train') iconName = 'directions_transit'
    else if (type === 'flight') iconName = 'flight'
    else if (type === 'walk') iconName = 'directions_walk'
    else if (type === 'bicycle') iconName = 'directions_bike'
    else iconName = 'circle'

    const textOnly = `${typeText} • ${line.selectedOption.duration}${line.selectedOption.cost ? ' • ' + line.selectedOption.cost : ''}`

    const iconSize = 16
    const iconPadding = 6

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
    const textMetrics = ctx.measureText(textOnly)
    const textWidth = textMetrics.width

    ctx.font = `${iconSize}px "Material Icons"`
    const iconMetrics = ctx.measureText(iconName)
    const iconWidth = iconMetrics.width || iconSize

    const totalWidth = iconWidth + iconPadding + textWidth
    const startX = -totalWidth / 2

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#007aff'
    ctx.font = `${iconSize}px "Material Icons"`
    ctx.fillText(iconName, startX, offsetY + 8)

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
    ctx.fillStyle = '#000000'
    ctx.fillText(textOnly, startX + iconWidth + iconPadding, offsetY + 8)

    ctx.restore()
  }

  // Draw dots at start and end
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(line.start.x, line.start.y, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(line.end.x, line.end.y, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
