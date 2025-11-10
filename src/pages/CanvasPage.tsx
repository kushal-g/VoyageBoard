import { } from "react";
import { menuController } from '@ionic/core';
import { useParams, useLocation } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonText,
  IonMenu,
  IonFab,
  IonFabButton,
} from "@ionic/react";
import { chevronBack, settingsOutline, calendarOutline, bulbOutline, menuOutline } from "ionicons/icons";
import AppStatusBar from "../components/AppStatusBar";
import "./CanvasPage.css";
import Canvas from "./Canvas/Canvas";

interface CanvasPageProps {
  tripName?: string;
  lastEdited?: string;
}

export default function CanvasPage({
  tripName: _tripName,
  lastEdited: _lastEdited,
}: CanvasPageProps) {

  // menus are controlled via the global menuController; local state not required

  const params = useParams<{ id?: string }>();
  const location = useLocation<{ trip?: { name?: string; lastEdited?: string } } | undefined>();

  const routeTrip = location.state?.trip;
  const tripId = params.id;
  const tripName = routeTrip?.name ?? (_tripName ? _tripName : tripId ? `Trip Board ${tripId}` : 'Trip Board');

  // Ensure lastEdited is always a string
  const rawLastEdited: any = routeTrip?.lastEdited ?? _lastEdited;
  const lastEdited = typeof rawLastEdited === 'string'
    ? rawLastEdited
    : rawLastEdited instanceof Date
      ? rawLastEdited.toLocaleString()
      : new Date().toLocaleString();

  return (
    <IonPage>
      <AppStatusBar />

      <IonContent id="canvas-main-content" className="canvas-content">
        <div className="canvas-area" />

        {/* Floating Action Button to open left sidebar */}
        <IonFab vertical="bottom" horizontal="start" slot="fixed">
          <IonFabButton onClick={() => menuController.open('canvas-tools-menu')}>
            <IonIcon icon={menuOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      <IonToolbar className="canvas-header">

        <IonButtons slot="start">
          <IonButton routerLink="/home">
            <IonIcon icon={chevronBack} />
          </IonButton>

          <IonButton onClick={() => menuController.open('canvas-tools-menu')}>
            <IonIcon icon={settingsOutline} />
          </IonButton>
        </IonButtons>

        <IonTitle className="canvas-title-container">
          <div className="canvas-title-block">
            <div className="canvas-title">{tripName}</div>
            <IonText className="canvas-subtitle">Last Edited: {lastEdited}</IonText>
          </div>
        </IonTitle>

        <IonButtons slot="end">
          <IonButton onClick={() => menuController.open('days-sidebar-menu')}>
            <IonIcon icon={calendarOutline} />
          </IonButton>

          <IonButton routerLink="/idea-dump">
            <IonIcon icon={bulbOutline} />
          </IonButton>
        </IonButtons>

      </IonToolbar>
      {/* Left Sidebar: Canvas Tools (IonMenu overlay) */}
      <IonMenu side="start" type="overlay" contentId="canvas-main-content" menuId="canvas-tools-menu">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Tools</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="sidebar-content">
          <IonButton onClick={() => menuController.close('canvas-tools-menu')}>Close</IonButton>
          <h2>TODO: Canvas Actions Menu</h2>
        </IonContent>
      </IonMenu>

      <Canvas currentTool="DOODLE" />

      {/* Right Sidebar: Days List (IonMenu overlay) */}
      <IonMenu side="end" type="overlay" contentId="canvas-main-content" menuId="days-sidebar-menu">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Days</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="sidebar-content">
          <IonButton onClick={() => menuController.close('days-sidebar-menu')}>Close</IonButton>
          <h2>TODO: Days Sidebar</h2>
        </IonContent>
      </IonMenu>

    </IonPage>
  );
}
