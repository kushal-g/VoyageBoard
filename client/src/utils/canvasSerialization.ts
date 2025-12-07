import type { LocationPin, LocationGroup } from '../pages/Canvas/Canvas'
import type { TransitLine } from '../pages/Canvas/tools/Transit'
import { saveToIndexedDB, loadFromIndexedDB, deleteFromIndexedDB } from './indexedDBStorage'

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
 * Saves canvas state to IndexedDB
 */
export async function saveCanvasStateToLocalStorage(
  tripId: string,
  pins: LocationPin[],
  groups: LocationGroup[],
  transitLines: TransitLine[],
  canvasImageData: ImageData | null,
  history: ImageData[],
  historyStep: number
): Promise<void> {
  const serialized = serializeCanvasState(
    pins,
    groups,
    transitLines,
    canvasImageData,
    history,
    historyStep
  )

  try {
    await saveToIndexedDB(tripId, serialized)
  } catch (error) {
    console.error('Failed to save canvas state to IndexedDB:', error)
    throw error
  }
}

/**
 * Loads canvas state from IndexedDB (with localStorage fallback for migration)
 */
export async function loadCanvasStateFromLocalStorage(
  tripId: string
): Promise<SerializedCanvasState | null> {
  try {
    // Try loading from IndexedDB first
    const data = await loadFromIndexedDB(tripId)

    if (data) {
      // Validate version compatibility
      if (data.version !== CURRENT_VERSION) {
        console.warn(`Canvas state version mismatch: ${data.version} vs ${CURRENT_VERSION}`)
      }
      return data as SerializedCanvasState
    }

    // Fallback: check localStorage for old data and migrate it
    const storageKey = `canvas_state_${tripId}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      console.log('Migrating data from localStorage to IndexedDB...')
      const parsed = JSON.parse(stored) as SerializedCanvasState

      // Migrate to IndexedDB
      try {
        await saveToIndexedDB(tripId, parsed)
        console.log('Migration successful')

        // Optionally remove from localStorage to save space
        localStorage.removeItem(storageKey)
      } catch (migrationError) {
        console.warn('Failed to migrate to IndexedDB:', migrationError)
      }

      return parsed
    }

    return null
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
 * Checks if canvas state exists in IndexedDB or localStorage
 */
export async function hasCanvasState(tripId: string): Promise<boolean> {
  try {
    // Check IndexedDB first
    const data = await loadFromIndexedDB(tripId)
    if (data) return true

    // Fallback to localStorage
    const storageKey = `canvas_state_${tripId}`
    return localStorage.getItem(storageKey) !== null
  } catch (error) {
    console.error('Failed to check canvas state:', error)
    return false
  }
}

/**
 * Clears canvas state from IndexedDB and localStorage
 */
export async function clearCanvasState(tripId: string): Promise<void> {
  try {
    // Clear from IndexedDB
    await deleteFromIndexedDB(tripId)

    // Clear from localStorage (in case of old data)
    const storageKey = `canvas_state_${tripId}`
    localStorage.removeItem(storageKey)
    localStorage.removeItem(`canvas_state_${tripId}_saved`)
  } catch (error) {
    console.error('Failed to clear canvas state:', error)
    throw error
  }
}