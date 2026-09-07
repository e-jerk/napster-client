<script lang="ts">
  import {
    closeChrome,
    cmdAbout,
    cmdAddHot,
    cmdBridge,
    cmdConnect,
    cmdDisconnect,
    cmdExit,
    cmdFeedback,
    cmdHelp,
    cmdIgnoreList,
    cmdIM,
    cmdJoinRooms,
    cmdLogonServer,
    cmdPreferences,
    cmdShop,
    cmdUserInfo,
    cmdView,
  } from '../lib/commands'
  import { HELP_FAQ, HELP_MANUAL, VIEW_ITEMS } from '../lib/menus'
  import { app, setTheme } from '../lib/session.svelte'

  let {
    which,
    top = '44px',
    left = '8px',
  }: {
    which: string
    top?: string
    left?: string
  } = $props()
</script>

{#if which === 'file'}
  <div class="menu-pop" style:top style:left>
    <button onclick={() => cmdConnect()}>Connect</button>
    <button disabled={!app.connected} onclick={() => cmdDisconnect()}>Disconnect</button>
    <div class="sep"></div>
    <button onclick={() => cmdPreferences()}>Preferences</button>
    <div class="sep"></div>
    <button onclick={() => cmdExit()}>Exit</button>
  </div>
{:else if which === 'view'}
  <div class="menu-pop" style:top style:left>
    {#each VIEW_ITEMS as t (t.id)}
      <button class:chk={app.view === t.id} onclick={() => cmdView(t.id)}>
        <span>{t.label}</span>
        <em>{t.shortcut}</em>
      </button>
    {/each}
    <div class="sep"></div>
    <button class:chk={app.theme === 'windows'} onclick={() => { setTheme('windows'); closeChrome() }}>Windows 98 look</button>
    <button class:chk={app.theme === 'mac'} onclick={() => { setTheme('mac'); closeChrome() }}>Mac OS X look</button>
  </div>
{:else if which === 'actions'}
  <div class="menu-pop" style:top style:left>
    <button disabled={!app.connected} onclick={() => cmdIM()}>Instant Message</button>
    <button disabled={!app.connected} onclick={() => cmdAddHot()}>Add User to Hot List</button>
    <button disabled={!app.connected} onclick={() => cmdUserInfo()}>View User Information</button>
    <div class="sep"></div>
    <button disabled={!app.connected} onclick={() => cmdJoinRooms()}>Join Chat Rooms</button>
    <button onclick={() => cmdIgnoreList()}>View Ignore List</button>
    <div class="sep"></div>
    <button onclick={() => cmdShop()}>Shop for Music at CDNOW</button>
    <button onclick={() => cmdLogonServer()}>Logon Server</button>
    <div class="sep"></div>
    <button disabled={!app.connected} onclick={() => cmdBridge()}>TCP Bridge…</button>
  </div>
{:else if which === 'help'}
  <div class="menu-pop" style:top style:left>
    <button onclick={() => cmdHelp('start')}>Getting Started</button>
    <button onclick={() => cmdView('home')}>Home</button>
    <div class="has-sub">
      <button type="button" class="fly">Manual</button>
      <div class="menu-pop nested">
        <button onclick={() => cmdHelp('manual')}>Manual</button>
        <div class="sep"></div>
        {#each HELP_MANUAL as h (h.id)}
          <button onclick={() => cmdHelp(h.id)}>{h.label}</button>
        {/each}
      </div>
    </div>
    <div class="has-sub">
      <button type="button" class="fly">Napster FAQ</button>
      <div class="menu-pop nested">
        <button onclick={() => cmdHelp('faq')}>Napster FAQ</button>
        <div class="sep"></div>
        {#each HELP_FAQ as h (h.id)}
          <button onclick={() => cmdHelp(h.id)}>{h.label}</button>
        {/each}
      </div>
    </div>
    <button onclick={() => cmdHelp('support')}>Customer Support</button>
    <button onclick={() => cmdFeedback()}>Send Us Some Feedback!</button>
    <div class="sep"></div>
    <button onclick={() => cmdAbout()}>About Napster</button>
    <button
      onclick={() => {
        window.open('https://archive.org/details/napv2b10-3', '_blank')
        closeChrome()
      }}>Original EXE on archive.org</button
    >
    {#if app.hub === 'wss'}
      <div class="sep"></div>
      <button onclick={() => { window.location.href = '/'; closeChrome() }}>OpenNAP</button>
      <button onclick={() => { window.location.href = '/?ui=win'; closeChrome() }}>Napster</button>
      <button onclick={() => { window.location.href = '/?ui=mac'; closeChrome() }}>Mac</button>
    {/if}
  </div>
{/if}
