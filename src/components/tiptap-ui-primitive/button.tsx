import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: 'default' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  'data-style'?: 'ghost' | 'default'
  'data-active'?: boolean
}

export function Button({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  'data-style': dataStyle,
  'data-active': dataActive,
  ...props 
}: ButtonProps) {
  const variantClass = variant === 'icon' ? 'button-icon' : 'button-default'
  const sizeClass = `button-${size}`
  
  return (
    <button 
      className={`${variantClass} ${sizeClass} ${className}`}
      data-style={dataStyle}
      data-active={dataActive}
      {...props}
    >
      {children}
    </button>
  )
}

