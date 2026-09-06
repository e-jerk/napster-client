export type Theme = 'windows' | 'mac'

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem('napster-theme')
    if (stored === 'windows' || stored === 'mac') return stored
  } catch {
    /* ignore */
  }
  return 'mac'
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem('napster-theme', theme)
  } catch {
    /* ignore */
  }
}

export function applyThemeAttr(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}
