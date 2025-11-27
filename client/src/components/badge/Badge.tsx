import './Badge.css'

interface BadgeProps {
  text: string
  color: string
  className?: string
}

export function Badge({ text, color, className = '' }: BadgeProps) {
  // Convert color to muted version
  const getMutedColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    // Lighten by mixing with white (60% white, 40% original)
    const lightenFactor = 0.6
    const mutedR = Math.round(r + (255 - r) * lightenFactor)
    const mutedG = Math.round(g + (255 - g) * lightenFactor)
    const mutedB = Math.round(b + (255 - b) * lightenFactor)
    
    return `rgb(${mutedR}, ${mutedG}, ${mutedB})`
  }

  const mutedBgColor = getMutedColor(color)

  return (
    <div 
      className={`location-badge ${className}`}
      style={{
        backgroundColor: mutedBgColor,
        color: color,
        borderColor: color,
      }}
    >
      {text}
    </div>
  )
}

