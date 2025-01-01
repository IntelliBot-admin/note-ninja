import { create } from 'zustand';
import { generateEmbedding, generateResponse } from '../utils/openai';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cosineSimilarity } from '../utils/vectorUtils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  processUserQuery: (query: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  processUserQuery: async (userQuery: string) => {
    try {
      set({ isLoading: true });

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: userQuery,
        timestamp: Date.now()
      };
      get().addMessage(userMessage);

      // Generate embedding for user query
      const queryEmbedding = await generateEmbedding(userQuery);

      // Fetch all meetings from Firestore
      const meetingsRef = collection(db, 'meetings');
      const meetingsSnapshot = await getDocs(query(meetingsRef));
      
      // Find relevant meetings by comparing embeddings
      const relevantMeetings = meetingsSnapshot.docs
        .filter(doc => doc.data().embeddings)
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          similarity: cosineSimilarity(queryEmbedding, doc.data().embeddings)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3); // Get top 3 most relevant meetings

      // Create context from relevant meetings
      const context = relevantMeetings
        .map(meeting => `Meeting "${meeting.title}" (${new Date(meeting.date).toLocaleDateString()}):
          ${meeting.content}
          ${meeting.summary || ''}`)
        .join('\n\n');

      // Generate response using context and conversation history
      const conversationHistory = get().messages.slice(-4); // Last 4 messages for context
      const response = await generateResponse(userQuery, context, conversationHistory);

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      get().addMessage(assistantMessage);

    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: Date.now()
      };
      get().addMessage(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  }
}));