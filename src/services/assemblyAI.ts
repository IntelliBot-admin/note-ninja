import { AssemblyAI } from 'assemblyai';
import toast from 'react-hot-toast';
import { uploadAudioFile } from '../utils/audioHelpers';
import { apiFetch } from '../utils/api';

const client = new AssemblyAI({
  apiKey: import.meta.env.VITE_ASSEMBLYAI_API_KEY,
});

export async function startStreamingTranscription(audioBlob: Blob, onTranscriptUpdate: (text: string) => void) {
  try {
    const SAMPLE_RATE = 16000;
    
    const transcriber = client.realtime.transcriber({
      sampleRate: SAMPLE_RATE,
      encoding: 'mp3'
    });

    transcriber.on('open', () => {
      console.log('WebSocket connection opened');
    });

    transcriber.on('error', (error) => {
      console.error('Transcription error:', error);
      toast.error('Transcription error occurred');
    });

    transcriber.on('transcript', (transcript) => {
      if (transcript.text) {
        if (transcript.message_type === 'FinalTranscript') {
          onTranscriptUpdate(transcript.text);
        }
      }
    });

    await transcriber.connect();
    
    // Convert blob to stream and pipe to transcriber
    const reader = audioBlob.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await transcriber.sendAudio(value);
    }

    await transcriber.close();
  } catch (error) {
    console.error('Streaming transcription error:', error);
    throw error;
  }
}

// export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string; utterances?: any[] }> {
//   try {
//     const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
//       method: 'POST',
//       headers: {
//         'Authorization': import.meta.env.VITE_ASSEMBLYAI_API_KEY
//       },
//       body: audioBlob
//     });

//     if (!uploadResponse.ok) {      
//       throw new Error('Failed to upload audio');
//     }

//     const { upload_url } = await uploadResponse.json();

//     const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
//       method: 'POST',
//       headers: {
//         'Authorization': import.meta.env.VITE_ASSEMBLYAI_API_KEY,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         audio_url: upload_url,
//         speaker_labels: true
//       })
//     });

//     if (!transcriptResponse.ok) {
//       throw new Error('Failed to start transcription');
//     }

//     const { id } = await transcriptResponse.json();
    
//     // Poll for completion
//     while (true) {
//       const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
//         headers: {
//           'Authorization': import.meta.env.VITE_ASSEMBLYAI_API_KEY
//         }
//       });

//       const transcriptionResult = await pollingResponse.json();

//       if (transcriptionResult.status === 'completed') {
//         return {
//           text: transcriptionResult.text,
//           utterances: transcriptionResult.utterances
//         };
//       } else if (transcriptionResult.status === 'error') {
//         throw new Error('Transcription failed');
//       }

//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
//   } catch (error) {
//     console.error('Transcription error:', error);
//     throw error;
//   }
// }

export async function transcribeAudio(audioUrl: string, meetingId: string): Promise<{ text: string; utterances?: any[] }> {
  
  const result = await apiFetch('/transcribeAudio', {
    method: 'POST',
    body: JSON.stringify({
      audioUrl,
      meetingId
    })
  });

  console.log(result,'result');

  return result;
}
