class AudioChunkProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffers = [];
    this.totalSize = 0;
    this.maxSize = 1024 * 1024; // 1MB chunks
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      this.buffers.push(Float32Array.from(samples));
      this.totalSize += samples.length * 4; // 4 bytes per float32

      if (this.totalSize >= this.maxSize) {
        this.port.postMessage({
          type: 'chunk',
          data: this.concatenateBuffers()
        });
        this.buffers = [];
        this.totalSize = 0;
      }
    }
    return true;
  }

  concatenateBuffers() {
    const totalLength = this.buffers.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of this.buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  }
}

registerProcessor('audio-chunk-processor', AudioChunkProcessor);