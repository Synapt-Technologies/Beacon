import { useState } from 'react'

export type Theme = 'auto' | 'light' | 'dark'

const KEY = 'beacon-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(KEY) as Theme | null) ?? 'auto'
  )

  const setTheme = (t: Theme) => {
    localStorage.setItem(KEY, t)
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
    setThemeState(t)
  }

  return { theme, setTheme }
}
