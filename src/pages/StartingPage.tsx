import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/react';
import { chevronForward } from 'ionicons/icons';
import AppStatusBar from '../components/AppStatusBar';
import logo from '../assets/voyageboard-logo.png';
import './StartingPage.css';

export default function StartingPage() {
  return (
    <IonPage>
      <AppStatusBar />
      <IonContent className="starting-content">
        <div className="starting-page">
          <img src={logo} alt="VoyageBoard" className="app-icon" />
          <IonButton routerLink="/home" className="get-started-btn" color="medium" fill="outline" shape="round">
            Get Started
            <IonIcon icon={chevronForward} slot="end" />
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}


