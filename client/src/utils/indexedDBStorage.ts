/**
 * IndexedDB storage utilities for VoyageBoard
 * Provides much larger storage capacity than localStorage (~60% of disk space vs 5-10MB)
 */

const DB_NAME = 'VoyageBoardDB'
const DB_VERSION = 1
const STORE_NAME = 'canvasStates'

interface DBSchema {
  tripId: string
  data: any
  timestamp: string
}

/**
 * Opens IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'tripId' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Saves data to IndexedDB
 */
export async function saveToIndexedDB(tripId: string, data: any): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const record: DBSchema = {
      tripId,
      data,
      timestamp: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error)
    throw error
  }
}

/**
 * Loads data from IndexedDB
 */
export async function loadFromIndexedDB(tripId: string): Promise<any | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(tripId)

      request.onsuccess = () => {
        const result = request.result as DBSchema | undefined
        resolve(result ? result.data : null)
      }

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error)
    return null
  }
}

/**
 * Checks if data exists in IndexedDB
 */
export async function hasDataInIndexedDB(tripId: string): Promise<boolean> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(tripId)

      request.onsuccess = () => resolve(request.result !== undefined)
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to check IndexedDB:', error)
    return false
  }
}

/**
 * Deletes data from IndexedDB
 */
export async function deleteFromIndexedDB(tripId: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(tripId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to delete from IndexedDB:', error)
    throw error
  }
}

/**
 * Gets all stored trip IDs
 */
export async function getAllTripIds(): Promise<string[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys()

      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to get all trip IDs:', error)
    return []
  }
}

/**
 * Gets storage usage estimate
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentage: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      const percentage = quota > 0 ? (usage / quota) * 100 : 0

      return {
        usage,
        quota,
        percentage
      }
    } catch (error) {
      console.error('Failed to get storage estimate:', error)
      return null
    }
  }
  return null
}
