import { IonPage, IonContent, IonChip, IonIcon } from '@ionic/react'
import { chevronForward } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import AppStatusBar from '../components/AppStatusBar'
import appIcon from '../assets/voyageboard-high-resolution-logo-grayscale-transparent (1).png'
import './StartingPage.css'

const StartingPage = () => {
  const history = useHistory()

  const handleGetStarted = () => {
    history.push('/home')
  }

  return (
    <IonPage>
      <AppStatusBar />
      <IonContent className="starting-content" fullscreen>
        <div className="starting-page">
          <img src={appIcon} alt="VoyageBoard" className="app-icon" />
          <IonChip outline onClick={handleGetStarted} className="get-started-chip">
            Get Started
            <IonIcon icon={chevronForward} />
          </IonChip>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default StartingPage

