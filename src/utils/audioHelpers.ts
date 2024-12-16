import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import toast from 'react-hot-toast';

const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB to stay safely under limit

export function createAudioContext(): AudioContext {
  return new (window.AudioContext || window.webkitAudioContext)();
}

export function createMediaStreamDestination(audioContext: AudioContext): MediaStreamAudioDestinationNode {
  return audioContext.createMediaStreamDestination();
}

export async function validateAudioBlob(blob: Blob): Promise<void> {
  if (!blob) {
    throw new Error('No audio data available');
  }
  if (blob.size === 0) {
    throw new Error('Audio recording is empty');
  }
  if (blob.size > MAX_CHUNK_SIZE) {
    throw new Error('Audio file size exceeds maximum limit');
  }
}

export function createAudioBlobFromChunks(chunks: Blob[]): Blob {
  try {
    if (!chunks.length) {
      throw new Error('No audio chunks available');
    }

    return new Blob(chunks, { type: 'audio/mp3' });
  } catch (error: any) {
    console.error('Error creating audio blob:', error);
    toast.error('Failed to process audio recording');
    throw new Error('Failed to create audio from recording chunks');
  }
}

export async function uploadAudioFile(meetingId: string, audioBlob: Blob): Promise<string> {
  try {
    await validateAudioBlob(audioBlob);
    
    toast('Uploading audio file...', {
      duration: 3000
    });

    // Compress audio for mobile if needed
    let uploadBlob = audioBlob;
    if (audioBlob.size > 5 * 1024 * 1024) { // 5MB threshold for mobile
      uploadBlob = await compressAudio(audioBlob);
    }
    
    const fileName = `audio_${Date.now()}.mp3`;
    const storageRef = ref(storage, `meetings/${meetingId}/${fileName}`);
    const uploadResult = await uploadBytes(storageRef, uploadBlob);
    
    if (!uploadResult.ref) {
      throw new Error('Upload failed - no reference returned');
    }

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    if (!downloadUrl) {
      throw new Error('Failed to get download URL');
    }

    toast.success('Audio file uploaded successfully');
    return downloadUrl;
  } catch (error: any) {
    console.error('Audio upload error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    let errorMessage = 'Failed to upload audio';
    if (error.code === 'storage/unauthorized') {
      errorMessage = 'Permission denied to upload audio file';
    } else if (error.code === 'storage/canceled') {
      errorMessage = 'Audio upload was cancelled';
    } else if (error.code === 'storage/unknown') {
      errorMessage = 'An unknown error occurred while uploading audio';
    }
    
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export function getMediaRecorderOptions(): MediaRecorderOptions {
  try {
    // Check for Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Define supported MIME types in order of preference
    const mimeTypes = [
      'audio/mp4',           // Safari preferred
      'audio/webm;codecs=opus', // Chrome/Firefox preferred
      'audio/webm',          // Fallback for Chrome/Firefox
      'audio/aac',           // Another Safari option
      'audio/mpeg'           // General fallback
    ];

    // Find the first supported MIME type
    const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

    if (!supportedType) {
      console.warn('No preferred MIME types supported, using default');
      return {
        audioBitsPerSecond: isMobile ? 96000 : 128000
      };
    }

    return {
      mimeType: supportedType,
      audioBitsPerSecond: isSafari || isMobile ? 96000 : 128000 // Lower bitrate for Safari and mobile
    };
  } catch (error: any) {
    console.error('Error getting media recorder options:', error);
    return {
      audioBitsPerSecond: 128000
    };
  }
}

export async function getAudioStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      }
    });

    if (!stream.getAudioTracks().length) {
      throw new Error('No audio track available in the stream');
    }

    return stream;
  } catch (error: any) {
    console.error('Error accessing audio stream:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'NotAllowedError') {
      toast.error('Microphone access denied. Please check your permissions.');
      throw new Error('Microphone access denied');
    }
    if (error.name === 'NotFoundError') {
      toast.error('No microphone found. Please connect a microphone and try again.');
      throw new Error('No microphone found');
    }
    if (error.name === 'NotReadableError') {
      toast.error('Cannot access microphone. Please check if it\'s being used by another application.');
      throw new Error('Cannot access microphone');
    }

    toast.error('Failed to access microphone');
    throw error;
  }
}

export async function getSystemAudioStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      preferCurrentTab: false, // Force system audio selection
      systemAudio: 'include',
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100,
        channelCount: 2
      },
      video: {
        displaySurface: 'monitor', // Default to entire screen
        width: { max: 1 },
        height: { max: 1 },
        frameRate: { max: 1 }
      }
    });

    // Get audio tracks
    const audioTracks = stream.getAudioTracks();
    
    // Stop video track immediately as we don't need it
    stream.getVideoTracks().forEach(track => track.stop());

    if (audioTracks.length === 0) {
      throw new Error('No system audio available. Please enable audio sharing in the dialog.');
    }

    // Create a new stream with only audio
    const audioStream = new MediaStream(audioTracks);
    return audioStream;
  } catch (error: any) {
    // Handle user cancellation without showing error
    if (error.name === 'NotAllowedError' || error.message === 'Permission denied') {
      throw new Error('CANCELLED');
    }
    
    // Handle no audio selected
    if (error.message === 'NO_AUDIO') {
      throw new Error('NO_AUDIO');
    }

    // For other errors, show a generic message
    console.error('System audio error:', error);
    throw new Error('SYSTEM_ERROR');
  }
}

async function compressAudio(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Create offline context for processing
          const offlineContext = new OfflineAudioContext(
            1, // mono
            audioBuffer.length,
            audioBuffer.sampleRate / 2 // reduce sample rate
          );

          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start();

          const renderedBuffer = await offlineContext.startRendering();
          const wavBlob = audioBufferToWav(renderedBuffer);
          resolve(new Blob([wavBlob], { type: 'audio/wav' }));
        } catch (error) {
          console.error('Audio compression error:', error);
          resolve(blob); // Fall back to original blob if compression fails
        }
      };

      fileReader.onerror = () => resolve(blob);
      fileReader.readAsArrayBuffer(blob);
    } catch (error) {
      console.error('Audio compression setup error:', error);
      resolve(blob);
    }
  });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = new DataView(new ArrayBuffer(44 + buffer.length * blockAlign));
  
  // WAV header
  writeString(data, 0, 'RIFF');
  data.setUint32(4, 36 + buffer.length * blockAlign, true);
  writeString(data, 8, 'WAVE');
  writeString(data, 12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, format, true);
  data.setUint16(22, numChannels, true);
  data.setUint32(24, sampleRate, true);
  data.setUint32(28, sampleRate * blockAlign, true);
  data.setUint16(32, blockAlign, true);
  data.setUint16(34, bitDepth, true);
  writeString(data, 36, 'data');
  data.setUint32(40, buffer.length * blockAlign, true);

  const channelData = new Float32Array(buffer.length);
  const output = new Int16Array(buffer.length);
  
  // Mix down to mono and convert to 16-bit PCM
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const channel = buffer.getChannelData(i);
    for (let j = 0; j < channelData.length; j++) {
      channelData[j] += channel[j];
    }
  }
  
  // Normalize and convert to 16-bit
  const factor = 1 / buffer.numberOfChannels;
  for (let i = 0; i < output.length; i++) {
    const sample = channelData[i] * factor;
    output[i] = Math.max(-32768, Math.min(32767, sample * 32768));
  }
  
  const bytes = new Uint8Array(output.buffer);
  for (let i = 0; i < bytes.length; i++) {
    data.setUint8(44 + i, bytes[i]);
  }
  
  return new Blob([data.buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}