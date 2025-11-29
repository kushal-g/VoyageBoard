import type { LocationPin, LocationGroup, TransitLine } from '../pages/Canvas/Canvas'

export interface SerializedCanvasState {
  version: string
  pins: LocationPin[]
  groups: LocationGroup[]
  transitLines: TransitLine[]
  canvasImageData: string | null // Base64 encoded ImageData
  history: string[] // Array of base64 encoded ImageData
  historyStep: number
  timestamp: string
}

const CURRENT_VERSION = '1.0.0'

/**
 * Converts ImageData to base64 string for storage
 */
function imageDataToBase64(imageData: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')
  
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}


/**
 * Serializes canvas state to a JSON-compatible object
 */
export function serializeCanvasState(
  pins: LocationPin[],
  groups: LocationGroup[],
  transitLines: TransitLine[],
  canvasImageData: ImageData | null,
  history: ImageData[],
  historyStep: number
): SerializedCanvasState {
  const state: SerializedCanvasState = {
    version: CURRENT_VERSION,
    pins,
    groups,
    transitLines,
    canvasImageData: canvasImageData ? imageDataToBase64(canvasImageData) : null,
    history: history.map(img => imageDataToBase64(img)),
    historyStep,
    timestamp: new Date().toISOString()
  }
  
  return state
}

/**
 * Deserializes canvas state from a JSON-compatible object
 * Returns the serialized state with base64 strings that need to be restored
 */
export function deserializeCanvasState(
  serialized: SerializedCanvasState
): {
  pins: LocationPin[]
  groups: LocationGroup[]
  transitLines: TransitLine[]
  canvasImageDataBase64: string | null
  historyBase64: string[]
  historyStep: number
} {
  return {
    pins: serialized.pins || [],
    groups: serialized.groups || [],
    transitLines: serialized.transitLines || [],
    canvasImageDataBase64: serialized.canvasImageData || null,
    historyBase64: serialized.history || [],
    historyStep: serialized.historyStep ?? -1
  }
}

/**
 * Saves canvas state to localStorage
 */
export function saveCanvasStateToLocalStorage(
  tripId: string,
  pins: LocationPin[],
  groups: LocationGroup[],
  transitLines: TransitLine[],
  canvasImageData: ImageData | null,
  history: ImageData[],
  historyStep: number
): void {
  try {
    const serialized = serializeCanvasState(
      pins,
      groups,
      transitLines,
      canvasImageData,
      history,
      historyStep
    )
    
    const storageKey = `canvas_state_${tripId}`
    localStorage.setItem(storageKey, JSON.stringify(serialized))
    
    // Also save a timestamp for last saved
    localStorage.setItem(`canvas_state_${tripId}_saved`, new Date().toISOString())
  } catch (error) {
    console.error('Failed to save canvas state:', error)
    throw error
  }
}

/**
 * Loads canvas state from localStorage
 */
export function loadCanvasStateFromLocalStorage(
  tripId: string
): SerializedCanvasState | null {
  try {
    const storageKey = `canvas_state_${tripId}`
    const stored = localStorage.getItem(storageKey)
    
    if (!stored) return null
    
    const parsed = JSON.parse(stored) as SerializedCanvasState
    
    // Validate version compatibility (for future migrations)
    if (parsed.version !== CURRENT_VERSION) {
      console.warn(`Canvas state version mismatch: ${parsed.version} vs ${CURRENT_VERSION}`)
      // Could implement migration logic here
    }
    
    return parsed
  } catch (error) {
    console.error('Failed to load canvas state:', error)
    return null
  }
}

/**
 * Restores ImageData from base64 string
 */
export function restoreImageDataFromBase64(
  base64: string,
  width: number,
  height: number
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      resolve(null)
      return
    }
    
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, width, height)
      resolve(imageData)
    }
    img.onerror = () => resolve(null)
    img.src = base64
  })
}

/**
 * Checks if canvas state exists in localStorage
 */
export function hasCanvasState(tripId: string): boolean {
  const storageKey = `canvas_state_${tripId}`
  return localStorage.getItem(storageKey) !== null
}

/**
 * Clears canvas state from localStorage
 */
export function clearCanvasState(tripId: string): void {
  const storageKey = `canvas_state_${tripId}`
  localStorage.removeItem(storageKey)
  localStorage.removeItem(`canvas_state_${tripId}_saved`)
}