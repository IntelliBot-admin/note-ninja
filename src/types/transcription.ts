export interface Speaker {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface Chapter {
  headline: string;
  gist: string;
  summary: string;
  start: number;
  end: number;
}

export interface Entity {
  entity_type: string;
  text: string;
  start: number;
  end: number;
}

export interface SentimentResult {
  text: string;
  start: number;
  end: number;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
}

export interface Topic {
  text: string;
  count: number;
  rank: number;
}

export interface TranscriptionAnalysis {
  speakers: Speaker[];
  chapters: Chapter[];
  entities: Entity[];
  sentiments: SentimentResult[];
  topics: Topic[];
  detectedLanguage?: string;
}