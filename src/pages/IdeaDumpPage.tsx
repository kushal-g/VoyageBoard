import { useMemo, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent,
  IonTitle, IonText, IonPopover, IonList, IonItem, IonLabel, IonInput
} from '@ionic/react'
import { chevronBack, linkOutline, cloudUploadOutline, playCircle } from 'ionicons/icons'
import './IdeaDumpPage.css'

type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'upload'
type Status = 'ready' | 'unprocessed'

type Idea = {
  id: string
  title: string
  platform: Platform
  thumb?: string
  status: Status
}

const thumbs = {
  gateway: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1600&auto=format&fit=crop',
  juhu: 'https://images.unsplash.com/photo-1548013146-e7c9e5b2d7b8?q=80&w=1600&auto=format&fit=crop',
  iskcon: 'https://images.unsplash.com/photo-1610438592283-5fbcf0c4b9f9?q=80&w=1600&auto=format&fit=crop',
  lalbagh: 'https://images.unsplash.com/photo-1610201315927-9b8a7d4b4f6b?q=80&w=1600&auto=format&fit=crop',
  taj: 'https://images.unsplash.com/photo-1549893079-842e6d40842a?q=80&w=1600&auto=format&fit=crop'
}

function platformFromUrl(u: string): Platform {
  try {
    const h = new URL(u).hostname.replace('www.','')
    if (h.includes('tiktok')) return 'tiktok'
    if (h.includes('instagram')) return 'instagram'
    if (h.includes('facebook')) return 'facebook'
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube'
  } catch {}
  return 'upload'
}

export default function IdeaDumpPage() {
  const [items, setItems] = useState<Idea[]>([
    { id: '1', title: 'Gateway of India', platform: 'tiktok', thumb: thumbs.gateway, status: 'ready' },
    { id: '2', title: 'Juhu Beach', platform: 'instagram', thumb: thumbs.juhu, status: 'ready' },
    { id: '3', title: 'ISKCON - Bangalore', platform: 'upload', thumb: thumbs.iskcon, status: 'ready' },
    { id: '4', title: 'Lalbagh Botanical Garden', platform: 'tiktok', thumb: thumbs.lalbagh, status: 'ready' },
    { id: '5', title: 'Taj Hotel', platform: 'facebook', thumb: thumbs.taj, status: 'ready' }
  ])
  const [tripTitle] = useState('Idea Dump - Road Trip')
  const [linkValue, setLinkValue] = useState('')
  const count = useMemo(() => items.length, [items])

  function addFromLink() {
    const url = linkValue.trim()
    if (!url) return
    const p = platformFromUrl(url)
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [{ id, title: 'Unprocessed', platform: p, status: 'unprocessed' }, ...prev])
    setLinkValue('')
  }

  function onFileUpload(files: FileList | null) {
    if (!files || !files[0]) return
    const f = files[0]
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [{ id, title: f.name || 'Upload', platform: 'upload', status: 'unprocessed' }, ...prev])
  }

  return (
    <IonPage>
      <IonHeader className="canvas-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton routerLink="/home">
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>

          <IonTitle className="canvas-title-container">
            <div className="canvas-title-block">
              <div className="canvas-title">{tripTitle}</div>
              <IonText className="canvas-subtitle">{count} Items</IonText>
            </div>
          </IonTitle>

          <IonButtons slot="end">
            <IonButton id="process-trigger" className="process-pill">
              <span>Process Ideas</span>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="canvas-content">
        <div className="id-grid">
          {items.map(card => (
            <div key={card.id} className="id-card">
              {card.status === 'ready' && (
                <>
                  <div className="id-thumb" style={{ backgroundImage: `url(${card.thumb})` }} />
                  <div className="id-gradient" />
                  <div className="id-meta">
                    <div className="id-title-text">{card.title}</div>
                    <div className="id-platform">{card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}</div>
                  </div>
                </>
              )}
              {card.status === 'unprocessed' && (
                <div className="id-unprocessed">
                  <IonIcon icon={playCircle} className="id-play" />
                  <div className="id-meta">
                    <div className="id-title-text">Unprocessed</div>
                    <div className="id-platform">{card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <IonPopover trigger="process-trigger" triggerAction="click" className="id-pop">
          <div className="id-pop-inner">
            <div className="id-input">
              <IonIcon icon={linkOutline} />
              <IonInput
                placeholder="Insert Link"
                value={linkValue}
                onIonChange={(e) => setLinkValue(e.detail.value || '')}
              />
              <IonButton onClick={addFromLink}>Add</IonButton>
            </div>

            <label className="id-upload">
              <IonIcon icon={cloudUploadOutline} />
              <IonLabel>Upload File</IonLabel>
              <span>Image / Video</span>
              <input type="file" accept="image/*,video/*" onChange={(e) => onFileUpload(e.target.files)} />
            </label>
          </div>
        </IonPopover>
      </IonContent>
    </IonPage>
  )
}