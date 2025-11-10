// src/pages/CanvasPage.tsx
import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonText,
} from "@ionic/react";

import { chevronBack, menuOutline, calendarOutline, bulbOutline } from "ionicons/icons";

import AppStatusBar from "../components/AppStatusBar";
import "./CanvasPage.css";

import Canvas from "./Canvas/Canvas";
import type { TOOL } from "../constants/types";

// NEW ActionBar:
import Sidebar from "../components/Sidebar";
import "../components/Sidebar.css";

interface CanvasPageProps {
  tripName?: string;
  lastEdited?: string;
}

export default function CanvasPage(props: CanvasPageProps) {
  const [currentTool, setCurrentTool] = useState<TOOL>("DOODLE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const params = useParams<{ id?: string }>();
  const location =
    useLocation<{ trip?: { name?: string; lastEdited?: string } } | undefined>();

  const routeTrip = location.state?.trip;
  const tripId = params.id;

  const tripName =
    routeTrip?.name ??
    (props.tripName ? props.tripName : tripId ? `Trip Board ${tripId}` : "Trip Board");

  const rawLastEdited: any = routeTrip?.lastEdited ?? props.lastEdited;
  const lastEdited =
    typeof rawLastEdited === "string"
      ? rawLastEdited
      : rawLastEdited instanceof Date
      ? rawLastEdited.toLocaleString()
      : new Date().toLocaleString();

  return (
    <IonPage>
      <AppStatusBar />

      {/* Slide-In Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <Sidebar currentTool={currentTool} setCurrentTool={setCurrentTool} />
      </div>
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Canvas Header */}
      <IonToolbar className="canvas-header">
        <IonButtons slot="start">
          <IonButton routerLink="/home">
            <IonIcon icon={chevronBack} />
          </IonButton>

          <IonButton onClick={() => setIsSidebarOpen(true)}>
            <IonIcon icon={menuOutline} />
          </IonButton>
        </IonButtons>

        <IonTitle className="canvas-title-container">
          <div className="canvas-title-block">
            <div className="canvas-title">{tripName}</div>
            <IonText className="canvas-subtitle">Last Edited: {lastEdited}</IonText>
          </div>
        </IonTitle>

        <IonButtons slot="end">
          <IonButton>
            <IonIcon icon={calendarOutline} />
          </IonButton>

          <IonButton routerLink="/idea-dump">
            <IonIcon icon={bulbOutline} />
          </IonButton>
        </IonButtons>
      </IonToolbar>

      <IonContent className="canvas-content">
        <Canvas currentTool={currentTool} />
      </IonContent>
    </IonPage>
  );
}