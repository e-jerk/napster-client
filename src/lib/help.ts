import type { HelpTopic } from './types'

export const HELP: Record<HelpTopic, { title: string; body: string[] }> = {
  start: {
    title: 'Getting Started',
    body: [
      'Welcome to Napster v2.0 BETA 10.3. This Getting Started page follows the 2001 Windows client.',
      '1. File → Connect… and pick your modem, ISDN, cable, DSL, or T1 speed. If you have no idea what a SOCKS proxy is, hit Next.',
      '2. Choose a nickname. Other users see that name on Search, Chat, and the Hot List.',
      '3. Open Search, type an artist or title, and click Find It! Double-click a row to download.',
      '4. Transfer shows downloads and uploads. Library (My Files) is what you share plus what you already have.',
      '5. Chat joins a channel. Actions → Instant Message starts a private chat. Actions → Add user to Hot List remembers a library.',
      'Toolbar buttons match View: Home, Chat, Library, Search, Hot List, Transfer, and Discover. The yellow CDNOW button shops for CDs.',
    ],
  },
  manual: {
    title: 'Napster Manual',
    body: [
      'Search uses artist and title contains-queries (OpenNap FILENAME / ARTIST / TITLE). A leading minus on a term excludes it, as in beta 10.2.',
      'Hot List: when a user comes online you can browse their share folder. Right-click a result for Download, Browse, Hot List, or Instant Message.',
      'Transfers resume by MD5 hash when another host has the same file. Firewalled peers are pushed (message type 500) instead of connecting inbound.',
      'Home is the community bulletin. Discover lists independent artists promoting themselves through Napster, updated with the catalog.',
      'File → Preferences… changes connection speed, the unused SOCKS proxy, and whether the internal player handles Library double-clicks.',
      'Actions → View Ignore List hides public chat from those nicknames. Help → Customer Support is the 2001 support desk copy.',
    ],
  },
  faq: {
    title: 'Napster FAQ',
    body: [
      'Q: Why does the server say I must upgrade my client?\nA: In June 2001 Napster refused anything older than 2.0 beta 10.3. This recreation always identifies as that build.',
      'Q: What is file identification technology?\nA: Beta 10 added acoustic fingerprints (Relatable) so the service could filter titles the labels listed. The in-browser hub does not run that filter — the catalog is original demo material only.',
      'Q: Where is the banner from?\nA: The 2.0 window carried a 468×60 community/ad strip plus a CDNOW shop button (beta 9). Clicks here open a local shop or an Internet Archive snapshot, not a live ad server.',
      'Q: Can I use a SOCKS proxy?\nA: The original dialog asked. The zero-native stack never leaves this tab, so the proxy fields are stored only.',
      'Q: Where is napv2b10-3.exe?\nA: Internet Archive item napv2b10-3 (2,044,147 bytes). That file is a MindVision VISE installer; it is not bundled in this repo.',
    ],
  },
  support: {
    title: 'Customer Support',
    body: [
      'Napster, Inc. — Redwood City, California (2001).',
      'Product: Napster v2.0 BETA 10.3 for Windows 9x / NT / 2000 / XP.',
      'Web: http://www.napster.com/  ·  Download: http://www.napster.com/win/download/',
      'This web client is a historical recreation. There is no live Napster support desk. Protocol questions belong in #OpenNap on the Chat tab.',
      'File transfers on the original service were suspended in early July 2001 while Napster upgraded databases for the new identification technology. The note on Home quotes that community bulletin.',
      'For the preserved installer see archive.org/details/napv2b10-3.',
    ],
  },
}
