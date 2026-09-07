/**
 * Period ad chrome from Napster 2.0 beta 9–10.3 (2001).
 * CDNOW button: CNET, 2001; OldVersion 10.2 changelog.
 * Banner strip sat in the main window beside the toolbar.
 * Clicks stay local or go to Internet Archive snapshots — no live ad network.
 */
export type BannerAd = {
  id: string
  kicker: string
  title: string
  line: string
  href?: string
  action?: 'shop' | 'discover' | 'winamp'
  colors: { bg: string; fg: string; accent: string }
}

export const BANNERS: BannerAd[] = [
  {
    id: 'cdnow',
    kicker: 'CDNOW',
    title: 'Shop for music at CDNOW',
    line: 'Heard it on Napster? Buy the CD. Click here.',
    action: 'shop',
    colors: { bg: '#1a1a6e', fg: '#fff8d0', accent: '#ffcc00' },
  },
  {
    id: 'winamp',
    kicker: 'WINAMP',
    title: 'It really whips the llama’s ass',
    line: 'Play your Napster downloads in Winamp 2.77.',
    action: 'winamp',
    href: 'https://web.archive.org/web/20010615055932/http://www.winamp.com/',
    colors: { bg: '#000000', fg: '#b4ff54', accent: '#ff9900' },
  },
  {
    id: 'community',
    kicker: 'NAPSTER',
    title: 'Napster Music Community',
    line: '58 million members. Share files. Chat. Discover.',
    action: 'discover',
    colors: { bg: '#0b3d91', fg: '#ffffff', accent: '#7ec8ff' },
  },
  {
    id: 'mp3com',
    kicker: 'MP3.COM',
    title: 'Discover new music. Download songs.',
    line: 'Unsigned bands and New Music Army — 1999–2001.',
    href: 'https://web.archive.org/web/20010602041229/http://www.mp3.com/',
    colors: { bg: '#336699', fg: '#ffffff', accent: '#ffcc66' },
  },
]

export const CDNOW_SNAPSHOT = 'https://web.archive.org/web/20010615024618/http://www.cdnow.com/'
export const NAPSTER_SNAPSHOT = 'https://web.archive.org/web/20010615055900/http://www.napster.com/'
