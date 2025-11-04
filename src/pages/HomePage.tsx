import { IonPage, IonContent, IonIcon, IonCard, IonButton, IonActionSheet } from '@ionic/react'
import { calendarClearOutline, add, ellipsisVertical, trash, shareSocial, image } from 'ionicons/icons'
import { useState } from 'react'
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

const HomePage = () => {
  const [tripBoards, setTripBoards] = useState<TripBoard[]>([])
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const history = useHistory()

  const createNewTripboard = () => {
    const newBoard: TripBoard = {
      id: Date.now().toString(),
      name: `Trip Board ${tripBoards.length + 1}`,
      createdAt: new Date(),
      coverImage: 'https://ionicframework.com/docs/img/demos/card-media.png',
      subtitle: 'Trip Board',
      lastEdited: new Date(),
    }
    setTripBoards([...tripBoards, newBoard])
  }

  const openBoardActions = (trip: TripBoard) => {
    openActionSheet(trip.id)
  }

  const formatDate = (d?: Date) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString()
  }

  const openActionSheet = (boardId: string) => {
    setActiveBoardId(boardId)
    setActionSheetOpen(true)
  }

  const closeActionSheet = () => {
    setActionSheetOpen(false)
    setActiveBoardId(null)
  }

  const handleDelete = () => {
    if (!activeBoardId) return
    setTripBoards((prev) => prev.filter((b) => b.id !== activeBoardId))
    closeActionSheet()
  }

  const handleShare = async () => {
    const board = tripBoards.find((b) => b.id === activeBoardId)
    if (!board) return
    const shareData = { title: board.name, text: `Check out my tripboard: ${board.name}` }
    if ((navigator as any).share) {
      try {
        await (navigator as any).share(shareData)
      } catch (err) {
        console.warn('Share cancelled', err)
      }
    } else {
      alert('Share not supported in this browser')
    }
    closeActionSheet()
  }

  const handleChangeCover = () => {
    const url = window.prompt('Enter image URL for cover:')
    if (!url || !activeBoardId) { closeActionSheet(); return }
    setTripBoards((prev) => prev.map((b) => (b.id === activeBoardId ? { ...b, image: url } : b)))
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

            <IonButton fill="outline" color="medium" className="create-button" onClick={createNewTripboard}>
              Create New Trip Board
              <IonIcon icon={add} slot="end" />
            </IonButton>
          </div>
          {tripBoards.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={calendarClearOutline} className="empty-icon" />
              <p>No trips yet</p>
              <p className="empty-secondary">Create your first tripboard to get started.</p>
            </div>
          ) : (
            <div className="tripboards-list">
              {tripBoards.map((trip) => (
                <IonCard key={trip.id} className="trip-card" onClick={() => history.push(`/canvas/${trip.id}`, { trip })}>
                  <div className="trip-card-image-wrapper">
                    <img src={trip.coverImage || '/assets/default-cover.jpg'} alt={trip.name} />
                    <IonButton fill="clear" color="light" className="trip-card-ellipsis" onClick={(e) => { e.stopPropagation(); openBoardActions(trip) }}>
                      <IonIcon icon={ellipsisVertical} />
                    </IonButton>
                    <div className="trip-card-overlay">
                      <h3 className="trip-card-title">{trip.name}</h3>
                      <p className="trip-card-subtitle">Last Edited: {formatDate(trip.lastEdited)}</p>
                    </div>
                  </div>
                </IonCard>
              ))}
              <IonActionSheet
                isOpen={actionSheetOpen}
                onDidDismiss={closeActionSheet}
                buttons={[
                  { text: 'Delete canvas', role: 'destructive', icon: trash, handler: handleDelete },
                  { text: 'Share trip', icon: shareSocial, handler: handleShare },
                  { text: 'Change cover image', icon: image, handler: handleChangeCover },
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

