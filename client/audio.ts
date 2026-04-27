// Single AudioContext for the whole page — used for response playback.
// HTMLAudioElement was unreliable on iOS (per-element unlock); routing
// playback through AudioContext + AudioBufferSourceNode unlocks globally
// once the context is resumed inside a user gesture.
let audioCtx: AudioContext | null = null
let audioUnlocked = false

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// Call this from a user gesture handler (button mousedown/touchstart/touchend
// or click). Must run BEFORE any await — Safari forgets the activation if a
// promise resolves between the gesture and resume().
export function unlockAudioPlayback(): void {
  if (audioUnlocked) return
  audioUnlocked = true
  const c = ctx()
  if (c.state === 'suspended') {
    // Fire and forget — we cannot await here without losing the gesture.
    c.resume().catch(() => {})
  }
}

// ---- Microphone capture ----

export class Recorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []

  // Keep the MediaStream alive for the page lifetime. iOS WebKit returns
  // muted/empty streams when re-acquiring the mic too soon after release.
  private async ensureStream(): Promise<MediaStream> {
    if (this.stream && this.stream.active) return this.stream
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return this.stream
  }

  async start(): Promise<void> {
    this.chunks = []
    const stream = await this.ensureStream()
    const mimeType = pickMimeType()
    this.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    // No timeslice: iOS Safari produces fragmented mp4 with timeslice, which
    // Scribe can't decode ("file corrupted"). Without timeslice, stop() emits
    // a single complete, well-formed file — that's what Scribe needs.
    this.recorder.start()
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder) {
        resolve(new Blob())
        return
      }
      const recorder = this.recorder
      const type = recorder.mimeType || 'audio/webm'

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        this.recorder = null
        resolve(new Blob(this.chunks, { type }))
      }

      recorder.onstop = finish
      recorder.stop()
      // Safety net for iOS where onstop sometimes fails to fire.
      setTimeout(finish, 1500)
    })
  }

  release(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
  }
}

function pickMimeType(): string | null {
  // mp4/AAC works in both MediaRecorder AND decodeAudioData on iOS WebKit.
  // iOS lies about webm/opus support: encoder works but decoder rejects the
  // bytes (WebKit Bugzilla 226922 / 238546 / 245428). Firefox doesn't record
  // mp4, so it falls through to webm where its decoder works fine.
  const candidates = [
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return null
}

// ---- Response audio playback (mp3 chunks → AudioContext) ----

export class StreamingPlayer {
  private chunks: Uint8Array[] = []

  push(chunk: ArrayBuffer): void {
    this.chunks.push(new Uint8Array(chunk))
  }

  takeBlob(): Blob | null {
    if (this.chunks.length === 0) return null
    const blob = new Blob(this.chunks as BlobPart[], { type: 'audio/mpeg' })
    this.chunks = []
    return blob
  }
}

export interface PlaybackHandle {
  stop: () => void
  pause: () => void
  resume: () => void
  readonly playing: boolean
  readonly done: Promise<void>
}

let activePlayback: PlaybackHandle | null = null

export function getActivePlayback(): PlaybackHandle | null {
  return activePlayback
}

export function stopActivePlayback(): void {
  if (activePlayback) {
    activePlayback.stop()
    activePlayback = null
  }
}

export async function playBlob(blob: Blob): Promise<PlaybackHandle> {
  const c = ctx()
  if (c.state === 'suspended') {
    try { await c.resume() } catch {}
  }
  const arr = await blob.arrayBuffer()
  const buf = await c.decodeAudioData(arr.slice(0))

  // AudioBufferSourceNode can't pause/resume, so we use a GainNode to
  // mute/unmute and track position manually for the pause illusion.
  // For true pause we'd need to stop + recreate at offset, which is
  // more complex. Simpler: just use the gain trick for "pause" UX.
  const src = c.createBufferSource()
  const gain = c.createGain()
  src.buffer = buf
  src.connect(gain)
  gain.connect(c.destination)

  let _playing = true
  let _stopped = false
  let resolvePromise: () => void

  const done = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  const finish = () => {
    _playing = false
    _stopped = true
    if (activePlayback === handle) activePlayback = null
    resolvePromise()
  }

  src.onended = finish

  const handle: PlaybackHandle = {
    stop: () => {
      if (_stopped) return
      try { src.stop() } catch {}
      finish()
    },
    pause: () => {
      if (!_playing || _stopped) return
      gain.gain.setValueAtTime(0, c.currentTime)
      _playing = false
    },
    resume: () => {
      if (_playing || _stopped) return
      gain.gain.setValueAtTime(1, c.currentTime)
      _playing = true
    },
    get playing() { return _playing },
    done,
  }

  // Stop any currently playing audio before starting new
  stopActivePlayback()
  activePlayback = handle

  src.start(0)
  return handle
}
