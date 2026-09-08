import { hash32 } from './format'
import type { SharedFile, SpeedId } from './types'

export type ChannelDef = { name: string; topic: string }

export const CHANNELS: ChannelDef[] = [
  { name: 'Alternative', topic: 'college rock, leftover 120 Minutes, and bedroom 4-tracks' },
  { name: 'Blues', topic: 'delta, chicago, and late-night guitar' },
  { name: 'Classical', topic: 'dead composers, living encodings' },
  { name: 'Country', topic: 'steel guitar and truck-stop ballads' },
  { name: 'Electronic', topic: 'synths, 303s, and 128kbps miracles' },
  { name: 'Hip Hop', topic: 'breaks, verses, and crate-dug instrumentals' },
  { name: 'Jazz', topic: 'midnight sessions and dusty vinyl rips' },
  { name: 'Metal', topic: 'high gain, higher volume' },
  { name: 'Pop', topic: 'hooks, choruses, and radio leftovers' },
  { name: 'Punk', topic: 'two chords and a share folder' },
  { name: 'Reggae', topic: 'one-drop and Sunday afternoon' },
  { name: 'Rock', topic: 'amps, riffs, and burned CDs' },
  { name: 'Techno', topic: 'four-on-the-floor until the T1 melts' },
  { name: '80s', topic: 'neon, DX7s, and cassette rips' },
  { name: 'Soundtrack', topic: 'end credits and pause-screen themes' },
  { name: 'OpenNap', topic: 'talk about the client, the hub, and the protocol' },
]

type TrackRow = [string, string, number, number, number]

