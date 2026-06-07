/**
 * Audio Fingerprinter for Browser Extension
 * Captures audio from HTML5 video and extracts fingerprints for episode matching
 */

interface FingerprintMessage {
  type: 'FINGERPRINT';
  payload: {
    fingerprints: number[];
    duration: number;
    timestamp: number;
  };
}

export class AudioFingerprinter {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private video: HTMLVideoElement | null = null;
  private fingerprintBuffer: Float32Array[] = [];
  private isCapturing: boolean = false;
  private onFingerprintReady: ((fingerprints: number[], duration: number) => void) | null = null;

  // Fingerprinting parameters (matching Python backend)
  private readonly FFT_SIZE = 4096;
  private readonly SAMPLE_RATE = 44100;
  private readonly MIN_FREQ = 300;
  private readonly MAX_FREQ = 3000;
  private readonly PEAK_THRESHOLD = 0.7;
  private readonly TOP_N_PEAKS = 15;

  constructor() {
    // Initialize when user grants permission
  }

  /**
   * Start capturing audio from video element
   */
  async start(video: HTMLVideoElement): Promise<boolean> {
    try {
      this.video = video;
      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      
      // Create audio source from video
      this.sourceNode = this.audioContext.createMediaElementSource(video);
      
      // Create script processor for audio analysis
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect nodes
      this.sourceNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      // Process audio data
      this.processor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        this.processAudioFrame(inputData);
      };
      
      this.isCapturing = true;
      return true;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      return false;
    }
  }

  /**
   * Stop audio capture
   */
  stop(): void {
    this.isCapturing = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.fingerprintBuffer = [];
  }

  /**
   * Process audio frame and extract fingerprints
   */
  private processAudioFrame(samples: Float32Array): void {
    // Apply Hanning window
    const windowed = this.applyHanningWindow(samples);
    
    // Compute FFT
    const spectrum = this.computeFFT(windowed);
    const magnitude = this.computeMagnitude(spectrum);
    
    // Get frequency bins
    const freqs = this.getFrequencyBins(magnitude.length);
    
    // Filter frequency range
    const validIndices = this.filterFrequencyRange(freqs, magnitude);
    
    if (validIndices.length === 0) return;
    
    // Find spectral peaks
    const peaks = this.findPeaks(validIndices, magnitude, freqs);
    
    // Generate hashes from peak pairs
    const hashes = this.generateHashes(peaks);
    
    // Store fingerprints
    this.fingerprintBuffer.push(new Float32Array(hashes));
    
    // After collecting enough frames, send to callback
    if (this.fingerprintBuffer.length >= 10 && this.onFingerprintReady) {
      const allHashes = Array.from(this.fingerprintBuffer).flat();
      const duration = (this.fingerprintBuffer.length * 4096) / this.SAMPLE_RATE;
      
      this.onFingerprintReady(allHashes, duration);
      this.fingerprintBuffer = [];
    }
  }

  /**
   * Apply Hanning window to samples
   */
  private applyHanningWindow(samples: Float32Array): Float32Array {
    const windowed = new Float32Array(samples.length);
    const N = samples.length;
    
    for (let i = 0; i < N; i++) {
      const hanning = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
      windowed[i] = samples[i] * hanning;
    }
    
    return windowed;
  }

  /**
   * Compute FFT using Cooley-Tukey algorithm
   */
  private computeFFT(samples: Float32Array): ComplexArray {
    // Simple DFT implementation (replace with optimized FFT in production)
    const N = samples.length;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    
    for (let k = 0; k < N; k++) {
      let sumReal = 0;
      let sumImag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        sumReal += samples[n] * Math.cos(angle);
        sumImag += samples[n] * Math.sin(angle);
      }
      
      real[k] = sumReal;
      imag[k] = sumImag;
    }
    
    return { real, imag };
  }

  /**
   * Compute magnitude spectrum
   */
  private computeMagnitude(spectrum: ComplexArray): Float32Array {
    const N = spectrum.real.length / 2; // Only need first half
    const magnitude = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
      magnitude[i] = Math.sqrt(
        spectrum.real[i] ** 2 + spectrum.imag[i] ** 2
      );
    }
    
    return magnitude;
  }

  /**
   * Get frequency values for each bin
   */
  private getFrequencyBins(numBins: number): Float32Array {
    const freqs = new Float32Array(numBins);
    const binWidth = this.SAMPLE_RATE / (this.FFT_SIZE * 2);
    
    for (let i = 0; i < numBins; i++) {
      freqs[i] = i * binWidth;
    }
    
    return freqs;
  }

  /**
   * Filter indices by frequency range
   */
  private filterFrequencyRange(
    freqs: Float32Array, 
    magnitude: Float32Array
  ): number[] {
    const validIndices: number[] = [];
    
    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] >= this.MIN_FREQ && freqs[i] <= this.MAX_FREQ) {
        validIndices.push(i);
      }
    }
    
    return validIndices;
  }

  /**
   * Find spectral peaks
   */
  private findPeaks(
    indices: number[], 
    magnitude: Float32Array, 
    freqs: Float32Array
  ): Peak[] {
    if (indices.length === 0) return [];
    
    // Normalize magnitudes
    const maxMag = Math.max(...indices.map(i => magnitude[i]));
    if (maxMag === 0) return [];
    
    const peaks: Peak[] = [];
    
    for (let j = 1; j < indices.length - 1; j++) {
      const i = indices[j];
      const prevI = indices[j - 1];
      const nextI = indices[j + 1];
      
      if (
        magnitude[i] / maxMag > this.PEAK_THRESHOLD &&
        magnitude[i] > magnitude[prevI] &&
        magnitude[i] > magnitude[nextI]
      ) {
        peaks.push({
          frequency: freqs[i],
          amplitude: magnitude[i],
          binIndex: i
        });
      }
    }
    
    // Sort by amplitude and keep top N
    peaks.sort((a, b) => b.amplitude - a.amplitude);
    return peaks.slice(0, this.TOP_N_PEAKS);
  }

  /**
   * Generate combinatorial hashes from peak pairs
   */
  private generateHashes(peaks: Peak[]): number[] {
    const hashes: number[] = [];
    
    for (let i = 0; i < peaks.length; i++) {
      for (let j = i + 1; j < Math.min(i + 6, peaks.length); j++) {
        const peak1 = peaks[i];
        const peak2 = peaks[j];
        
        // Quantize frequencies to bins
        const freq1Bin = Math.floor(peak1.frequency / 10);
        const freq2Bin = Math.floor(peak2.frequency / 10);
        
        // Time delta (simplified - in reality would use actual time offset)
        const deltaTime = Math.floor((peak2.binIndex - peak1.binIndex) / 10);
        
        // Create hash
        const hash = (freq1Bin << 20) | (freq2Bin << 10) | deltaTime;
        hashes.push(hash);
      }
    }
    
    return hashes;
  }

  /**
   * Set callback for when fingerprints are ready
   */
  setOnFingerprintReady(callback: (fingerprints: number[], duration: number) => void): void {
    this.onFingerprintReady = callback;
  }

  /**
   * Capture fingerprints for a specific duration
   */
  async captureForDuration(durationMs: number): Promise<{ fingerprints: number[], duration: number }> {
    return new Promise((resolve) => {
      this.setOnFingerprintReady((fingerprints, duration) => {
        this.stop();
        resolve({ fingerprints, duration });
      });
      
      setTimeout(() => {
        this.stop();
        resolve({ fingerprints: [], duration: 0 });
      }, durationMs);
    });
  }
}

interface ComplexArray {
  real: Float32Array;
  imag: Float32Array;
}

interface Peak {
  frequency: number;
  amplitude: number;
  binIndex: number;
}

// Singleton instance
export const audioFingerprinter = new AudioFingerprinter();
