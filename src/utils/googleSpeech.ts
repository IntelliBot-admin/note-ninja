import { SpeechClient } from '@google-cloud/speech';
import toast from 'react-hot-toast';

// Initialize the client with credentials from environment variable
const credentials = JSON.parse(import.meta.env.VITE_GOOGLE_APPLICATION_CREDENTIALS);
const speechClient = new SpeechClient({ credentials });

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    toast('Starting transcription...', {
      icon: '🎯',
      duration: 3000
    });

    // Convert audio blob to base64
    const audioBytes = await blobToBase64(audioBlob);

    // Configure the request
    const audio = {
      content: audioBytes
    };
    
    const config = {
      encoding: 'MP3',
      sampleRateHertz: 44100,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long', // Better for longer recordings
      useEnhanced: true, // Better accuracy
      metadata: {
        interactionType: 'DISCUSSION',
        industryNaicsCodeOfAudio: 541990, // Professional Services
        microphoneDistance: 'NEARFIELD',
        originalMediaType: 'AUDIO',
        recordingDeviceType: 'SMARTPHONE_OR_COMPUTER',
      }
    };

    // Make the request
    const [response] = await speechClient.recognize({
      audio,
      config
    });

    // Process results
    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join('\n');

    if (!transcription) {
      throw new Error('No transcription generated');
    }

    toast.success('Transcription completed successfully');
    return transcription;

  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // User-friendly error messages
    if (error.code === 3) {
      toast.error('Invalid audio format. Please try recording again.');
    } else if (error.code === 8) {
      toast.error('Audio file too large. Try recording in shorter segments.');
    } else if (error.code === 7) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('Failed to transcribe audio. Please try again.');
    }

    throw error;
  }
}

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert audio to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}