/**
 * In-client ads and shop chrome from napster.exe (BETA 10.3).
 *
 * The binary does not embed a rotating 468×60 network. Ads lived in:
 *   - Actions → Shop for Music at CDNOW + BITMAP 452 → http://shop.napster.com
 *   - Home IE pane → http://www.napster.com/client/home.html?02b103
 *   - Discover IE pane → http://www.napster.com/client/discover.html
 *   - About → AMP / PlayMedia (amp.dll)
 *
 * Clicks stay local or go to Internet Archive snapshots — no live ad network.
 */
export type BannerAd = {
  id: string
  kicker: string
  title: string
  line: string
  href?: string
  action?: 'shop' | 'discover' | 'home' | 'amp'
  colors: { bg: string; fg: string; accent: string }
}

export const BANNERS: BannerAd[] = [
  {
    id: 'cdnow',
    kicker: 'CDNOW',
    title: 'Shop for music at CDNOW',
    line: 'http://shop.napster.com — Heard it on Napster? Buy the CD.',
    action: 'shop',
    colors: { bg: '#0b1a6e', fg: '#ffffff', accent: '#ffcc00' },
  },
  {
    id: 'home',
    kicker: 'NAPSTER',
    title: 'Napster Music Community',
    line: 'Home — www.napster.com/client/home.html?02b103',
    action: 'home',
    colors: { bg: '#0b3d91', fg: '#ffffff', accent: '#7ec8ff' },
  },
  {
    id: 'discover',
    kicker: 'DISCOVER',
    title: 'Discover new music',
    line: 'Unsigned artists — www.napster.com/client/discover.html',
    action: 'discover',
    colors: { bg: '#1e4ea8', fg: '#ffffff', accent: '#c6e4ff' },
  },
  {
    id: 'amp',
    kicker: 'AMP',
    title: 'MP3 playback/decoding by AMP',
    line: 'PlayMedia Systems, Inc. — www.playmediasystems.com',
    action: 'amp',
    href: 'https://web.archive.org/web/20010615024618/http://www.playmediasystems.com/',
    colors: { bg: '#1a1a1a', fg: '#d8ffb0', accent: '#7cff3f' },
  },
]

export const CDNOW_SNAPSHOT = 'https://web.archive.org/web/20010615024618/http://www.cdnow.com/'
export const SHOP_SNAPSHOT = 'https://web.archive.org/web/20010715000000/http://shop.napster.com/'
export const HOME_SNAPSHOT = 'https://web.archive.org/web/20010615055900/http://www.napster.com/'
export const NAPSTER_SNAPSHOT = HOME_SNAPSHOT
