export class Recorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []

  async start(): Promise<void> {
    this.chunks = []
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder) {
        resolve(new Blob())
        return
      }
      this.recorder.onstop = () => {
        const type = this.recorder?.mimeType || 'audio/webm'
        this.stream?.getTracks().forEach((t) => t.stop())
        this.stream = null
        this.recorder = null
        resolve(new Blob(this.chunks, { type }))
      }
      this.recorder.stop()
    })
  }
}

function pickMimeType(): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return null
}

export class StreamingPlayer {
  private chunks: Uint8Array[] = []
  private audio: HTMLAudioElement | null = null

  push(chunk: ArrayBuffer): void {
    this.chunks.push(new Uint8Array(chunk))
  }

  async playAll(): Promise<void> {
    if (this.chunks.length === 0) return
    const blob = new Blob(this.chunks as BlobPart[], { type: 'audio/mpeg' })
    this.chunks = []
    const url = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    try {
      await this.audio.play()
      await new Promise<void>((resolve) => {
        if (!this.audio) return resolve()
        this.audio.onended = () => resolve()
        this.audio.onerror = () => resolve()
      })
    } finally {
      URL.revokeObjectURL(url)
      this.audio = null
    }
  }

  stop(): void {
    this.audio?.pause()
    this.audio = null
    this.chunks = []
  }
}

// ---- Bilingual prefix concat + WAV encode ----

let audioCtx: AudioContext | null = null
let cachedPrefix: AudioBuffer | null = null
let prefixPromise: Promise<AudioBuffer> | null = null

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

async function loadPrefix(): Promise<AudioBuffer> {
  if (cachedPrefix) return cachedPrefix
  if (prefixPromise) return prefixPromise
  prefixPromise = (async () => {
    const res = await fetch('/api/prefix.mp3')
    if (!res.ok) throw new Error(`prefix fetch ${res.status}`)
    const arr = await res.arrayBuffer()
    const buf = await ctx().decodeAudioData(arr)
    cachedPrefix = buf
    return buf
  })()
  return prefixPromise
}

export async function withPrefixAsWav(userBlob: Blob): Promise<Blob> {
  const userArr = await userBlob.arrayBuffer()
  let userAudio: AudioBuffer
  try {
    userAudio = await ctx().decodeAudioData(userArr.slice(0))
  } catch (err) {
    throw new Error(
      `Cannot decode user audio (type=${userBlob.type || 'unknown'}, size=${userBlob.size}). ` +
        `Browser may not support this codec in Web Audio API. Original: ${err instanceof Error ? err.message : err}`,
    )
  }
  let prefix: AudioBuffer
  try {
    prefix = await loadPrefix()
  } catch (err) {
    throw new Error(
      `Cannot load prefix audio. Original: ${err instanceof Error ? err.message : err}`,
    )
  }

  // Mix to mono and align sample rate to the user audio's rate
  const sampleRate = userAudio.sampleRate
  const userMono = toMono(userAudio)
  const prefixMono =
    prefix.sampleRate === sampleRate
      ? toMono(prefix)
      : await resampleMono(prefix, sampleRate)

  const merged = new Float32Array(prefixMono.length + userMono.length)
  merged.set(prefixMono, 0)
  merged.set(userMono, prefixMono.length)

  return encodeWav(merged, sampleRate)
}

function toMono(buf: AudioBuffer): Float32Array {
  if (buf.numberOfChannels === 1) return buf.getChannelData(0)
  const l = buf.getChannelData(0)
  const r = buf.getChannelData(1)
  const m = new Float32Array(l.length)
  for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) * 0.5
  return m
}

async function resampleMono(buf: AudioBuffer, targetRate: number): Promise<Float32Array> {
  const targetLength = Math.ceil(buf.duration * targetRate)
  const offline = new OfflineAudioContext(1, targetLength, targetRate)
  const src = offline.createBufferSource()
  // Down-mix to mono into a fresh buffer at the source's rate
  const monoBuf = offline.createBuffer(1, buf.length, buf.sampleRate)
  // Copy into a fresh ArrayBuffer-backed view to satisfy strict typings
  const mono = new Float32Array(toMono(buf))
  monoBuf.copyToChannel(mono, 0, 0)
  src.buffer = monoBuf
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLen = samples.length * 2 // 16-bit PCM mono
  const buffer = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLen, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)        // fmt chunk size
  view.setUint16(20, 1, true)         // PCM format
  view.setUint16(22, 1, true)         // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)         // block align
  view.setUint16(34, 16, true)        // bits per sample
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataLen, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}
