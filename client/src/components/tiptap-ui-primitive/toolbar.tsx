import type { ReactNode } from 'react'

interface ToolbarProps {
  variant?: 'floating' | 'default'
  children: ReactNode
  className?: string
}

interface ToolbarGroupProps {
  children: ReactNode
  className?: string
}

export function Toolbar({ variant = 'default', children, className = '' }: ToolbarProps) {
  const baseClass = variant === 'floating' ? 'toolbar-floating' : 'toolbar-default'
  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  )
}

export function ToolbarGroup({ children, className = '' }: ToolbarGroupProps) {
  return (
    <div className={`toolbar-group-container ${className}`}>
      {children}
    </div>
  )
}