const TRACKS: TrackRow[] = [
  ['Dialup Dreams', 'Midnight Handshake', 247, 128, 44100],
  ['Dialup Dreams', 'Waiting for 28.8', 198, 96, 44100],
  ['The Handshake', 'Carrier Lost', 221, 128, 44100],
  ['The Handshake', 'Redial', 184, 160, 44100],
  ['Buffer Underrun', 'Skip', 176, 128, 44100],
  ['Buffer Underrun', 'Rebuffering', 203, 192, 44100],
  ['Cable Modem Club', 'Always On', 256, 192, 44100],
  ['Cable Modem Club', 'Shared Line', 211, 128, 44100],
  ['56k Saints', 'Handshake Hymn', 233, 64, 22050],
  ['56k Saints', 'Busy Signal Sunday', 190, 96, 44100],
  ['Usenet Angels', 'alt.binaries.lullaby', 268, 128, 44100],
  ['Winamp Kids', 'Equalizer Sunset', 214, 160, 44100],
  ['Winamp Kids', 'Playlist 47', 187, 128, 44100],
  ['IRC Radio', 'Idle in #mp3', 242, 128, 44100],
  ['The Firewalls', 'Port 6699', 195, 192, 44100],
  ['Bedroom Studio', 'Four Track Confession', 229, 128, 44100],
  ['Bedroom Studio', 'Condenser Mic', 174, 160, 44100],
  ['Mixdown Monday', 'Bounce to Disk', 208, 192, 44100],
  ['Pixel Parade', '16-Color Prom', 183, 128, 44100],
  ['Floppy Diskette', '1.44', 166, 96, 22050],
  ['T1 Prophets', 'Lease Line', 275, 256, 44100],
  ['T1 Prophets', 'Backbone', 231, 192, 44100],
  ['ISDN Girls', 'Two Channels', 201, 160, 44100],
  ['The Uploaders', 'Ratio Blues', 219, 128, 44100],
  ['The Uploaders', 'Queue Position 7', 188, 128, 44100],
  ['Shareware Symphony', 'Nag Screen Waltz', 194, 128, 44100],
  ['Geocities Band', 'Under Construction', 207, 128, 44100],
  ['Geocities Band', 'Visitor Counter', 172, 96, 44100],
  ['Angelfire', 'Midi Guestbook', 185, 128, 44100],
  ['Tripod Radio', 'Free Host', 199, 128, 44100],
  ['AIM Away', 'I am away from my computer', 224, 128, 44100],
  ['ICQ 1999', 'Uh-oh', 163, 160, 44100],
  ['The Pings', '32ms', 178, 192, 44100],
  ['Latency', 'Round Trip', 216, 128, 44100],
  ['Packet Loss', 'Retry', 169, 96, 44100],
  ['The Bitrates', 'Joint Stereo', 236, 192, 44100],
  ['The Bitrates', 'VBR Night', 205, 160, 44100],
  ['MP3 Workshop', 'ID3v1', 191, 128, 44100],
  ['Headphone Nation', 'Walkman Jack', 227, 160, 44100],
  ['Late Night Encode', 'LAME 3.90', 249, 192, 44100],
  ['Late Night Encode', 'CDA to WAV', 212, 256, 44100],
  ['CD Ripper', 'Track 04', 181, 128, 44100],
  ['The ID3s', 'Untitled', 158, 128, 44100],
  ['Tag Edit', 'Various Artists', 193, 128, 44100],
  ['Joint Stereo', 'Mid Side', 218, 192, 44100],
  ['LAME Encoders', 'Preset Standard', 240, 192, 44100],
  ['Fraunhofer Kids', 'Layer III', 206, 128, 44100],
  ['Xing Encoder', 'Fast Mode', 177, 160, 44100],
  ['Cool Edit', 'Noise Floor', 223, 128, 44100],
  ['Sound Blaster', 'AWE32', 197, 128, 44100],
  ['Creative Labs', 'WaveSynth', 189, 96, 22050],
  ['Aureal Vortex', 'A3D Demo', 210, 160, 44100],
  ['The Subwoofers', 'Bass Bin', 234, 192, 44100],
  ['Modem Hymnal', 'ATDT', 245, 64, 22050],
  ['Chatroom Crush', 'Private Message', 202, 128, 44100],
  ['Hotlist Heart', 'User Online', 186, 160, 44100],
  ['Share Folder', 'My Music', 215, 128, 44100],
  ['Transfer Manager', 'Percent Complete', 173, 128, 44100],
  ['Search Results', 'Find It', 209, 192, 44100],
  ['OpenNap Orchestra', 'Message Type 200', 261, 192, 44100],
  ['OpenNap Orchestra', 'End of Search', 188, 128, 44100],
  ['Hub Lights', '8888', 196, 160, 44100],
  ['Zero Native', 'No Winsock', 222, 192, 44100],
  ['Zero Native', 'Virtual NIC', 204, 160, 44100],
  ['Green Eyed Cat', 'Headphones On', 238, 128, 44100],
  ['Beta Ten', 'Disabled Previous Versions', 217, 128, 44100],
  ['College LAN', 'Dorm Switch', 226, 256, 44100],
  ['Dorm Room', 'MiniFridge Hum', 171, 96, 44100],
  ['Library Card', 'Local Collection', 200, 128, 44100],
  ['Ping Timeout', 'Ghost User', 164, 128, 44100],
  ['Socks Proxy', 'I Have No Idea', 182, 128, 44100],
  ['Next Button', 'Just Hit Next', 159, 96, 44100],
  ['Firewalled', 'Push Request', 213, 128, 44100],
  ['Resume Hash', 'Same Song Faster Host', 230, 192, 44100],
]

export function makeFile(artist: string, title: string, duration: number, bitrate: number, freq: number, _pathIdx = 0): SharedFile {
  const filename = `${artist} - ${title}.mp3`
  const size = Math.round((bitrate * 1000 * duration) / 8)
  return {
    filename,
    artist,
    title,
    size,
    bitrate,
    freq,
    duration,
    md5: hash32(`${filename}|${size}|${bitrate}`),
  }
}

export type PeerDef = {
  nick: string
  speed: SpeedId
  firewalled: boolean
  channels: string[]
  lines: string[]
  files: SharedFile[]
}

