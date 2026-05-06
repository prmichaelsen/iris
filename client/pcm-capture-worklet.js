// AudioWorklet processor: captures the input track, downsamples to 16 kHz,
// converts to Int16 LE, and posts ~100 ms chunks (1600 samples = 3200 bytes)
// to the main thread. Designed to feed ElevenLabs Scribe v2 Realtime.
//
// Box-filter decimation. Cheap, plenty good for speech at 48 → 16 kHz where
// the ratio is exactly 3 and the source is already AEC-cleaned voice.

const TARGET_RATE = 16000
const CHUNK_SAMPLES = 1600 // 100 ms at 16 kHz

class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // `sampleRate` is a global available inside AudioWorkletGlobalScope.
    this.ratio = sampleRate / TARGET_RATE
    this.acc = 0
    this.accCount = 0
    this.nextBoundary = this.ratio
    this.inputPos = 0
    this.outBuf = new Int16Array(CHUNK_SAMPLES)
    this.outIdx = 0
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch || ch.length === 0) return true

    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]
      this.accCount++
      this.inputPos++
      if (this.inputPos >= this.nextBoundary) {
        const avg = this.acc / this.accCount
        const clamped = avg > 1 ? 1 : avg < -1 ? -1 : avg
        this.outBuf[this.outIdx++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
        this.acc = 0
        this.accCount = 0
        this.nextBoundary += this.ratio

        if (this.outIdx >= CHUNK_SAMPLES) {
          // Copy out so the worklet can keep using outBuf without aliasing
          // the transferred buffer.
          const chunk = this.outBuf.slice().buffer
          this.port.postMessage(chunk, [chunk])
          this.outIdx = 0
        }
      }
    }
    return true
  }
}

registerProcessor('pcm-capture', PCMCaptureProcessor)
