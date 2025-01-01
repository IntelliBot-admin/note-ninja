export class AudioStreamProcessor {
  private readonly chunks: Blob[] = [];
  private currentChunkSize = 0;
  private readonly maxChunkSize: number;
  private onChunkComplete: (chunk: Blob) => void;

  constructor(maxChunkSizeMB: number = 10, onChunkComplete: (chunk: Blob) => void) {
    this.maxChunkSize = maxChunkSizeMB * 1024 * 1024; // Convert MB to bytes
    this.onChunkComplete = onChunkComplete;
  }

  addData(data: Blob) {
    this.chunks.push(data);
    this.currentChunkSize += data.size;

    if (this.currentChunkSize >= this.maxChunkSize) {
      this.processCurrentChunk();
    }
  }

  private processCurrentChunk() {
    if (this.chunks.length === 0) return;

    const chunk = new Blob(this.chunks, { type: 'audio/mp3' });
    this.onChunkComplete(chunk);

    // Reset for next chunk
    this.chunks.length = 0;
    this.currentChunkSize = 0;
  }

  finish() {
    if (this.chunks.length > 0) {
      this.processCurrentChunk();
    }
  }
}

export function createAudioProcessor(audioContext: AudioContext) {
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  return processor;
}

export function initializeAudioWorklet(audioContext: AudioContext) {
  return audioContext.audioWorklet.addModule('/src/worklets/audio-processor.js');
}