const PEER_SEEDS: Array<{
  nick: string
  speed: SpeedId
  firewalled?: boolean
  channels: string[]
  lines: string[]
  take: number[]
}> = [
  {
    nick: 'cablekid',
    speed: 7,
    channels: ['Alternative', 'OpenNap'],
    lines: [
      'cable is actually holding tonight, grab whatever',
      'search for Bedroom Studio if you like 4-track stuff',
      'anyone else still on winamp 2.7?',
    ],
    take: [0, 1, 15, 16, 36, 39],
  },
  {
    nick: 't1monster',
    speed: 9,
    channels: ['Techno', 'Electronic', 'OpenNap'],
    lines: [
      'T1 here, queue is empty, come get it',
      'encoding the rest of Mixdown Monday at 192',
      'if I time out I am just rebooting the router',
    ],
    take: [20, 21, 4, 5, 45, 60],
  },
  {
    nick: 'dsl_dave',
    speed: 8,
    channels: ['Rock', 'Alternative'],
    lines: [
      'dsl upload is the usual joke but search works',
      'ripped these off CDs I actually bought, promise',
    ],
    take: [6, 7, 51, 52, 66],
  },
  {
    nick: 'jazzfan42',
    speed: 7,
    channels: ['Jazz', 'Blues'],
    lines: [
      'looking for cleaner vinyl rips, 192 or better',
      'Cool Edit noise floor track is a mood',
    ],
    take: [48, 32, 33, 17],
  },
  {
    nick: 'mp3hoarder',
    speed: 8,
    channels: ['Pop', '80s', 'Soundtrack'],
    lines: [
      'sharing 2 gigs of original bedroom pop, ignore the filenames',
      'hotlist me if you want the rest of the 80s folder',
    ],
    take: [26, 27, 28, 29, 13, 64],
  },
  {
    nick: 'slowpoke56k',
    speed: 4,
    channels: ['Blues', 'Country'],
    lines: [
      '56k so please do not queue five songs',
      'I will be here all night, leave me in the hotlist',
    ],
    take: [8, 9, 53, 2],
  },
  {
    nick: 'isdn_iris',
    speed: 6,
    channels: ['Electronic', 'Pop'],
    lines: ['two ISDN channels and a lot of coffee', 'Joint Stereo mid-side mix is up'],
    take: [22, 44, 37, 18],
  },
  {
    nick: 'college_lan',
    speed: 9,
    channels: ['Punk', 'Metal', 'Alternative'],
    lines: [
      'dorm switch is fast until everyone gets back from class',
      'search College LAN or Dorm Room',
    ],
    take: [66, 67, 11, 12],
  },
  {
    nick: 'dormroom',
    speed: 7,
    channels: ['Hip Hop', 'Electronic'],
    lines: ['mini-fridge is in the recording, sorry', 'breaks folder is under Headphone Nation'],
    take: [67, 38, 46, 19],
  },
  {
    nick: 'winamp_jock',
    speed: 7,
    channels: ['80s', 'Pop', 'Rock'],
    lines: ['equalizer sunset is mandatory listening', 'vis plugin of the week: milkdrop'],
    take: [11, 12, 54, 55],
  },
  {
    nick: 'encode_bot',
    speed: 10,
    channels: ['OpenNap'],
    lines: [
      'batch encode finished — LAME 3.90 preset standard',
      'message type 200 still the best party trick',
    ],
    take: [39, 40, 59, 60, 63],
  },
  {
    nick: 'vinylripper',
    speed: 8,
    channels: ['Jazz', 'Classical', 'Soundtrack'],
    lines: ['clicks left in on purpose', 'soundtrack folder is all original pause-screen themes'],
    take: [49, 50, 41, 35],
  },
  {
    nick: 'mix_master',
    speed: 8,
    channels: ['Hip Hop', 'Techno', 'Electronic'],
    lines: ['bounce to disk just finished', 'queue the 256s first'],
    take: [17, 43, 47, 5],
  },
  {
    nick: 'metalhead99',
    speed: 7,
    channels: ['Metal', 'Rock'],
    lines: ['gain is the point', 'T1 Prophets backbone rips hard'],
    take: [20, 52, 3, 34],
  },
  {
    nick: 'lounge_liz',
    speed: 5,
    channels: ['Jazz', 'Classical'],
    lines: ['ISDN 64k and a cocktail', 'keep it quiet in here'],
    take: [14, 31, 42],
  },
  {
    nick: 'techno_tom',
    speed: 8,
    channels: ['Techno', 'Electronic'],
    lines: ['four on the floor until the hub melts', 'Zero Native / No Winsock is a banger, fight me'],
    take: [62, 61, 23, 24],
  },
  {
    nick: 'punk_pat',
    speed: 4,
    channels: ['Punk', 'Alternative'],
    lines: ['two chords, one share folder', '56k build character'],
    take: [25, 10, 1],
  },
  {
    nick: 'latin_loop',
    speed: 7,
    channels: ['Pop', 'Reggae'],
    lines: ['loop is the song', 'Sunday afternoon energy'],
    take: [30, 56, 18],
  },
  {
    nick: 'soundtrack_sam',
    speed: 8,
    channels: ['Soundtrack', 'Classical'],
    lines: ['end credits never end', 'search Resume Hash'],
    take: [73, 58, 57],
  },
  {
    nick: 'op_mike',
    speed: 9,
    channels: ['OpenNap', 'Alternative'],
    lines: [
      'welcome to napster.local — original demo tracks only',
      'if search is empty, try "modem" or "winamp"',
      'this hub is zero-native. there is no real TCP.',
    ],
    take: [59, 60, 61, 62, 65, 70],
  },
  {
    nick: 'firewalled',
    speed: 7,
    firewalled: true,
    channels: ['OpenNap', 'Rock'],
    lines: ['behind a linksys, transfers get pushed', 'try me anyway, the bridge handles 500/SEND'],
    take: [72, 14, 34],
  },
  {
    nick: 'teenybop',
    speed: 4,
    channels: ['Pop', '80s'],
    lines: ['parents think I am doing homework', 'chatroom crush is about YOU'],
    take: [54, 27, 28],
  },
]

