// src/pages/CanvasPage.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useHistory } from "react-router-dom";
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
  useIonViewWillEnter,
} from "@ionic/react";
import { chevronBack, menuOutline, calendarOutline, bulbOutline, saveOutline } from "ionicons/icons";
import AppStatusBar from "../components/AppStatusBar";
import "./CanvasPage.css";
import Canvas, { type CanvasHandle } from "./Canvas/Canvas";
import type { TOOL } from "../constants/types";
import type { LocationGroup, LocationPin } from "./Canvas/Canvas";
import CalendarSidebar from "../components/CalendarSidebar/CalendarSidebar";
import Sidebar from "../components/Sidebar";
import "../components/Sidebar.css";

interface CanvasPageProps {
  tripName?: string;
  lastEdited?: string;
}

export default function CanvasPage(props: CanvasPageProps) {
  const [currentTool, setCurrentTool] = useState<TOOL>("DOODLE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tripName, setTripName] = useState<string>("");
  const [lastEdited, setLastEdited] = useState<string>("");
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const historyRouter = useHistory();

  const params = useParams<{ id?: string }>();
  const location =
    useLocation<{
      trip?: { name?: string; lastEdited?: string }
      placesToAdd?: Array<{
        name: string
        placeId?: string
        formattedAddress?: string
        coordinates?: { latitude: number; longitude: number }
      }>
    } | undefined>();

  const routeTrip = location.state?.trip;
  const placesToAdd = location.state?.placesToAdd;
  const tripId = params.id;

  useEffect(() => {
    const storageKey = `canvas_${tripId}_name`;
    const storedName = tripId ? localStorage.getItem(storageKey) : null;

    const initialName =
      routeTrip?.name ??
      (props.tripName ? props.tripName : storedName ?? (tripId ? `Canvas ${tripId}` : "Canvas"));

    setTripName(initialName);

    if (tripId && !storedName) {
      localStorage.setItem(storageKey, initialName);
    }
  }, [tripId, routeTrip?.name, props.tripName]);

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
      const defaultName = tripId ? `Canvas ${tripId}` : "Canvas";
      setTripName(defaultName);
      if (tripId) {
        localStorage.setItem(`canvas_${tripId}_name`, defaultName);
      }
      setIsEditingTitle(false);
      return;
    }

    if (tripId) {
      localStorage.setItem(`canvas_${tripId}_name`, tripName.trim());
    }

    const now = new Date().toLocaleString();
    setLastEdited(now);
    if (tripId) {
      localStorage.setItem(`canvas_${tripId}_lastEdited`, now);
    }

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

  const handleManualSave = () => {
    if (canvasRef.current) {
      setIsSaving(true);
      canvasRef.current.save();
      // Reset saving state after a short delay
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleSaveComplete = () => {
    const now = new Date().toLocaleString();
    setLastEdited(now);
    if (tripId) {
      localStorage.setItem(`canvas_${tripId}_lastEdited`, now);
    }
  };

  // Reload canvas state when navigating back to this page
  useIonViewWillEnter(() => {
    if (canvasRef.current && tripId) {
      console.log('CanvasPage entered, reloading canvas state...')
      canvasRef.current.load()
    }
  }, [tripId]);

  return (
    <IonPage>
      <AppStatusBar />

      <Sidebar currentTool={currentTool} setCurrentTool={setCurrentTool} isOpen={isSidebarOpen} />
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      <IonHeader>
        <IonToolbar className="canvas-header">
          <IonButtons slot="start">
            <IonButton routerLink="/home" routerDirection="back">
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
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to rename"
                >
                  {tripName}
                </div>
              )}
              <IonText className="canvas-subtitle">Last Edited: {lastEdited}</IonText>
            </div>
          </IonTitle>

          <IonButtons slot="end">
            <IonButton
              onClick={handleManualSave}
              disabled={isSaving || !tripId}
              title="Save canvas"
            >
              <IonIcon icon={saveOutline} />
            </IonButton>

            <IonButton onClick={() => setIsCalendarOpen((prev) => !prev)}>
              <IonIcon icon={calendarOutline} />
            </IonButton>

            <IonButton
              onClick={() => historyRouter.push('/idea-dump', {
                trip: { id: tripId, name: tripName, lastEdited: lastEdited }
              })}
            >
              <IonIcon icon={bulbOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="canvas-content">
        <Canvas
          ref={canvasRef}
          currentTool={currentTool}
          onGroupsChange={setGroups}
          onPinsChange={setPins}
          onDeleteGroup={(groupId) => {
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
          }}
          onUpdateGroupLabel={(groupId, newLabel) => {
            setGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, label: newLabel } : g))
            );
          }}
          placesToAdd={placesToAdd}
          tripId={tripId}
          autoSave={true}
          onSaveComplete={handleSaveComplete}
        />
      </IonContent>

      <CalendarSidebar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        groups={groups}
        pins={pins}
        onDeleteGroup={(groupId) => {
          setGroups((prev) => prev.filter((g) => g.id !== groupId));
        }}
        onUpdateGroupLabel={(groupId, newLabel) => {
          setGroups((prev) =>
            prev.map((g) => (g.id === groupId ? { ...g, label: newLabel } : g))
          );
        }}
      />
    </IonPage>
  );
}
