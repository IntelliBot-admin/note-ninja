import React from 'react';
import { TranscriptionAnalysis } from '../../types/transcription';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Users, BookOpen, Tag, MessageCircle, Languages, AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  analysis: Partial<TranscriptionAnalysis>;
}

export default function TranscriptionAnalysisView({ analysis }: Props) {
  const hasNoFeatures = !analysis.speakers?.length && 
                       !analysis.chapters?.length && 
                       !analysis.entities?.length && 
                       !analysis.sentiments?.length && 
                       !analysis.topics?.length && 
                       !analysis.detectedLanguage;

  if (hasNoFeatures) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-medium text-yellow-800">Advanced Features Not Available</h3>
        </div>
        <p className="mt-2 text-yellow-700">
          Advanced analysis features are not enabled for your AssemblyAI account. 
          Please visit your AssemblyAI dashboard to enable additional features.
        </p>
      </div>
    );
  }

  // Only prepare sentiment data if we have sentiment analysis results
  const sentimentData = analysis.sentiments ? {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      label: 'Sentiment Distribution',
      data: [
        analysis.sentiments.filter(s => s.sentiment === 'POSITIVE').length,
        analysis.sentiments.filter(s => s.sentiment === 'NEUTRAL').length,
        analysis.sentiments.filter(s => s.sentiment === 'NEGATIVE').length
      ],
      backgroundColor: ['#10B981', '#6B7280', '#EF4444']
    }]
  } : null;

  return (
    <div className="space-y-6">
      {/* Language Detection */}
      {analysis.detectedLanguage && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Languages className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium">Detected Language</h3>
          </div>
          <p className="text-gray-700">{analysis.detectedLanguage}</p>
        </div>
      )}

      {/* Speakers Section */}
      {analysis.speakers && analysis.speakers.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium">Speakers</h3>
          </div>
          <div className="space-y-3">
            {analysis.speakers.map((utterance, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded">
                <div className="font-medium text-indigo-600 mb-1">
                  Speaker {utterance.speaker}
                </div>
                <p className="text-gray-700">{utterance.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapters Section */}
      {analysis.chapters && analysis.chapters.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium">Chapters</h3>
          </div>
          <div className="space-y-4">
            {analysis.chapters.map((chapter, index) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4">
                <h4 className="font-medium text-lg">{chapter.headline}</h4>
                <p className="text-gray-600 text-sm mt-1">{chapter.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entities Section */}
      {analysis.entities && analysis.entities.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium">Detected Entities</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.entities.map((entity, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                title={entity.entity_type}
              >
                {entity.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {sentimentData && analysis.sentiments && analysis.sentiments.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium">Sentiment Analysis</h3>
          </div>
          <div className="h-64">
            <Bar
              data={sentimentData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Topics */}
      {analysis.topics && analysis.topics.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium">Key Topics</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.topics.map((topic, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center space-x-2"
              >
                <span>{topic.text}</span>
                <span className="bg-gray-200 px-2 rounded-full text-xs">
                  {topic.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}