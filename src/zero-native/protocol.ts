/** Classic Napster / OpenNap client-server framing: u16le length, u16le type, ASCII payload. */

export const Msg = {
  ERROR: 0,
  LOGIN: 2,
  LOGIN_ACK: 3,
  NEW_USER: 6,
  NICK_CHECK: 7,
  SHARE: 100,
  UNSHARE: 102,
  SEARCH: 200,
  SEARCH_RESULT: 201,
  SEARCH_END: 202,
  DOWNLOAD: 203,
  DOWNLOAD_ACK: 204,
  UPLOAD_REQUEST: 607,
  PRIVATE: 205,
  ERROR_MSG: 206,
  ADD_HOTLIST: 207,
  REMOVE_HOTLIST: 303,
  USER_ONLINE: 209,
  USER_OFFLINE: 210,
  BROWSE: 211,
  BROWSE_ENTRY: 212,
  BROWSE_END: 213,
  SERVER_STATS: 214,
  JOIN: 400,
  PART: 401,
  SEND_PUB: 402,
  PUBLIC: 403,
  NOSUCH: 404,
  JOIN_ACK: 405,
  USER_JOIN: 406,
  CHANNEL_PART: 407,
  CHANNEL_USER: 408,
  CHANNEL_USER_END: 409,
  TOPIC: 410,
  PUSH: 500,
  LIST_CHANNELS: 617,
  CHANNEL_ENTRY: 618,
  CHANNEL_LIST_END: 617,
  MOTD: 621,
  IGNORE_LIST: 320,
  IGNORE_ENTRY: 321,
  IGNORE: 322,
  UNIGNORE: 323,
  NOT_IGNORED: 324,
  ALREADY_IGNORED: 325,
  CLEAR_IGNORE: 326,
  WHOIS: 603,
  WHOIS_ACK: 604,
  WHOWAS: 605,
  PING_SERVER: 750,
  PING: 751,
  PONG: 752,
  EMOTE: 824,
  NAMES: 825,
  NAMES_REQ: 830,
  NAMES_END: 830,
  HISTORY: 11000,
  HISTORY_LINE: 11001,
  HISTORY_END: 11002,
  AWAY: 11003,
  AWAY_OUT: 11004,
  FAIL: 11016,
  TAGMSG: 11019,
  TAGMSG_OUT: 11020,
  REDACT: 11021,
  REDACT_OUT: 11022,
  EDIT: 11023,
  EDIT_OUT: 11024,
  KEY: 11029,
  KEY_OUT: 11030,
} as const

export type MsgType = (typeof Msg)[keyof typeof Msg]

export const MSG_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(Msg).map(([k, v]) => [v, k]),
)

export function encodePacket(type: number, payload = ''): Uint8Array {
  const body = new TextEncoder().encode(payload)
  const out = new Uint8Array(4 + body.length)
  const view = new DataView(out.buffer)
  view.setUint16(0, body.length, true)
  view.setUint16(2, type, true)
  out.set(body, 4)
  return out
}

export type Packet = { type: number; payload: string }

export class PacketReader {
  private buf = new Uint8Array(0)
  private decoder = new TextDecoder()

  push(chunk: Uint8Array): Packet[] {
    const next = new Uint8Array(this.buf.length + chunk.length)
    next.set(this.buf)
    next.set(chunk, this.buf.length)
    this.buf = next
    const out: Packet[] = []
    while (this.buf.length >= 4) {
      const view = new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength)
      const len = view.getUint16(0, true)
      const type = view.getUint16(2, true)
      if (this.buf.length < 4 + len) break
      const payload = this.decoder.decode(this.buf.subarray(4, 4 + len))
      out.push({ type, payload })
      this.buf = this.buf.subarray(4 + len)
    }
    return out
  }
}

export function send(sock: { write: (d: Uint8Array) => void }, type: number, payload = ''): void {
  sock.write(encodePacket(type, payload))
}
