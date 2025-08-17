'use client'

import { useTheme } from '@/hooks/use-theme'

// Icon components for better performance than external deps
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  )
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
      />
    </svg>
  )
}

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown'
  size?: 'sm' | 'md' | 'lg'
}

export function ThemeToggle({ variant = 'button', size = 'md' }: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme()

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const buttonSizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          aria-label="Select theme"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return <MonitorIcon className={iconSizes[size]} />
    }
    return actualTheme === 'dark' 
      ? <MoonIcon className={iconSizes[size]} />
      : <SunIcon className={iconSizes[size]} />
  }

  const getAriaLabel = () => {
    if (theme === 'system') {
      return `Current theme: System (${actualTheme}). Click to switch to light mode.`
    }
    return theme === 'dark' 
      ? 'Current theme: Dark. Click to switch to system preference.'
      : 'Current theme: Light. Click to switch to dark mode.'
  }

  return (
    <button
      onClick={cycleTheme}
      className={`
        ${buttonSizes[size]}
        bg-secondary text-secondary-foreground
        hover:bg-secondary/80 
        border border-border
        rounded-md 
        transition-colors 
        duration-200
        flex items-center space-x-2
        focus:outline-none 
        focus:ring-2 
        focus:ring-ring 
        focus:ring-offset-2
      `}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {getCurrentIcon()}
      <span className="sr-only">
        Toggle theme
      </span>
    </button>
  )
}