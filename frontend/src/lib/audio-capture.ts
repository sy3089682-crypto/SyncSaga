/**
 * Audio Capture Module
 *
 * Captures audio from the browser's MediaStream for audio fingerprinting.
 * Used to extract audio snippets from the playing video for cross-source sync.
 */

export class AudioCapture {
  private audioContext: AudioContext | null = null
  private mediaSource: MediaElementAudioSourceNode | null = null
  private streamNode: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private analyser: AnalyserNode | null = null
  private isCapturing = false
  private onData: ((buffer: Float32Array) => void) | null = null
  private sampleRate = 22050

  async startCapture(
    videoElement: HTMLVideoElement,
    onChunk: (buffer: Float32Array) => void,
    options?: { sampleRate?: number; chunkDurationMs?: number }
  ) {
    if (this.isCapturing) return

    this.sampleRate = options?.sampleRate || 22050
    this.onData = onChunk
    const chunkDuration = options?.chunkDurationMs || 10000

    try {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate })
      this.mediaSource = this.audioContext.createMediaElementSource(videoElement)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 4096

      const bufferSize = Math.floor((this.sampleRate * chunkDuration) / 1000)
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

      this.mediaSource.connect(this.analyser)
      this.analyser.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.processor.onaudioprocess = (e) => {
        if (!this.onData) return
        const input = e.inputBuffer.getChannelData(0)
        this.onData(new Float32Array(input))
      }

      this.isCapturing = true
    } catch (err) {
      console.warn('AudioCapture: Could not capture audio (CORS or browser restriction)', err)
    }
  }

  async startCaptureFromStream(stream: MediaStream, onChunk: (buffer: Float32Array) => void) {
    if (this.isCapturing) return

    try {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate })
      this.streamNode = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 4096

      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      this.streamNode.connect(this.analyser)
      this.analyser.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        onChunk(new Float32Array(input))
      }

      this.isCapturing = true
    } catch (err) {
      console.warn('AudioCapture: Could not capture from stream', err)
    }
  }

  stopCapture() {
    this.isCapturing = false
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.mediaSource) {
      this.mediaSource.disconnect()
      this.mediaSource = null
    }
    if (this.streamNode) {
      this.streamNode.disconnect()
      this.streamNode = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.onData = null
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyser
  }

  isActive(): boolean {
    return this.isCapturing
  }
}

export function float32ToWav(buffer: Float32Array, sampleRate: number): Blob {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = buffer.length * (bitsPerSample / 8)
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i]))
    const val = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    view.setInt16(offset, val, true)
    offset += 2
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}
