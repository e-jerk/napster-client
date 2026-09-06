export const SPEEDS = [
  { id: 0, label: "I don't know!", kbps: 56 },
  { id: 1, label: '14.4K modem', kbps: 14 },
  { id: 2, label: '28.8K modem', kbps: 28 },
  { id: 3, label: '33.6K modem', kbps: 33 },
  { id: 4, label: '56K modem', kbps: 56 },
  { id: 5, label: '64K ISDN', kbps: 64 },
  { id: 6, label: '128K ISDN', kbps: 128 },
  { id: 7, label: 'Cable', kbps: 384 },
  { id: 8, label: 'DSL', kbps: 384 },
  { id: 9, label: 'T1', kbps: 1544 },
  { id: 10, label: 'T3 or greater', kbps: 45000 },
] as const

export type SpeedId = (typeof SPEEDS)[number]['id']

export type AppView = 'chat' | 'library' | 'search' | 'hotlist' | 'transfer'

export type SharedFile = {
  filename: string
  artist: string
  title: string
  size: number
  bitrate: number
  freq: number
  duration: number
  md5: string
}

export type SearchHit = SharedFile & {
  id: string
  nick: string
  ip: string
  port: number
  speed: SpeedId
  ping: number
  firewalled: boolean
}

export type TransferStatus =
  | 'Connecting'
  | 'Getting header'
  | 'Transferring'
  | 'Complete'
  | 'Aborted'
  | 'Timed out'
  | 'Queued'
  | 'File not available'
  | 'User offline'

export type Transfer = {
  id: string
  direction: 'download' | 'upload'
  filename: string
  artist: string
  title: string
  size: number
  nick: string
  speed: SpeedId
  status: TransferStatus
  percent: number
  bps: number
  startedAt: number
  blob?: Blob
}

export type ChatLine = {
  id: string
  kind: 'public' | 'system' | 'private' | 'action'
  channel?: string
  nick?: string
  text: string
  at: number
  msgid?: string
}

export type ChannelUser = {
  nick: string
  files: number
  speed: SpeedId
  op: boolean
}

export type ChannelInfo = {
  name: string
  users: number
  topic: string
}

export type HotlistUser = {
  nick: string
  online: boolean
  files: number
  speed: SpeedId
}

export type BrowseFile = SharedFile & { nick: string }

export type PrivateThread = {
  nick: string
  messages: ChatLine[]
  input: string
  open: boolean
  x: number
  y: number
}

export type PacketLog = {
  id: string
  at: number
  dir: 'in' | 'out' | 'peer'
  type: number
  name: string
  payload: string
}

export type LibraryItem = SharedFile & {
  id: string
  origin: 'shared' | 'download'
  blob?: Blob
}
