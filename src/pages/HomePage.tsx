import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonChip, IonButtons } from '@ionic/react'
import { calendarClearOutline, add } from 'ionicons/icons'
import { useState } from 'react'
import AppStatusBar from '../components/AppStatusBar'
import './HomePage.css'

interface TripBoard {
  id: string
  name: string
  createdAt: Date
}

const HomePage = () => {
  const [tripBoards, setTripBoards] = useState<TripBoard[]>([])

  const createNewTripboard = () => {
    const newBoard: TripBoard = {
      id: Date.now().toString(),
      name: `Trip Board ${tripBoards.length + 1}`,
      createdAt: new Date(),
    }
    setTripBoards([...tripBoards, newBoard])
  }

  return (
    <IonPage>
      <AppStatusBar />
      <IonHeader>
        <IonToolbar>
          <IonTitle>Home</IonTitle>
          <IonButtons slot="end">
            <IonChip outline onClick={createNewTripboard} className="create-chip">
              Create new tripboard
              <IonIcon icon={add} />
            </IonChip>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="home-content">
        <div className="home-page">
          <h2 className="subtitle">Welcome to VoyageBoard!</h2>
          {tripBoards.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={calendarClearOutline} className="empty-icon" />
              <p>No trips yet</p>
            </div>
          ) : (
            <div className="tripboards-list">
              {tripBoards.map((board) => (
                <div key={board.id} className="tripboard-item">
                  {board.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default HomePage

