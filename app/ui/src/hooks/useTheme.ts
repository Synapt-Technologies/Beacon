import { useState } from 'react'

export enum Theme {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark'
}

const KEY = 'beacon-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme | null>(
    () => Theme[localStorage.getItem(KEY) as keyof typeof Theme] ?? Theme.Auto
  )

  const setTheme = (t: Theme) => {
    localStorage.setItem(KEY, t)
    if (t === Theme.Auto) delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
    setThemeState(t)
  }

  return { theme, setTheme }
}
