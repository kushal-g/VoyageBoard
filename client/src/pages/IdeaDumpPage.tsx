import { useMemo, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent,
  IonTitle, IonPopover, IonList, IonItem, IonLabel, IonInput, IonAlert
} from '@ionic/react'
import { chevronBack, linkOutline, cloudUploadOutline, playCircle, add, trash } from 'ionicons/icons'
import './IdeaDumpPage.css'
import { useHistory } from 'react-router-dom'

type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'upload'
type Status = 'ready' | 'unprocessed'

type Idea = {
  id: string
  title: string
  platform: Platform
  thumb?: string
  status: Status
  link?: string
}

const thumbs = {
  gateway: 'https://images.unsplash.com/photo-1548013146-72479768bada',
  juhu: 'https://images.unsplash.com/photo-1548013146-e7c9e5b2d7b8',
  iskcon: 'https://images.unsplash.com/photo-1610438592283-5fbcf0c4b9f9',
  lalbagh: 'https://images.unsplash.com/photo-1610201315927-9b8a7d4b4f6b',
  taj: 'https://images.unsplash.com/photo-1549893079-842e6d40842a'
}

function platformFromUrl(u: string): Platform {
  try {
    const h = new URL(u).hostname.replace('www.', '')
    if (h.includes('tiktok')) return 'tiktok'
    if (h.includes('instagram')) return 'instagram'
    if (h.includes('facebook')) return 'facebook'
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube'
  } catch {}
  return 'upload'
}

export default function IdeaDumpPage() {
  const history = useHistory()

  const [items, setItems] = useState<Idea[]>([
    { id: '1', title: 'Gateway of India', platform: 'tiktok', thumb: thumbs.gateway, status: 'ready' },
    { id: '2', title: 'Juhu Beach', platform: 'instagram', thumb: thumbs.juhu, status: 'ready' },
    { id: '3', title: 'ISKCON - Bangalore', platform: 'upload', thumb: thumbs.iskcon, status: 'ready' },
    { id: '4', title: 'Lalbagh Botanical Garden', platform: 'tiktok', thumb: thumbs.lalbagh, status: 'ready' },
    { id: '5', title: 'Taj Hotel', platform: 'facebook', thumb: thumbs.taj, status: 'ready' }
  ])

  const [linkValue, setLinkValue] = useState('')
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)
  const tripTitle = "Idea Dump"

  const hasUnprocessed = items.some(i => i.status === 'unprocessed')

  function handleBack() {
    if (hasUnprocessed) setShowLeaveAlert(true)
    else history.goBack()
  }

  function addFromLink() {
    if (!linkValue.trim()) return
    const url = linkValue.trim()
    const p = platformFromUrl(url)
    const id = Math.random().toString(36).slice(2)

    setItems(prev => [
      { id, title: 'Unprocessed', platform: p, status: 'unprocessed', link: url },
      ...prev
    ])

    setLinkValue('')
  }

  function onFileUpload(files: FileList | null) {
    if (!files || !files[0]) return
    const f = files[0]
    const id = Math.random().toString(36).slice(2)

    setItems(prev => [
      { id, title: f.name, platform: 'upload', status: 'unprocessed' },
      ...prev
    ])
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function processIdeas() {
    const queue = items.filter(i => i.status === 'unprocessed')

    if (queue.length === 0) return

    const updated: Idea[] = []

    for (const item of queue) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
          method: "POST",
          headers: { 'Content-type': 'application/json' },
          body: JSON.stringify({
            url: item.link,
            extractPlaces: true
          })
        })
        const body = await response.json()

        updated.push({
          ...item,
          title: body.title || "Processed",
          thumb: body.thumbnail || item.thumb,
          status: "ready"
        })
      } catch {
        updated.push({ ...item, title: "Processed", status: "ready" })
      }
    }

    const finalSet = items.map(i => updated.find(u => u.id === i.id) || i)
    setItems(finalSet)
  }

  return (
    <IonPage className="idea-dump-page">

      <IonHeader className="id-header">
        <div className="id-header-left">
          <IonButton fill="clear" className="id-back-btn" onClick={handleBack}>
            <IonIcon icon={chevronBack} />
          </IonButton>
        </div>

        <div className="id-header-center">
          <div className="id-header-title">{tripTitle}</div>
          <div className="id-header-subtitle">{items.length} Items</div>
        </div>

        <div className="id-header-right">
          <IonButton id="process-trigger" className="id-pill" onClick={processIdeas}>
            <span>Process Ideas</span>
            <IonIcon icon={playCircle} />
          </IonButton>

          <IonButton id="add-trigger" className="id-circle-btn">
            <IonIcon icon={add} />
          </IonButton>
        </div>
      </IonHeader>

      <IonContent className="id-content">

        <div className="id-grid">
          {items.map(card => (
            <div key={card.id} className="id-card">

              <IonButton fill="clear" className="id-delete-btn" onClick={() => deleteItem(card.id)}>
                <IonIcon icon={trash} />
              </IonButton>

              {card.status === 'ready' && (
                <>
                  <div className="id-thumb" style={{ backgroundImage: `url(${card.thumb})` }} />
                  <div className="id-gradient" />
                  <div className="id-meta">
                    <div className="id-title-text">{card.title}</div>
                    <div className="id-platform">
                      {card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}
                    </div>
                  </div>
                </>
              )}

              {card.status === 'unprocessed' && (
                <div className="id-unprocessed">
                  <IonIcon icon={playCircle} className="id-play" />
                  <div className="id-meta">
                    <div className="id-title-text">Unprocessed</div>
                    <div className="id-platform">
                      {card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <IonPopover trigger="add-trigger" triggerAction="click" className="id-pop">
          <div className="id-pop-inner">
            <div className="id-input">
              <IonIcon icon={linkOutline} />
              <IonInput
                placeholder="Insert Link"
                value={linkValue}
                onIonChange={(e) => setLinkValue(e.detail.value || '')}
              />
              <IonButton className="id-input-btn" onClick={addFromLink}>Add</IonButton>
            </div>

            <label className="id-upload">
              <IonIcon icon={cloudUploadOutline} />
              <IonLabel>Upload File</IonLabel>
              <span>Image / Video</span>
              <input type="file" accept="image/*,video/*" onChange={(e) => onFileUpload(e.target.files)} />
            </label>
          </div>
        </IonPopover>

        <IonAlert
          isOpen={showLeaveAlert}
          onDidDismiss={() => setShowLeaveAlert(false)}
          header="Unprocessed Items"
          message="You uploaded new links. Process them before returning to Canvas?"
          buttons={[
            { text: "Cancel", role: "cancel" },
            { text: "Leave Anyway", handler: () => history.goBack() }
          ]}
        />

      </IonContent>
    </IonPage>
  )
}