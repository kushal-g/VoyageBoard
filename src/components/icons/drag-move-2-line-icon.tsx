export function DragMove2LineIcon({ className = '' }: { className?: string }) {
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
      <path d="M8 3v6" />
      <path d="M16 3v6" />
      <path d="M8 15v6" />
      <path d="M16 15v6" />
      <path d="M3 8h6" />
      <path d="M15 8h6" />
      <path d="M3 16h6" />
      <path d="M15 16h6" />
    </svg>
  )
}

