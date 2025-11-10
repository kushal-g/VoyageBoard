import { useState, useEffect } from "react";
import { menuController } from "@ionic/core";
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
import { chevronBack, settingsOutline, calendarOutline, bulbOutline } from "ionicons/icons";
import AppStatusBar from "../components/AppStatusBar";
import "./CanvasPage.css";
import Canvas from "./Canvas/Canvas";
import type { TOOL } from "../constants/types";

interface CanvasPageProps {
  tripName?: string;
  lastEdited?: string;
}

export default function CanvasPage(props: CanvasPageProps) {
  const [currentTool, setCurrentTool] = useState<TOOL>("DOODLE");

  useEffect(() => {
    menuController.enable(true, "canvas-tools-menu");
    menuController.enable(true, "days-sidebar-menu");
  }, []);

  const params = useParams<{ id?: string }>();
  const location = useLocation<{ trip?: { name?: string; lastEdited?: string } } | undefined>();

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

  const handleToolChange = (tool: TOOL) => {
    setCurrentTool(tool);
    menuController.close("canvas-tools-menu");
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

          <IonButton onClick={() => menuController.open("canvas-tools-menu")}>
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
          <IonButton onClick={() => menuController.open("days-sidebar-menu")}>
            <IonIcon icon={calendarOutline} />
          </IonButton>

          <IonButton routerLink="/idea-dump">
            <IonIcon icon={bulbOutline} />
          </IonButton>
        </IonButtons>
      </IonToolbar>

      <Canvas currentTool={currentTool} />
    </IonPage>
  );
}