export function buildPeers(): PeerDef[] {
  return PEER_SEEDS.map((p, i) => ({
    nick: p.nick,
    speed: p.speed,
    firewalled: Boolean(p.firewalled),
    channels: p.channels,
    lines: p.lines,
    files: p.take.map((idx, j) => {
      const row = TRACKS[idx] ?? TRACKS[0]!
      return makeFile(row[0], row[1], row[2], row[3], row[4], i + j)
    }),
  }))
}

export const DISCOVER = [
  { artist: 'Bedroom Studio', genre: 'Indie', blurb: 'Four-track demos bounced to disk in a dorm. Updated daily on Discover in 2001.' },
  { artist: 'Winamp Kids', genre: 'Electronic', blurb: 'Equalizer presets and playlist 47 — unsigned, share-folder famous.' },
  { artist: '56k Saints', genre: 'Folk', blurb: 'Handshake hymns recorded through a US Robotics. Buy the CD at CDNOW (historical).' },
  { artist: 'Geocities Band', genre: 'Pop', blurb: 'Under construction since 1999. Visitor counter still rolling.' },
  { artist: 'OpenNap Orchestra', genre: 'Experimental', blurb: 'Message type 200 and End of Search, performed live on napster.local.' },
  { artist: 'Late Night Encode', genre: 'Rock', blurb: 'LAME 3.90 presets. Independent artists used Discover to promote rips of their own CDs.' },
]

export const MOTD = [
  'Welcome to napster.local — Napster v2.0 BETA 10.3 (web).',
  'Hub is an in-browser OpenNap replica. Zero native sockets.',
  'Source EXE preserved at archive.org/details/napv2b10-3 (napv2b10-3.exe).',
  'Every MP3 name on this network is an original demo, not a commercial release.',
  'Try Search for "modem", "winamp", "encode", or join #OpenNap.',
]
