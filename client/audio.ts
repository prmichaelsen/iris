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
