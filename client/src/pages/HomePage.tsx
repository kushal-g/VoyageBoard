import { IonPage, IonContent, IonIcon, IonCard, IonButton, IonActionSheet } from '@ionic/react'
import { calendarClearOutline, add, ellipsisVertical, trash, shareSocial, image, pencil } from 'ionicons/icons'
import { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import AppStatusBar from '../components/AppStatusBar'
import './HomePage.css'

interface TripBoard {
  id: string
  name: string
  createdAt: Date
  coverImage?: string
  subtitle?: string
  lastEdited?: Date
}

const STORAGE_KEY = 'voyageboard.tripBoards'

const HomePage = () => {
  const [tripBoards, setTripBoards] = useState<TripBoard[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved) as {
        id: string
        name: string
        createdAt: string
        coverImage?: string
        subtitle?: string
        lastEdited?: string
      }[]
      return parsed.map(b => ({
        ...b,
        createdAt: new Date(b.createdAt),
        lastEdited: b.lastEdited ? new Date(b.lastEdited) : undefined,
      }))
    } catch {
      return []
    }
  })

  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const history = useHistory()

  useEffect(() => {
    const serializable = tripBoards.map(b => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      lastEdited: b.lastEdited ? b.lastEdited.toISOString() : undefined,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  }, [tripBoards])

  const createNewTripboard = () => {
    const now = new Date()
    const newBoard: TripBoard = {
      id: Date.now().toString(),
      name: `Canvas ${tripBoards.length + 1}`,
      createdAt: now,
      coverImage: 'https://ionicframework.com/docs/img/demos/card-media.png',
      subtitle: 'Canvas',
      lastEdited: now,
    }
    setTripBoards(prev => [...prev, newBoard])
  }

  const openBoardActions = (trip: TripBoard) => {
    setActiveBoardId(trip.id)
    setActionSheetOpen(true)
  }

  const formatDate = (d?: Date) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString()
  }

  const closeActionSheet = () => {
    setActionSheetOpen(false)
    setActiveBoardId(null)
  }

  const handleDelete = () => {
    if (!activeBoardId) return
    setTripBoards(prev => prev.filter(b => b.id !== activeBoardId))
    closeActionSheet()
  }

  const handleRename = () => {
    const board = tripBoards.find(b => b.id === activeBoardId)
    if (!board) return

    const newName = window.prompt('Enter a new name:', board.name)
    if (!newName || newName.trim() === '') {
      closeActionSheet()
      return
    }

    const updatedName = newName.trim()
    const updatedBoard: TripBoard = { ...board, name: updatedName, lastEdited: new Date() }

    setTripBoards(prev =>
      prev.map(b => (b.id === activeBoardId ? updatedBoard : b))
    )
    closeActionSheet()
  }

  const handleShare = async () => {
    const board = tripBoards.find(b => b.id === activeBoardId)
    if (!board) return

    const shareData = {
      title: board.name,
      text: `Check out my tripboard: ${board.name}`,
    }

    if ((navigator as any).share) {
      try {
        await (navigator as any).share(shareData)
      } catch (err) {
        console.warn('Share cancelled', err)
      }
    } else {
      alert('Sharing is not supported on this device.')
    }
    closeActionSheet()
  }

  const handleChangeCover = () => {
    const url = window.prompt('Enter image URL for cover:')
    if (!url || !activeBoardId) {
      closeActionSheet()
      return
    }

    setTripBoards(prev =>
      prev.map(b => (b.id === activeBoardId ? { ...b, coverImage: url } : b))
    )
    closeActionSheet()
  }

  return (
    <IonPage>
      <AppStatusBar />
      <IonContent className="home-content">
        <div className="home-page">
          <div className="page-header">
            <div className="title-group">
              <h1 className="page-title">Home</h1>
              <h2 className="subtitle">Welcome to VoyageBoard!</h2>
            </div>

            <IonButton
              fill="outline"
              color="medium"
              className="create-button"
              onClick={createNewTripboard}
            >
              Create New Trip Board
              <IonIcon icon={add} slot="end" />
            </IonButton>
          </div>

          {tripBoards.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={calendarClearOutline} className="empty-icon" />
              <p>No trips yet</p>
              <p className="empty-secondary">
                Create your first tripboard to get started.
              </p>
            </div>
          ) : (
            <div className="tripboards-list">
              {tripBoards.map(trip => (
                <IonCard
                  key={trip.id}
                  className="trip-card"
                  onClick={() => history.push(`/canvas/${trip.id}`, { trip })}
                >
                  <div className="trip-card-image-wrapper">
                    <img src={trip.coverImage || '/assets/default-cover.jpg'} alt={trip.name} />
                    <IonButton
                      fill="clear"
                      color="light"
                      className="trip-card-ellipsis"
                      onClick={e => {
                        e.stopPropagation()
                        openBoardActions(trip)
                      }}
                    >
                      <IonIcon icon={ellipsisVertical} />
                    </IonButton>
                    <div className="trip-card-overlay">
                      <h3 className="trip-card-title">{trip.name}</h3>
                      <p className="trip-card-subtitle">
                        Last Edited: {formatDate(trip.lastEdited)}
                      </p>
                    </div>
                  </div>
                </IonCard>
              ))}

              <IonActionSheet
                isOpen={actionSheetOpen}
                onDidDismiss={closeActionSheet}
                buttons={[
                  { text: 'Delete Canvas', role: 'destructive', icon: trash, handler: handleDelete },
                  { text: 'Share Canvas', icon: shareSocial, handler: handleShare },
                  { text: 'Rename Canvas', icon: pencil, handler: handleRename },
                  { text: 'Change Cover Image', icon: image, handler: handleChangeCover },
                  { text: 'Cancel', role: 'cancel' },
                ]}
              />
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default HomePage