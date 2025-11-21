// src/pages/CanvasPage.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useHistory } from "react-router-dom";
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

// Sidebar Component
import Sidebar from "../components/Sidebar";
import "../components/Sidebar.css";

interface CanvasPageProps {
  tripName?: string;
  lastEdited?: string;
}

export default function CanvasPage(props: CanvasPageProps) {
  const [currentTool, setCurrentTool] = useState<TOOL>("DOODLE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tripName, setTripName] = useState<string>("");
  const [lastEdited, setLastEdited] = useState<string>("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const historyRouter = useHistory();

  const params = useParams<{ id?: string }>();
  const location =
    useLocation<{ trip?: { name?: string; lastEdited?: string } } | undefined>();

  const routeTrip = location.state?.trip;
  const tripId = params.id;

  // Initialize trip name from route, props, localStorage, or default
  useEffect(() => {
    const storageKey = `canvas_${tripId}_name`;
    const storedName = tripId ? localStorage.getItem(storageKey) : null;
    
    const initialName =
      routeTrip?.name ??
      (props.tripName ? props.tripName : storedName ?? (tripId ? `Canvas ${tripId}` : "Canvas"));
    
    setTripName(initialName);
    
    // Store in localStorage if we have an ID
    if (tripId && !storedName) {
      localStorage.setItem(storageKey, initialName);
    }
  }, [tripId, routeTrip?.name, props.tripName]);

  // Initialize last edited
  useEffect(() => {
    const storageKey = `canvas_${tripId}_lastEdited`;
    const storedLastEdited = tripId ? localStorage.getItem(storageKey) : null;
    
    const rawLastEdited: any = routeTrip?.lastEdited ?? props.lastEdited ?? storedLastEdited;
    const formattedLastEdited =
      typeof rawLastEdited === "string"
        ? rawLastEdited
        : rawLastEdited instanceof Date
        ? rawLastEdited.toLocaleString()
        : new Date().toLocaleString();
    
    setLastEdited(formattedLastEdited);
  }, [tripId, routeTrip?.lastEdited, props.lastEdited]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripName(e.target.value);
  };

  const handleTitleBlur = () => {
    saveTitle();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    } else if (e.key === "Escape") {
      // Revert to original name
      const storageKey = `canvas_${tripId}_name`;
      const storedName = tripId ? localStorage.getItem(storageKey) : null;
      const originalName =
        routeTrip?.name ??
        (props.tripName ? props.tripName : storedName ?? (tripId ? `Canvas ${tripId}` : "Canvas"));
      setTripName(originalName);
      setIsEditingTitle(false);
    }
  };

  const saveTitle = () => {
    if (!tripName.trim()) {
      // Revert to default if empty
      const defaultName = tripId ? `Canvas ${tripId}` : "Canvas";
      setTripName(defaultName);
      if (tripId) {
        localStorage.setItem(`canvas_${tripId}_name`, defaultName);
      }
      setIsEditingTitle(false);
      return;
    }

    // Save to localStorage
    if (tripId) {
      localStorage.setItem(`canvas_${tripId}_name`, tripName.trim());
    }

    // Update last edited timestamp
    const now = new Date().toLocaleString();
    setLastEdited(now);
    if (tripId) {
      localStorage.setItem(`canvas_${tripId}_lastEdited`, now);
    }

    // Update route state if available
    if (routeTrip) {
      historyRouter.replace(`/canvas/${tripId}`, {
        trip: {
          ...routeTrip,
          name: tripName.trim(),
          lastEdited: new Date(),
        },
      });
    }

    setIsEditingTitle(false);
  };

  return (
    <IonPage>
      <AppStatusBar />

      {/* Slide-In Sidebar */}
      <Sidebar currentTool={currentTool} setCurrentTool={setCurrentTool} isOpen={isSidebarOpen} />
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Canvas Header */}
      <IonToolbar className="canvas-header">
        <IonButtons slot="start">
          <IonButton routerLink="/home">
            <IonIcon icon={chevronBack} />
          </IonButton>

          <IonButton onClick={() => setIsSidebarOpen((prev) => !prev)}>
            <IonIcon icon={menuOutline} />
          </IonButton>
        </IonButtons>

        <IonTitle className="canvas-title-container">
          <div className="canvas-title-block">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={tripName}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="canvas-title-input"
              />
            ) : (
              <div 
                className="canvas-title" 
                onClick={handleTitleClick}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to rename"
              >
                {tripName}
              </div>
            )}
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