import "./ActionBar.css";
import { IonIcon } from "@ionic/react";
import {
  locationOutline,
  analyticsOutline,
  createOutline,
  eraserOutline,
  albumsOutline,
} from "ionicons/icons";

type ActionBarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ActionBar({ isOpen, onClose }: ActionBarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="actionbar-backdrop" onClick={onClose} />}

      <div className={`actionbar ${isOpen ? "open" : ""}`}>
        <div className="actionbar-menu">
          <button className="action-item">
            <IonIcon icon={locationOutline} className="action-icon" />
            <span className="action-label">Add Location</span>
          </button>

          <button className="action-item">
            <IonIcon icon={analyticsOutline} className="action-icon" />
            <span className="action-label">Distance Measure</span>
          </button>

          <button className="action-item">
            <IonIcon icon={createOutline} className="action-icon" />
            <span className="action-label">Doodle</span>
          </button>

          <button className="action-item">
            <IonIcon icon={eraserOutline} className="action-icon" />
            <span className="action-label">Eraser</span>
          </button>

          <button className="action-item">
            <IonIcon icon={albumsOutline} className="action-icon" />
            <span className="action-label">Group Days</span>
          </button>
        </div>
      </div>
    </>
  );
}