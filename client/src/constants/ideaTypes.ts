export type IdeaPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'upload'

export type IdeaStatus = 'unprocessed' | 'processing' | 'ready'

export interface Idea {
  id: string
  url?: string
  platform: IdeaPlatform
  title: string
  subtitle?: string
  thumbnailUrl?: string
  createdAt: string
  status: IdeaStatus
}
