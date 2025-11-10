import { useMemo, useState } from 'react'
import { IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonText, IonPopover, IonList, IonItem, IonInput, IonLabel, IonBadge, IonGrid, IonRow, IonCol } from '@ionic/react'
import { chevronBack, add, funnelOutline, sparklesOutline, globeOutline, cloudUploadOutline, linkOutline } from 'ionicons/icons'
import AppStatusBar from '../components/AppStatusBar'
import IdeaCard from '../components/IdeaCard'
import type { Idea, IdeaPlatform } from '../constants/ideaTypes'
import './IdeaDumpPage.css'

const thumb = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop'

function parsePlatform(u: string): IdeaPlatform {
  try {
    const h = new URL(u).hostname.replace('www.','')
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube'
    if (h.includes('tiktok.com')) return 'tiktok'
    if (h.includes('instagram.com')) return 'instagram'
    if (h.includes('facebook.com')) return 'facebook'
  } catch {}
  return 'upload'
}

export default function IdeaDumpPage() {
  const [items, setItems] = useState<Idea[]>([])
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [filter, setFilter] = useState<'all' | IdeaPlatform | 'unprocessed' | 'processing'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'unprocessed' || filter === 'processing') return items.filter(i => i.status === filter)
    return items.filter(i => i.platform === filter)
  }, [items, filter])

  function addLink(url: string) {
    const p = parsePlatform(url)
    const id = Math.random().toString(36).slice(2)
    const title = p === 'upload' ? 'Uploaded Media' : url.split('/').slice(-1)[0] || p
    const it: Idea = { id, url, platform: p, title, thumbnailUrl: thumb, createdAt: new Date().toISOString(), status: 'unprocessed' }
    setItems(prev => [it, ...prev])
  }

  return (
    <IonPage>
      <AppStatusBar />
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton routerLink="/home">
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>Idea Dump</IonTitle>
          <IonButtons slot="end">
            <IonButton id="process-btn">
              <IonIcon icon={sparklesOutline} />
              <IonText className="btn-text">Process Ideas</IonText>
            </IonButton>
            <IonButton id="add-btn">
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="idea-content">
        <div className="subheader">
          <IonText className="muted">{items.length} Items</IonText>
          <div className="filters">
            <IonButton fill={filter==='all'?'solid':'outline'} size="small" onClick={()=>setFilter('all')}>All</IonButton>
            <IonButton fill={filter==='tiktok'?'solid':'outline'} size="small" onClick={()=>setFilter('tiktok')}>TikTok</IonButton>
            <IonButton fill={filter==='youtube'?'solid':'outline'} size="small" onClick={()=>setFilter('youtube')}>YouTube</IonButton>
            <IonButton fill={filter==='instagram'?'solid':'outline'} size="small" onClick={()=>setFilter('instagram')}>Instagram</IonButton>
            <IonButton fill={filter==='facebook'?'solid':'outline'} size="small" onClick={()=>setFilter('facebook')}>Facebook</IonButton>
            <IonButton fill={filter==='unprocessed'?'solid':'outline'} size="small" onClick={()=>setFilter('unprocessed')}>Unprocessed</IonButton>
          </div>
        </div>

        <IonGrid className="idea-grid">
          <IonRow>
            {filtered.map(i=>(
              <IonCol key={i.id} size="12" sizeMd="6" sizeLg="4" className="idea-col">
                <IdeaCard idea={i} />
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonPopover trigger="add-btn" triggerAction="click">
        <div className="add-popover">
          <IonList>
            <IonItem lines="none">
              <IonIcon icon={linkOutline} slot="start" />
              <IonInput placeholder="Insert Link" value={linkValue} onIonChange={e=>setLinkValue(e.detail.value || '')} />
              <IonButton onClick={()=>{ if(linkValue.trim()) { addLink(linkValue.trim()); setLinkValue(''); setLinkOpen(false) }}}>Add</IonButton>
            </IonItem>
            <IonItem lines="none">
              <IonIcon icon={cloudUploadOutline} slot="start" />
              <IonLabel>Upload File</IonLabel>
              <input type="file" accept="image/*,video/*" className="hidden-file" onChange={(e)=>{ const f=e.target.files?.[0]; if(f){ const id=Math.random().toString(36).slice(2); const it: Idea={ id, platform:'upload', title:f.name, thumbnailUrl:thumb, createdAt:new Date().toISOString(), status:'unprocessed' }; setItems(prev=>[it,...prev]); e.currentTarget.value='' }}} />
            </IonItem>
          </IonList>
        </div>
      </IonPopover>
    </IonPage>
  )
}
