import { apiFetch } from './api';

export async function generateSummary(
  transcript: string, 
  meetingType: string,
  includeEmojis: boolean = true
): Promise<string> {
  const data = await apiFetch('/generateAISummary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      meetingType,
      includeEmojis
    })
  });
  
  return data.summary;
}

