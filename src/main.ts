import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { applyThemeAttr, readTheme } from './lib/theme'

const target = document.getElementById('app')

try {
  applyThemeAttr(readTheme())
  if (!target) throw new Error('Missing #app')
  // Svelte mount() appends; leave the HTML splash in place and it covers the desktop.
  target.replaceChildren()
  mount(App, { target })
} catch (err) {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err)
  if (target) {
    target.innerHTML = `<pre style="margin:0;padding:16px;background:#000080;color:#fff;font:12px/1.4 Consolas,monospace;white-space:pre-wrap">Napster failed to start:\n\n${msg.replace(/</g, '&lt;')}</pre>`
  }
}
