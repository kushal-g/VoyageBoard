import { useState, useEffect } from 'react'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonTitle,
  IonPopover,
  IonLabel,
  IonInput,
  IonAlert,
  IonText,
  IonLoading
} from '@ionic/react'
import { chevronBack, linkOutline, cloudUploadOutline, playCircle, add, trash } from 'ionicons/icons'
import './IdeaDumpPage.css'
import { useHistory, useLocation } from 'react-router-dom'
import { loadCanvasStateFromLocalStorage } from '../utils/canvasSerialization'
import type { LocationPin } from './Canvas/Canvas'

type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'upload'
type Status = 'ready' | 'unprocessed'

type Idea = {
  id: string
  title: string
  platform: string
  thumb?: string
  status: Status
  link?: string
  placeId?: string
  formattedAddress?: string
  coordinates?: PlaceLocation
}

interface PlaceLocation {
  latitude: number
  longitude: number
}

interface TravelPlace {
  name: string
  description?: string
  type?: string
  location?: string
  recommendations?: string
  placeId?: string
  coordinates?: PlaceLocation
  formattedAddress?: string
  photoReference?: string
}

interface ScrapeApiResponse {
  url: string
  html: string
  title?: string
  description?: string
  headings: {
    h1: string[]
    h2: string[]
    h3: string[]
  }
  links: Array<{
    text: string
    href: string
  }>
  images: Array<{
    src: string
    alt: string
  }>
  paragraphs: string[]
  metadata: {
    author?: string
    keywords?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
  }
  textContent?: string
  extractedPlaces?: TravelPlace[]
}

const thumbs = {
  gateway: 'https://images.unsplash.com/photo-1548013146-72479768bada',
  juhu: 'https://images.unsplash.com/photo-1548013146-e7c9e5b2d7b8',
  iskcon: 'https://images.unsplash.com/photo-1610438592283-5fbcf0c4b9f9',
  lalbagh: 'https://images.unsplash.com/photo-1610201315927-9b8a7d4b4f6b',
  taj: 'https://images.unsplash.com/photo-1549893079-842e6d40842a'
}

function platformFromUrl(u: string): Platform {
  try {
    const h = new URL(u).hostname.replace('www.', '')
    if (h.includes('tiktok')) return 'tiktok'
    if (h.includes('instagram')) return 'instagram'
    if (h.includes('facebook')) return 'facebook'
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube'
  } catch { }
  return 'upload'
}

