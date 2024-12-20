import { pipeline } from '@xenova/transformers';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Initialize the embedding model
let embeddingModel: any = null;

async function getEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingModel;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbeddingModel();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function storeEmbedding(
  content: string,
  metadata: {
    meetingId: string;
    userId: string;
    title: string;
    date: Date;
    type: 'meeting' | 'note' | 'transcript' | 'summary';
  }
) {
  try {
    const embedding = await generateEmbedding(content);
    
    await addDoc(collection(db, 'vectorStore'), {
      content,
      embedding,
      metadata,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error storing embedding:', error);
    throw error;
  }
}

export async function searchSimilarContent(query: string, userId: string): Promise<any[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    // Get all vectors for the user
    const vectorsQuery = query(
      collection(db, 'vectorStore'),
      where('metadata.userId', '==', userId)
    );
    
    const vectorDocs = await getDocs(vectorsQuery);
    const vectors = vectorDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate cosine similarity
    const results = vectors.map(vector => ({
      ...vector,
      similarity: cosineSimilarity(queryEmbedding, vector.embedding)
    }));

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .filter(result => result.similarity > 0.7) // Minimum similarity threshold
      .slice(0, 5); // Top 5 results
  } catch (error) {
    console.error('Error searching similar content:', error);
    throw error;
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}