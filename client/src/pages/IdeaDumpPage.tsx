import { useState } from 'react'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonTitle,
  IonPopover,
  IonLabel,
  IonInput,
  IonAlert,
  IonText
} from '@ionic/react'
import { chevronBack, linkOutline, cloudUploadOutline, playCircle, add, trash } from 'ionicons/icons'
import './IdeaDumpPage.css'
import { useHistory, useLocation } from 'react-router-dom'

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
  const location = useLocation<{ trip?: { name?: string; lastEdited?: string } } | undefined>()
  const trip = location.state?.trip

  const [items, setItems] = useState<Idea[]>([])
  const [linkValue, setLinkValue] = useState('')
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)

  const hasUnprocessed = items.some(i => i.status === 'unprocessed')
  const pageTitle = trip?.name ? `Ideas for ${trip.name}` : 'Idea Dump'
  const subtitleText = `${items.length} item${items.length === 1 ? '' : 's'}`

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
    const fileUrl = URL.createObjectURL(f)

    setItems(prev => [
      { id, title: f.name, platform: 'upload', status: 'unprocessed', link: fileUrl },
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
          method: 'POST',
          headers: { 'Content-type': 'application/json' },
          body: JSON.stringify({
            url: item.link,
            extractPlaces: true
          })
        })
        const body = await response.json()

        updated.push({
          ...item,
          title: body.title || 'Processed',
          status: 'ready'
        })
      } catch {
        updated.push({
          ...item,
          title: 'Processed',
          status: 'ready'
        })
      }
    }

    const finalSet = items.map(i => updated.find(u => u.id === i.id) || i)
    setItems(finalSet)
  }

  return (
    <IonPage className="idea-dump-page">
      <IonHeader>
        <IonToolbar className="canvas-header">
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={handleBack}>
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>

          <IonTitle className="canvas-title-container">
            <div className="canvas-title-block">
              <div className="canvas-title">{pageTitle}</div>
              <IonText className="canvas-subtitle">
                {subtitleText}
                {trip?.lastEdited ? ` • Last Edited: ${trip.lastEdited}` : ''}
              </IonText>
            </div>
          </IonTitle>

          <IonButtons slot="end">
            <IonButton className="id-pill" onClick={processIdeas}>
              <span>Process Ideas</span>
              <IonIcon icon={playCircle} />
            </IonButton>

            <IonButton id="add-trigger" className="id-circle-btn">
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="id-content">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No ideas yet</p>
            <p className="empty-secondary">
              Upload your first inspiration link to get started.
            </p>
          </div>
        ) : (
          <div className="id-grid">
            {items.map(card => (
              <div
                key={card.id}
                className="id-card"
                onClick={() => {
                  if (card.link) window.open(card.link, '_blank')
                }}
              >
                <IonButton
                  fill="clear"
                  className="id-delete-btn"
                  onClick={e => {
                    e.stopPropagation()
                    deleteItem(card.id)
                  }}
                >
                  <IonIcon icon={trash} />
                </IonButton>

                <div
                  className="id-thumb"
                  style={{ backgroundColor: '#000' }}
                />
                <div className="id-gradient" />
                <div className="id-meta">
                  <div className="id-title-text">
                    {card.status === 'unprocessed' ? 'Unprocessed' : card.title}
                  </div>
                  <div className="id-platform">
                    {card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <IonPopover trigger="add-trigger" triggerAction="click" className="id-pop">
          <div className="id-pop-inner">
            <div className="id-input-row">
              <IonIcon icon={linkOutline} className="id-input-icon" />
              <IonInput
                placeholder="Insert link"
                value={linkValue}
                onIonChange={e => setLinkValue(e.detail.value || '')}
              />
              <IonButton className="id-input-btn" onClick={addFromLink}>
                Add
              </IonButton>
            </div>

            <label className="id-upload-row">
              <IonIcon icon={cloudUploadOutline} className="id-upload-icon" />
              <span className="id-upload-label">Upload file</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={e => onFileUpload(e.target.files)}
              />
            </label>
          </div>
        </IonPopover>

        <IonAlert
          isOpen={showLeaveAlert}
          onDidDismiss={() => setShowLeaveAlert(false)}
          header="Unprocessed items"
          message="You added new links. Process them before returning to Canvas?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Leave anyway', handler: () => history.goBack() }
          ]}
        />
      </IonContent>
    </IonPage>
  )
}