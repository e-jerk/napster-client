import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { applyThemeAttr, readTheme } from './lib/theme'

applyThemeAttr(readTheme())

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
