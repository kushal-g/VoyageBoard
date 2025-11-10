import { useState } from "react";
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
  IonList,
  IonItem,
  IonLabel,
} from "@ionic/react";
import {
  chevronBack,
  settingsOutline,
  calendarOutline,
  bulbOutline,
  brushOutline,
  trashOutline,
  textOutline,
  locationOutline,
  carOutline,
  peopleOutline,
} from "ionicons/icons";
import AppStatusBar from "../components/AppStatusBar";
import "./CanvasPage.css";
import Canvas from "./Canvas/Canvas";
import type { TOOL } from "../constants/types";

interface CanvasPageProps {
  tripName?: string;
  lastEdited?: string;
}

export default function CanvasPage({
  tripName: _tripName,
  lastEdited: _lastEdited,
}: CanvasPageProps) {

  // menus are controlled via the global menuController; local state not required
  const [currentTool, setCurrentTool] = useState<TOOL>("DOODLE");

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

  const handleToolChange = (tool: TOOL) => {
    setCurrentTool(tool);
    menuController.close('canvas-tools-menu');
  };

  return (
    <IonPage>
      <AppStatusBar />

      <IonContent id="canvas-main-content" className="canvas-content">
        <div className="canvas-area" />
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
      <IonMenu side="start" type="overlay" contentId="canvas-main-content" menuId="canvas-tools-menu" swipeGesture={true}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Canvas Tools</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="sidebar-content">
          <IonList>
            <IonItem button onClick={() => handleToolChange("DOODLE")} className={currentTool === "DOODLE" ? "tool-active" : ""}>
              <IonIcon icon={brushOutline} slot="start" />
              <IonLabel>Doodle</IonLabel>
            </IonItem>

            <IonItem button onClick={() => handleToolChange("ERASER")} className={currentTool === "ERASER" ? "tool-active" : ""}>
              <IonIcon icon={trashOutline} slot="start" />
              <IonLabel>Eraser</IonLabel>
            </IonItem>

            <IonItem button onClick={() => handleToolChange("TEXT")} className={currentTool === "TEXT" ? "tool-active" : ""} disabled>
              <IonIcon icon={textOutline} slot="start" />
              <IonLabel>Text (Coming Soon)</IonLabel>
            </IonItem>

            <IonItem button onClick={() => handleToolChange("LOCATION_PIN")} className={currentTool === "LOCATION_PIN" ? "tool-active" : ""} disabled>
              <IonIcon icon={locationOutline} slot="start" />
              <IonLabel>Location Pin (Coming Soon)</IonLabel>
            </IonItem>

            <IonItem button onClick={() => handleToolChange("TRANSIT")} className={currentTool === "TRANSIT" ? "tool-active" : ""} disabled>
              <IonIcon icon={carOutline} slot="start" />
              <IonLabel>Transit (Coming Soon)</IonLabel>
            </IonItem>

            <IonItem button onClick={() => handleToolChange("GROUP")} className={currentTool === "GROUP" ? "tool-active" : ""} disabled>
              <IonIcon icon={peopleOutline} slot="start" />
              <IonLabel>Group (Coming Soon)</IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonMenu>

      <Canvas currentTool={currentTool} />

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
