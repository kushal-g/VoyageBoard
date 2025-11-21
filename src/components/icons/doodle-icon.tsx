export function DoodleIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 12c2-2 4-1 6 1s4 3 6 1" />
      <path d="M7 8c1-1 2-0.5 3 0.5s2 1.5 3 0.5" />
      <path d="M11 14c1-1 2-0.5 3 0.5s2 1.5 3 0.5" />
      <path d="M15 10c1-1 2-0.5 3 0.5s2 1.5 3 0.5" />
    </svg>
  )
}

