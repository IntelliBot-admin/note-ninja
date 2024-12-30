import React, { useState, useRef, useEffect } from 'react';
import { Copy, Globe, Pencil, Lightbulb, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateText, SUPPORTED_LANGUAGES } from '../../utils/translate';
import { serverPost } from '../../utils/api';

interface Speaker {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface TranscriptDisplayProps {
  transcript: string;
  speakers?: Speaker[];
  onUpdateSpeaker?: (oldName: string, newName: string) => void;
}

interface Suggestion {
  type: 'Question' | 'Suggestion';
  text: string;
}

export function TranscriptDisplay({ transcript, speakers, onUpdateSpeaker }: TranscriptDisplayProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (transcriptRef.current) {
      const element = transcriptRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [transcript, translatedText]);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetLanguage = e.target.value;
    setSelectedLanguage(targetLanguage);

    if (!targetLanguage) {
      setTranslatedText('');
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(transcript, targetLanguage);
      setTranslatedText(translated);
      toast.success(`Translated to ${SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]}`);
    } catch (error) {
      toast.error('Translation failed. Please try again.');
      setSelectedLanguage('');
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const textToCopy = translatedText || transcript;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast.error('Failed to copy text');
    }
  };

  const handleGetSuggestions = async () => {
    try {
      setIsLoadingSuggestions(true);
      console.log('Getting suggestions...');
      const response = await serverPost('/get-suggestions', {
        transcript: speakers
      });
      const parsedSuggestions = response.suggestions.map((item: string) => {
        const [type, ...textParts] = item.split(': ');
        return {
          type: type as 'Question' | 'Suggestion',
          text: textParts.join(': ')
        };
      });
      setSuggestions(parsedSuggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSpeakerEdit = (speaker: string) => {
    setEditingSpeaker(speaker);
    setNewSpeakerName(speaker);
  };

  const handleSpeakerUpdate = (oldName: string) => {
    if (newSpeakerName && onUpdateSpeaker) {
      onUpdateSpeaker(oldName, newSpeakerName);
    }
    setEditingSpeaker(null);
  };

  const SuggestionsPanel = () => {
    if (suggestions.length === 0 && !isLoadingSuggestions) return null;

    return (
      <div className="absolute bottom-16 right-4 w-96 bg-white rounded-lg shadow-lg border p-4 mb-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900">AI Suggestions</h3>
          <button 
            onClick={() => setSuggestions([])} 
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {isLoadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  suggestion.type === 'Question' 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {suggestion.type}
                </div>
                <p className="text-sm text-gray-600 flex-1">{suggestion.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!transcript) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-[400px] relative">
        <p className="text-gray-400 italic">
          Your transcribed text will appear here...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 h-[400px] relative">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <select
          value={selectedLanguage}
          onChange={handleLanguageChange}
          disabled={isTranslating}
          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Original (English)</option>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div ref={transcriptRef} className="prose max-w-none h-full overflow-y-auto pt-12 scroll-smooth">
        {isTranslating ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : speakers && speakers.length > 0 && !translatedText ? (
          <div className="space-y-4">
            {speakers.map((utterance, index) => (
              <div key={index} className="flex space-x-3">
                <div className="flex-shrink-0">
                  {editingSpeaker === utterance.speaker ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newSpeakerName}
                        onChange={(e) => setNewSpeakerName(e.target.value)}
                        className="px-2 py-1 text-sm border rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSpeakerUpdate(utterance.speaker);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSpeakerUpdate(utterance.speaker)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center space-x-1">
                      <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium">
                        {utterance.speaker.length === 1 ? `Speaker ${utterance.speaker}` : utterance.speaker}
                      </span>
                      {onUpdateSpeaker && (
                        <button
                          onClick={() => handleSpeakerEdit(utterance.speaker)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
                <p className="flex-1">{utterance.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{translatedText || transcript}</p>
        )}
      </div>

      <SuggestionsPanel />

      <div className="absolute bottom-4 right-4">
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy Text
        </button>
        <button
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 ml-2"
          onClick={handleGetSuggestions}
        >
          <Lightbulb className="w-4 h-4 mr-1" />
          Get Suggestions
        </button>
      </div>
    </div>
  );
}