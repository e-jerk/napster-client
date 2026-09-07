import type { HelpTopic } from './types'

export const HELP: Record<HelpTopic, { title: string; body: string[] }> = {
  start: {
    title: 'Getting Started',
    body: [
      'Welcome to Napster v2.0 BETA 10.3. This page follows Help → Getting Started in napster.exe (http://www.napster.com/client/help/gettingstarted/index.html).',
      '1. File → Connect and pick your modem, ISDN, cable, DSL, or T1 speed. If you have NO IDEA what a Proxy is, hit Next.',
      '2. Register a nickname. Other users see that name on Search, Chat, and the Hot List.',
      '3. Open Search, type an artist or title, and click Find It! Double-click a row or use Get Selected Files.',
      '4. Transfer shows inbound and outbound transfers. My Files is what you share plus what you already have.',
      '5. Chat joins a room. Actions → Instant Message starts a private chat. Actions → Add User to Hot List remembers a library.',
      'Toolbar buttons match View: Home, Chat, My Files, Search, Hot List, Transfer, and Discover. Shop for Music at CDNOW opens http://shop.napster.com.',
    ],
  },
  manual: {
    title: 'Napster Manual',
    body: [
      'The 10.3 Help → Manual menu opened http://www.napster.com/client/help/manual/index.html and these chapter links. Pick a chapter from the Help menu.',
      'Search uses artist and title contains-queries (OpenNap FILENAME / ARTIST / TITLE). A leading minus on a term excludes it, as in beta 10.2.',
      'Hot List: when a user comes online you can browse their share folder. Right-click a result for Download, Browse Files, Add to Hot List, or Instant Message.',
      'Transfers resume by MD5 hash when another host has the same file. Firewalled peers are pushed (message type 500) instead of connecting inbound.',
    ],
  },
  'manual-install': {
    title: 'Manual — Installation',
    body: [
      'Setup is a MindVision VISE installer (napv2b10-3.exe). It copies napster.exe, amp.dll (AMP / PlayMedia MP3 decode), id3lib.dll, napgo.dll, runwma.dll, cleanap.dll, and NapProtHandler.exe (the nap: URL protocol).',
      'Default folder: C:\\Program Files\\Napster. Shortcuts are named “Napster Music Community”.',
      'Windows 95 / 98 / NT 4 / 2000 / XP. An older WinSock shows Help → FAQ → Connecting (winsock.html).',
    ],
  },
  'manual-config': {
    title: 'Manual — Configuration',
    body: [
      'File → Preferences opens the tabbed sheet from napster.exe: Personal, Chat, Transfer, Proxy, and My Files.',
      'Personal sets user name, e-mail, connection type, and Media Player (Napster Internal Player vs Default Media Player).',
      'Transfer sets the download folder, max inbound / outbound transfers (maximum 50), the share TCP port (6699), and whether to delete partial files.',
      'Proxy: SOCKS 4 or 5. The binary warns: If you have NO IDEA what a Proxy is, leave these settings alone.',
    ],
  },
  'manual-chat': {
    title: 'Manual — Chat & Instant Messaging',
    body: [
      'View → Chat (Ctrl+A) joins a channel. Actions → Join Chat Rooms opens Napster Chat Rooms (Join, View All, Create).',
      'Right-click a nick for Instant Message, Add to Hot List, Browse Files, View User Information, Ignore User, or Unignore User.',
      'Slash commands in this recreation: /join, /me, /msg, /whois, /ignore, /away, /topic, /history, /help.',
      'Preferences → Chat can auto-join previous rooms, hide offensive words, open private messages in separate windows, and announce joins and parts.',
    ],
  },
  'manual-myfiles': {
    title: 'Manual — My Files',
    body: [
      'View → My Files (Ctrl+M) is the share list. The 10.3 menu says My Files, not Library — that string is in napster.exe.',
      'Right-click: Play File!, Add to Playlist, Rename File, Delete (from disk), Refresh and Sort, and path display (No / Partial / Full Paths).',
      'Preferences → My Files chooses delete confirmation, path display, and certified vs un-certified icons (Relatable fingerprints in the original service).',
      'Double-click plays in the Napster Internal Player (AMP). Default Media Player is the other Preferences choice.',
    ],
  },
  'manual-search': {
    title: 'Manual — Search',
    body: [
      'Artist and Title boxes, Find It!, Clear, and Advanced >> (Bitrate, Connection, Ping Time) match dialog 168 in napster.exe.',
      'Buttons: Get Selected Files and Add Selected User to Hot List.',
      'Search popup: Download, Instant Message, Add to Hot List, Browse Files, View User Information, Clear Results.',
      'Must specify a song title or artist. You cannot clear fields until the current search is complete.',
    ],
  },
  'manual-hotlist': {
    title: 'Manual — Hot List',
    body: [
      'The Hot List remembers nicknames. Online users show file count and line speed; double-click browses their share.',
      'User List popup: Instant Message, View User Information, Browse Files, Remove User.',
      'Building a useful Hot List takes time — you find people by searching a title, then browsing who has it.',
    ],
  },
  'manual-transfer': {
    title: 'Manual — Transfer',
    body: [
      'Transfer is two lists: inbound and outbound. Status strings in the binary include Connecting, Getting header, Transferring, Complete, Timed out, Queued, File not available.',
      'Transfer popup: Play File!, Force Transfer (if queued), Prioritize (Move Up / Down / Top / Bottom), Cancel Transfer, Delete/Abort Transfer, Instant Message, Add User to Hot List, Browse Files, View User Information, Clear Finished.',
      'Closing with transfers open asks whether to unshare and Exit after outbound transfers complete.',
    ],
  },
  'manual-discover': {
    title: 'Manual — Discover',
    body: [
      'View → Discover (Ctrl+D) loaded http://www.napster.com/client/discover.html in an embedded IE pane. Unsigned artists promoted themselves here; the list refreshed daily.',
      'This recreation lists the in-browser demo catalog only — original recordings, not commercial releases.',
    ],
  },
  'manual-extra': {
    title: 'Manual — Extra Knowledge',
    body: [
      'Home is http://www.napster.com/client/home.html?02b103 — the 02b103 query is this build. That HTML pane was the community bulletin and the main ad surface.',
      'Actions → Shop for Music at CDNOW opens http://shop.napster.com (Bertelsmann / CDNOW, shipped in beta 9). BITMAP 452 in napster.exe is the 50×12 CDNOW wordmark.',
      'About Napster credits AMP / PlayMedia Systems for MP3 decode, Windows Media Technologies for WMA, and Relatable for file identification.',
      'Actions → Logon Server (dialog 301) asks for Server and Port of a Napster hub, and shows the last logged-in server.',
    ],
  },
  faq: {
    title: 'Napster FAQ',
    body: [
      'Help → Napster FAQ opened http://www.napster.com/client/help/faq/index.html with anchors for connecting, chat, myfiles, search, transfer, configuration, installation, gettingstarted, and company.',
      'Q: Why does the server say I must upgrade my client?\nA: In June 2001 Napster refused anything older than 2.0 beta 10.3. This recreation always identifies as that build.',
      'Q: Where is the banner from?\nA: Home was an embedded browser. The only in-client shop control in the binary is Shop for Music at CDNOW → shop.napster.com, plus BITMAP 452. Clicks here stay local or go to Internet Archive snapshots.',
    ],
  },
  'faq-connecting': {
    title: 'FAQ — Connecting',
    body: [
      'File → Connect opens Connection Information (dialog 253): connection speed and Proxy Setup. File → Disconnect drops the hub.',
      'Actions → Logon Server lets you type an IP and port. The status line reads Online (nick): Sharing N files. and Currently N users sharing N files (N gigs).',
      'Both-firewalled downloads fail. The original dialog offered I Am Not Firewalled! if you could open inbound TCP on your data port.',
    ],
  },
  'faq-chat': {
    title: 'FAQ — Chat & Instant Messaging',
    body: [
      'Chat rooms are divided by style (Alternative through Trance) plus a few national rooms. Use Join Chat Rooms or the Chat Rooms control.',
      'Instant messages open a Private Chat window (dialog 352) with Add User to Hot List, Ignore User, and User Information.',
    ],
  },
  'faq-myfiles': {
    title: 'FAQ — My Files & Player',
    body: [
      'My Files is the share folder plus downloads. The internal player is AMP (PlayMedia Systems), bundled as amp.dll. WMA uses Windows Media (runwma.dll).',
      'Certified vs un-certified icons were Relatable fingerprints so the service could filter titles the labels listed. This hub does not run that filter — the catalog is original demo material only.',
    ],
  },
  'faq-search': {
    title: 'FAQ — Search',
    body: [
      'You will be unable to download files from this user because you are both firewalled — that sentence is in napster.exe.',
      'Must specify a song title or artist to search. No matching files found! if the hub returns nothing.',
      'Get Selected Files starts the transfer. Add Selected User to Hot List remembers the nick.',
    ],
  },
  'faq-transfer': {
    title: 'FAQ — Transfer',
    body: [
      'Common failures from the binary: Remote peer cancelled transfer, File is out of sequence, File cannot be resumed, Timed out exchanging data, FILE NOT SHARED, FILE NOT FOUND.',
      'Resume Files (dialog 249) listed resumable downloads by hash. Force Transfer jumps a queued inbound if the remote allows it.',
    ],
  },
  'faq-company': {
    title: 'FAQ — General Company Info',
    body: [
      'Napster, Inc. — Redwood City, California. Product: Napster Music Community Client 2.0 BETA 10.3 for Windows.',
      'Web: http://www.napster.com/  ·  Download: http://www.napster.com/download.html  ·  Shop: http://shop.napster.com',
      'This web client is a historical recreation. There is no live Napster support desk.',
    ],
  },
  support: {
    title: 'Customer Support',
    body: [
      'Help → Customer Support opened http://www.napster.com/client/help/support/index.html.',
      'Napster, Inc. — Redwood City, California (2001). Product: Napster v2.0 BETA 10.3 for Windows 9x / NT / 2000 / XP.',
      'Send Us Some Feedback used mail.napster.com (Help → Send Us Some Feedback). File transfers on the original service were suspended in early July 2001 while Napster upgraded databases for identification technology.',
      'The installer is preserved at archive.org/details/napv2b10-3. It is not bundled in this repo.',
    ],
  },
}
