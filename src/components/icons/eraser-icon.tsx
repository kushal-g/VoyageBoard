export function EraserIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className}
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12l-9-9-4 4 9 9 4-4z" />
      <path d="M12 3l-9 9 4 4 9-9-4-4z" />
      <path d="M8 12l4 4" />
      <path d="M16 20h5" />
    </svg>
  )
}

