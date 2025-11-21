import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: 'default' | 'icon'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  ...props 
}: ButtonProps) {
  const variantClass = variant === 'icon' ? 'button-icon' : 'button-default'
  const sizeClass = `button-${size}`
  
  return (
    <button 
      className={`${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

