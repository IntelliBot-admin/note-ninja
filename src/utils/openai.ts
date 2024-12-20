import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

export const generateResponse = async (
  prompt: string,
  context: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an AI meeting assistant. Use the following context to answer questions about meetings: ${context}`
        },
        ...conversationHistory,
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

export default openai;