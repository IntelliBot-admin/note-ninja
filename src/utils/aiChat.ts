import { Configuration, OpenAIApi } from 'openai';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

interface ChatContext {
  relevantContent: any[];
  conversationHistory: { role: string; content: string; }[];
}

export async function generateAIResponse(
  query: string,
  context: ChatContext
): Promise<string> {
  try {
    // Format relevant content for context
    const contextText = context.relevantContent
      .map(item => {
        const date = new Date(item.metadata.date).toLocaleDateString();
        return `
From ${item.metadata.title} (${date}):
${item.content}
        `;
      })
      .join('\n\n');

    const messages = [
      {
        role: 'system',
        content: `You are an AI meeting assistant with access to meeting notes, transcripts, and summaries. 
        Answer questions naturally and conversationally based on the provided context.
        
        Here is the relevant meeting information:
        
        ${contextText}
        
        Guidelines:
        1. Provide specific, detailed answers based on the meeting data
        2. Include relevant dates and participant names
        3. Maintain a professional but conversational tone
        4. If information is not found in the context, clearly state that
        5. Keep responses concise but informative
        6. Use natural language in responses`
      },
      ...context.conversationHistory,
      {
        role: 'user',
        content: query
      }
    ];

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.data.choices[0].message?.content || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}