export default function IdeaDumpPage() {
  const history = useHistory()
  const location = useLocation<{ trip?: { id?: string; name?: string; lastEdited?: string } } | undefined>()
  const trip = location.state?.trip

  const [items, setItems] = useState<Idea[]>([])
  const [linkValue, setLinkValue] = useState('')
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const tripId = trip?.id || 'default'
  const storageKey = `idea_dump_${tripId}`

  // Load items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedItems = JSON.parse(stored) as Idea[]
        setItems(parsedItems)
      }
    } catch (error) {
      console.error('Failed to load items from localStorage:', error)
    }
  }, [storageKey])

  // Save items to localStorage whenever they change
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items))
      } catch (error) {
        console.error('Failed to save items to localStorage:', error)
      }
    }
  }, [items, storageKey])

  const hasUnprocessed = items.some(i => i.status === 'unprocessed')
  const pageTitle = trip?.name ? `Ideas for ${trip.name}` : 'Idea Dump'
  const subtitleText = `${items.length} item${items.length === 1 ? '' : 's'}`

  function handleBack() {
    if (hasUnprocessed) setShowLeaveAlert(true)
    else history.goBack()
  }

  function addFromLink() {
    if (!linkValue.trim()) return
    const url = linkValue.trim()
    const p = platformFromUrl(url)
    const id = Math.random().toString(36).slice(2)

    setItems(prev => [
      { id, title: 'Unprocessed', platform: p, status: 'unprocessed', link: url },
      ...prev
    ])

    setLinkValue('')
  }

  function onFileUpload(files: FileList | null) {
    if (!files || !files[0]) return
    const f = files[0]
    const id = Math.random().toString(36).slice(2)
    const fileUrl = URL.createObjectURL(f)

    setItems(prev => [
      { id, title: f.name, platform: 'upload', status: 'unprocessed', link: fileUrl },
      ...prev
    ])
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function addLocationToCanvas(idea: Idea) {
    if (!idea.placeId) return
    
    const canvasId = trip?.id || '1'
    
    // Load existing canvas state
    const existingState = loadCanvasStateFromLocalStorage(canvasId)
    const existingPins = existingState?.pins || []
    const existingGroups = existingState?.groups || []
    const existingHistory = existingState?.history || []
    const existingHistoryStep = existingState?.historyStep ?? -1
    
    // Check if this location is already added
    const isAlreadyAdded = existingPins.some(pin => pin.placeId === idea.placeId)
    if (isAlreadyAdded) {
      // Optionally show a message or just return silently
      return
    }
    
    // Use a default canvas size for positioning (will be adjusted when canvas loads)
    const defaultCanvasWidth = 1200
    const defaultCanvasHeight = 800
    const margin = 100
    
    // Generate scattered random position
    const x = margin + Math.random() * (defaultCanvasWidth - 2 * margin)
    const y = margin + Math.random() * (defaultCanvasHeight - 2 * margin)
    
    const newPin: LocationPin = {
      x,
      y,
      id: Date.now(),
      location: idea.formattedAddress || idea.title,
      color: '#808080',
      placeId: idea.placeId
    }
    
    // Combine with existing pins
    const allPins = [...existingPins, newPin]
    
    // Save to localStorage
    // Note: We preserve the existing state structure, but don't try to restore ImageData
    // The canvas will handle proper restoration when it loads
    try {
      const serialized = {
        version: existingState?.version || '1.0.0',
        pins: allPins,
        groups: existingGroups,
        transitLines: [],
        canvasImageData: existingState?.canvasImageData || null,
        history: existingHistory,
        historyStep: existingHistoryStep,
        timestamp: new Date().toISOString()
      }
      
      const storageKey = `canvas_state_${canvasId}`
      localStorage.setItem(storageKey, JSON.stringify(serialized))
      localStorage.setItem(`canvas_state_${canvasId}_saved`, new Date().toISOString())
    } catch (error) {
      console.error('Failed to add location to canvas:', error)
    }
  }

  function getUnprocessedItems() {
    return items.filter(item => item.status === "unprocessed")
  }

  async function processIdeas(): Promise<void> {
    const unprocessedItems = getUnprocessedItems()
    if (unprocessedItems.length === 0) return

    setIsProcessing(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: "POST",
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          url: unprocessedItems[0].link, //TODO: Extend to multiple items
          extractPlaces: true
        })
      })

      if (!response.ok) {
        console.error('Failed to scrape:', response.statusText)
        setIsProcessing(false)
        return
      }

      const body: ScrapeApiResponse = await response.json()

      // Update items - mark processed item as ready and add extracted places
      setItems(items => {
        const updatedItems = items.map(item =>
          item.id === unprocessedItems[0].id
            ? { ...item, status: 'ready' as Status, title: body.title || item.title }
            : item
        )

        // Add extracted places as new items
        const newPlaceItems = (body.extractedPlaces ?? [])
          .map(place => ({
            id: place.placeId as string || Math.random().toString(36).slice(2),
            title: place.name,
            platform: body.title ?? "",
            status: "ready" as Status,
            thumb: place.photoReference
              ? `https://places.googleapis.com/v1/${place.photoReference}/media?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&maxHeightPx=400&maxWidthPx=400`
              : undefined,
            placeId: place.placeId,
            formattedAddress: place.formattedAddress,
            coordinates: place.coordinates
          }))

        return [...newPlaceItems, ...updatedItems]
      })

      // Automatically save all locations to canvas
      if (body.extractedPlaces && body.extractedPlaces.length > 0) {
        const canvasId = trip?.id || '1'
        
        // Load existing canvas state
        const existingState = loadCanvasStateFromLocalStorage(canvasId)
        const existingPins = existingState?.pins || []
        const existingGroups = existingState?.groups || []
        const existingHistory = existingState?.history || []
        const existingHistoryStep = existingState?.historyStep ?? -1
        
        // Get existing canvas image data if available
        let existingCanvasImageData: ImageData | null = null
        if (existingState?.canvasImageData) {
          // We'll need to restore this, but for now we'll create a blank canvas
          // The canvas will handle restoring the image when it loads
          existingCanvasImageData = null
        }
        
        // Filter out places that are already in the canvas
        const existingPlaceIds = new Set(existingPins.map(pin => pin.placeId).filter(Boolean))
        const placesToAdd = body.extractedPlaces.filter(place => 
          place.placeId && !existingPlaceIds.has(place.placeId)
        )
        
        if (placesToAdd.length === 0) {
          // All locations already exist, just navigate to canvas
          const canvasId = trip?.id || '1'
          history.push(`/canvas/${canvasId}`, { trip })
          return
        }
        
        // Create new pins with scattered positions
        // Use a default canvas size for positioning (will be adjusted when canvas loads)
        const defaultCanvasWidth = 1200
        const defaultCanvasHeight = 800
        const margin = 100
        
        const newPins: LocationPin[] = placesToAdd.map((place, index) => {
          // Generate scattered random positions
          const x = margin + Math.random() * (defaultCanvasWidth - 2 * margin)
          const y = margin + Math.random() * (defaultCanvasHeight - 2 * margin)
          
          return {
            x,
            y,
            id: Date.now() + index,
            location: place.formattedAddress || place.name,
            color: '#808080',
            placeId: place.placeId
          }
        })
        
        // Combine with existing pins
        const allPins = [...existingPins, ...newPins]
        
        // Save to localStorage
        // Note: We preserve the existing state structure, but don't try to restore ImageData
        // The canvas will handle proper restoration when it loads
        try {
          const serialized = {
            version: existingState?.version || '1.0.0',
            pins: allPins,
            groups: existingGroups,
            transitLines: [],
            canvasImageData: existingState?.canvasImageData || null,
            history: existingHistory,
            historyStep: existingHistoryStep,
            timestamp: new Date().toISOString()
          }
          
          const storageKey = `canvas_state_${canvasId}`
          localStorage.setItem(storageKey, JSON.stringify(serialized))
          localStorage.setItem(`canvas_state_${canvasId}_saved`, new Date().toISOString())
        } catch (error) {
          console.error('Failed to save locations automatically:', error)
        }
        
        // Navigate to canvas to show the results
        history.push(`/canvas/${canvasId}`, {
          trip
        })
      }
    } catch (error) {
      console.error('Error processing ideas:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <IonPage className="idea-dump-page">
      <IonHeader>
        <IonToolbar className="canvas-header">
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={handleBack}>
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>

          <IonTitle className="canvas-title-container">
            <div className="canvas-title-block">
              <div className="canvas-title">{pageTitle}</div>
              <IonText className="canvas-subtitle">
                {subtitleText}
                {trip?.lastEdited ? ` • Last Edited: ${trip.lastEdited}` : ''}
              </IonText>
            </div>
          </IonTitle>

          <IonButtons slot="end">
            <IonButton className="id-pill" onClick={processIdeas}>
              <span>Process Ideas</span>
              <IonIcon icon={playCircle} />
            </IonButton>

            <IonButton id="add-trigger" className="id-circle-btn">
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="id-content">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No ideas yet</p>
            <p className="empty-secondary">
              Upload your first inspiration link to get started.
            </p>
          </div>
        ) : (
          <div className="id-grid">
            {items.map(card => (
              <div
                key={card.id}
                className="id-card"
                onClick={() => {
                  if (card.link) window.open(card.link, '_blank')
                }}
              >
                <IonButton
                  fill="clear"
                  className="id-delete-btn"
                  onClick={e => {
                    e.stopPropagation()
                    deleteItem(card.id)
                  }}
                >
                  <IonIcon icon={trash} />
                </IonButton>

                {card.placeId && (
                  <IonButton
                    fill="clear"
                    className="id-add-btn"
                    onClick={e => {
                      e.stopPropagation()
                      addLocationToCanvas(card)
                    }}
                    title="Add to canvas"
                  >
                    <IonIcon icon={add} />
                  </IonButton>
                )}

                <div
                  className="id-thumb"
                  style={{ backgroundImage: `url(${card.thumb})` }}
                />
                <div className="id-gradient" />
                <div className="id-meta">
                  <div className="id-title-text">
                    {card.status === 'unprocessed' ? 'Unprocessed' : card.title}
                  </div>
                  <div className="id-platform">
                    {card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <IonPopover trigger="add-trigger" triggerAction="click" className="id-pop">
          <div className="id-pop-inner">
            <div className="id-input-row">
              <IonIcon icon={linkOutline} className="id-input-icon" />
              <IonInput
                placeholder="Insert link"
                value={linkValue}
                onIonChange={e => setLinkValue(e.detail.value || '')}
              />
              <IonButton className="id-input-btn" onClick={addFromLink}>
                Add
              </IonButton>
            </div>

            <label className="id-upload-row">
              <IonIcon icon={cloudUploadOutline} className="id-upload-icon" />
              <span className="id-upload-label">Upload file</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={e => onFileUpload(e.target.files)}
              />
            </label>
          </div>
        </IonPopover>

        <IonAlert
          isOpen={showLeaveAlert}
          onDidDismiss={() => setShowLeaveAlert(false)}
          header="Unprocessed items"
          message="You added new links. Process them before returning to Canvas?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Leave anyway', handler: () => history.goBack() }
          ]}
        />

        <IonLoading
          isOpen={isProcessing}
          message="Processing ideas..."
          spinner="crescent"
        />
      </IonContent>
    </IonPage>
  )
}