import { IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonRippleEffect } from '@ionic/react'
import './IdeaCard.css'
import type { Idea } from '../constants/ideaTypes'

interface Props {
  idea: Idea
  onClick?: () => void
}

export default function IdeaCard({ idea, onClick }: Props) {
  return (
    <IonCard className="idea-card ion-activatable" onClick={onClick}>
      <div className="idea-thumb" style={{ backgroundImage: `url(${idea.thumbnailUrl || ''})` }} />
      <IonCardHeader className="idea-card-header">
        <IonCardTitle className="idea-title">{idea.title}</IonCardTitle>
        <IonCardSubtitle className="idea-sub">{idea.subtitle || idea.platform}</IonCardSubtitle>
      </IonCardHeader>
      <IonRippleEffect />
      {idea.status !== 'ready' && <div className={`idea-badge ${idea.status}`}>{idea.status === 'unprocessed' ? 'Unprocessed' : 'Processing'}</div>}
    </IonCard>
  )
}
