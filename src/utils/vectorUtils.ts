
import { pipeline } from '@huggingface/transformers';
import { EmbeddingModelType } from '@/hooks/useAiModel';

// Interface for vector store chunks
export interface VectorChunk {
  id: string;
  text: string;
  embedding: number[];
  documentId: string;
  documentName: string;
  folderId: string;
  score?: number; // Add score property as optional
}

// Simple in-memory vector store for demo purposes
// In a real application, this would be persisted to IndexedDB or similar
let inMemoryVectorStore: VectorChunk[] = [
  {
    id: 'chunk1',
    text: 'Quy chuẩn về chiều cao tối thiểu của tầng 1 các công trình dân dụng tại TP.HCM là 3.6m tính từ mặt nền đến trần. Riêng đối với nhà ở riêng lẻ, chiều cao tối thiểu có thể là 3.2m.',
    embedding: Array(384).fill(0).map(() => Math.random() - 0.5), // Random dummy embeddings
    documentId: '1',
    documentName: 'Quy chuẩn thiết kế 01-2021',
    folderId: 'standards-architecture'
  },
  {
    id: 'chunk2',
    text: 'Hồ sơ quy hoạch 1/500 ở Quận 12 TP.HCM cần bao gồm các bản vẽ quy hoạch tổng mặt bằng, thiết kế đô thị, quy hoạch giao thông và hệ thống hạ tầng kỹ thuật, kèm theo thuyết minh dự án.',
    embedding: Array(384).fill(0).map(() => Math.random() - 0.5),
    documentId: '2',
    documentName: 'Thông tư 16-2019 Quy hoạch xây dựng',
    folderId: 'standards-architecture'
  },
  {
    id: 'chunk3',
    text: 'Theo Luật Xây dựng 2020, công trình xây dựng phải có giấy phép xây dựng do cơ quan nhà nước có thẩm quyền cấp trước khi khởi công xây dựng, trừ những trường hợp được miễn giấy phép xây dựng.',
    embedding: Array(384).fill(0).map(() => Math.random() - 0.5),
    documentId: '3',
    documentName: 'Luật Xây dựng 2020',
    folderId: 'legal-investment'
  },
  {
    id: 'chunk4',
    text: 'Tại TP.HCM, các công trình xây dựng nằm trong khu vực quy hoạch đô thị cần tuân thủ quy định về mật độ xây dựng tối đa là 60% đối với nhà ở riêng lẻ và 40% đối với chung cư cao tầng.',
    embedding: Array(384).fill(0).map(() => Math.random() - 0.5),
    documentId: '2',
    documentName: 'Thông tư 16-2019 Quy hoạch xây dựng',
    folderId: 'local-hcmc'
  },
  {
    id: 'chunk5',
    text: 'Quy chuẩn PCCC đối với nhà cao tầng tại Việt Nam yêu cầu mỗi tầng phải có ít nhất 2 lối thoát hiểm, với chiều rộng thông thủy tối thiểu 1.2m. Khoảng cách tối đa từ điểm xa nhất đến cầu thang thoát hiểm không quá 25m.',
    embedding: Array(384).fill(0).map(() => Math.random() - 0.5),
    documentId: '1',
    documentName: 'Quy chuẩn thiết kế 01-2021',
    folderId: 'standards-fireprotection'
  }
];

// Generate embedding for a text query
export const generateEmbedding = async (text: string, modelId: EmbeddingModelType): Promise<number[]> => {
  try {
    // Create a pipeline for feature extraction
    const extractor = await pipeline(
      "feature-extraction",
      modelId,
      { revision: "main" }
    );
    
    // Generate embedding
    const result = await extractor(text, { pooling: "mean", normalize: true });
    
    // Convert to array of numbers
    return Array.from(result.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Return a mock embedding in case of error (for demo purposes)
    return Array(384).fill(0).map(() => Math.random() - 0.5);
  }
};

// Calculate cosine similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Search for similar chunks in the vector store
export const searchSimilarChunks = async (
  query: string, 
  modelId: EmbeddingModelType,
  folderIds: string[] = [], 
  limit: number = 5
): Promise<VectorChunk[]> => {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, modelId);
    
    // Filter by folders if specified
    let filteredChunks = inMemoryVectorStore;
    if (folderIds.length > 0) {
      filteredChunks = inMemoryVectorStore.filter(chunk => folderIds.includes(chunk.folderId));
    }
    
    // Calculate similarity scores
    const scoredChunks = filteredChunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity score (descending)
    scoredChunks.sort((a, b) => b.score - a.score);
    
    // Return top N results
    return scoredChunks.slice(0, limit);
  } catch (error) {
    console.error('Error searching similar chunks:', error);
    return [];
  }
};

// Check system RAM
export const checkSystemRAM = (): { totalRAM: number, warning: boolean } => {
  try {
    // Mock implementation since we can't access navigator.deviceMemory without user interaction
    // In a real app, you would use navigator.deviceMemory API 
    const totalRAM = 8; // Assume 8GB for demo purposes
    const warning = totalRAM <= 16;
    return { totalRAM, warning };
  } catch (error) {
    console.error('Error checking system RAM:', error);
    return { totalRAM: 8, warning: true };
  }
};

// Backend platform stubs
export const backendPlatforms = {
  huggingface: {
    callModel: async (prompt: string, modelId: string) => {
      console.log(`[HuggingFace] Calling model ${modelId} with prompt: ${prompt}`);
      return `Response from HuggingFace model ${modelId}`;
    }
  },
  ollama: {
    callModel: async (prompt: string, modelId: string) => {
      console.log(`[Ollama] Calling model ${modelId} with prompt: ${prompt}`);
      return `Response from Ollama model ${modelId}`;
    }
  },
  llamacpp: {
    callModel: async (prompt: string, modelId: string) => {
      console.log(`[LlamaCPP] Calling model ${modelId} with prompt: ${prompt}`);
      return `Response from LlamaCPP model ${modelId}`;
    }
  }
};
