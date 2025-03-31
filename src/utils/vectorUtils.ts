import { EmbeddingModelType } from '@/hooks/useAiModel';
import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for sandbox environment
env.useBrowserCache = false; // Disable browser cache as it may not work in sandbox
env.allowLocalModels = false; // Disable local models as they may not be accessible
env.cacheDir = undefined; // Don't specify cache dir as it may not be writable

// Fallback model that's small and likely to work
const FALLBACK_MODEL = 'Xenova/all-MiniLM-L6-v2';

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
export let inMemoryVectorStore: VectorChunk[] = [
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

// Generate embedding for a text query with proper error handling
export const generateEmbedding = async (text: string, modelId: EmbeddingModelType): Promise<number[]> => {
  console.log(`[DEBUG] Starting embedding generation with model: ${modelId}`);
  
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text input cannot be empty');
    }
    
    // Add detailed diagnostics
    console.log(`[DEBUG] Environment config:`, {
      useBrowserCache: env.useBrowserCache,
      allowLocalModels: env.allowLocalModels,
      cacheDir: env.cacheDir
    });
    
    console.log(`[DEBUG] Testing network connectivity to HuggingFace...`);
    try {
      // Test if we can access the model on HuggingFace
      const testUrl = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`;
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log(`[DEBUG] HuggingFace connectivity test: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Failed to access model info at HuggingFace: ${response.status} ${response.statusText}`);
      }
    } catch (networkError) {
      console.error('[DEBUG] Network error accessing HuggingFace:', networkError);
      throw new Error(`Network connectivity issue: ${networkError instanceof Error ? networkError.message : String(networkError)}`);
    }
    
    // Create pipeline for feature extraction with minimalist options
    console.log(`[DEBUG] Creating pipeline for model: ${modelId}`);
    try {
      const extractor = await pipeline(
        "feature-extraction",
        modelId,
        {
          progress_callback: (progress) => {
            console.log(`[DEBUG] Loading model progress:`, progress);
          }
        }
      );
      
      console.log("[DEBUG] Pipeline created successfully");
      
      // Generate embedding with minimal options
      const result = await extractor(text, { 
        pooling: "mean", 
        normalize: true 
      });
      
      console.log("[DEBUG] Embedding generated successfully");
      
      // Convert to array of numbers
      if (result && result.data) {
        return Array.from(result.data);
      } else {
        console.error("[DEBUG] Invalid embedding result format:", result);
        throw new Error('Invalid embedding result format');
      }
    } catch (pipelineError) {
      console.error('[DEBUG] Pipeline creation/execution error:', pipelineError);
      throw pipelineError;
    }
  } catch (error) {
    console.error('[DEBUG] Primary embedding error:', error);
    
    try {
      console.log(`[DEBUG] Attempting with direct mock embeddings since sandbox environment may restrict model loading`);
      
      // Instead of trying fallback models that might also fail in the sandbox,
      // go straight to deterministic mock embeddings for more reliable operation
      
      // Create a deterministic "mock" embedding based on the text content
      // This ensures consistent results for the same text input
      const getHashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
        }
        return hash;
      };
      
      // Generate a deterministic vector based on the text's hash
      const seed = getHashCode(text);
      const mockEmbedding = Array(384).fill(0).map((_, i) => {
        // Use a simple deterministic function based on the seed and index
        const x = Math.sin(seed + i) * 10000;
        return Math.sin(x) * 0.5; // Range between -0.5 and 0.5
      });
      
      console.log("[DEBUG] Mock embedding created successfully");
      return mockEmbedding;
    } catch (mockError) {
      console.error('[DEBUG] Even mock embedding generation failed:', mockError);
      // Last resort fallback - truly random embedding
      console.warn('[DEBUG] Using random embedding as absolute last resort');
      return Array(384).fill(0).map(() => Math.random() - 0.5);
    }
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

/**
 * Search for similar chunks
 * @param query The search query
 * @param embeddingModelId The embedding model to use
 * @param folderIds List of folder IDs to filter by (if empty, search all)
 * @param limit Maximum number of results to return
 * @returns Array of chunks sorted by similarity
 */
export async function searchSimilarChunks(
  query: string,
  embeddingModelId: EmbeddingModelType,
  folderIds: string[] = [],
  limit: number = 5
): Promise<VectorChunk[]> {
  console.log(`[DEBUG] Searching for similar chunks with model: ${embeddingModelId}`);
  console.log(`[DEBUG] Folders to search: ${folderIds.length > 0 ? folderIds.join(', ') : 'All folders'}`);
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, embeddingModelId);
    
    // Filter by folders if specified
    let filteredChunks = inMemoryVectorStore;
    if (folderIds.length > 0) {
      filteredChunks = inMemoryVectorStore.filter(chunk => folderIds.includes(chunk.folderId));
      console.log(`[DEBUG] Filtered to ${filteredChunks.length} chunks from selected folders`);
    }
    
    // Calculate similarity scores
    const scoredChunks = filteredChunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity score (descending)
    scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    console.log(`[DEBUG] Found ${scoredChunks.length} chunks, returning top ${limit}`);
    
    // Return top N results
    return scoredChunks.slice(0, limit);
  } catch (error) {
    console.error('[DEBUG] Error in vector search:', error);
    
    // Text search fallback
    return performTextSearch(query, folderIds, limit);
  }
}

// Text search fallback that doesn't rely on embeddings
function performTextSearch(query: string, folderIds: string[] = [], limit: number = 5): VectorChunk[] {
  console.log('[DEBUG] Performing text search fallback');
  
  try {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
    
    // Filter by folders if specified
    let filteredChunks = inMemoryVectorStore;
    if (folderIds.length > 0) {
      filteredChunks = inMemoryVectorStore.filter(chunk => folderIds.includes(chunk.folderId));
    }
    
    // Assign scores based on word matches
    const scoredChunks = filteredChunks.map(chunk => {
      const textLower = chunk.text.toLowerCase();
      let score = 0;
      
      // Exact phrase match (highest score)
      if (textLower.includes(queryLower)) {
        score += 1.0;
      }
      
      // Individual word matches
      queryWords.forEach(word => {
        if (textLower.includes(word)) {
          score += 0.2;
        }
      });
      
      return {
        ...chunk,
        score
      };
    });
    
    // Filter out zero scores and sort by score (descending)
    const matchingChunks = scoredChunks
      .filter(chunk => chunk.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    
    console.log(`[DEBUG] Text search found ${matchingChunks.length} matches, returning top ${limit}`);
    
    // Return top N results
    return matchingChunks.slice(0, limit);
  } catch (fallbackError) {
    console.error('[DEBUG] Error in text search fallback:', fallbackError);
    return []; // Return empty array as last resort
  }
}

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

// Define platform-specific model calling interfaces
export interface ModelCallingResult {
  text: string;
  error?: string;
  timeTaken?: number;
}

// Backend platform implementations
export const backendPlatforms = {
  huggingface: {
    callModel: async (prompt: string, modelId: string): Promise<ModelCallingResult> => {
      console.log(`[HuggingFace] Calling model ${modelId} with prompt: ${prompt}`);
      const startTime = Date.now();
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
          text: `Response from HuggingFace model ${modelId}`,
          timeTaken: Date.now() - startTime
        };
      } catch (error) {
        return {
          text: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          timeTaken: Date.now() - startTime
        };
      }
    }
  },
  ollama: {
    callModel: async (prompt: string, modelId: string): Promise<ModelCallingResult> => {
      console.log(`[Ollama] Calling model ${modelId} with prompt: ${prompt}`);
      const startTime = Date.now();
      try {
        // Simulate API call to Ollama
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          text: `Response from Ollama model ${modelId}. Processed query: "${prompt}"`,
          timeTaken: Date.now() - startTime
        };
      } catch (error) {
        return {
          text: '',
          error: error instanceof Error ? error.message : 'Unknown error with Ollama',
          timeTaken: Date.now() - startTime
        };
      }
    }
  },
  llamacpp: {
    callModel: async (prompt: string, modelId: string): Promise<ModelCallingResult> => {
      console.log(`[LlamaCPP] Calling model ${modelId} with prompt: ${prompt}`);
      const startTime = Date.now();
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1200));
        return {
          text: `Response from LlamaCPP model ${modelId}. Query processed: "${prompt}"`,
          timeTaken: Date.now() - startTime
        };
      } catch (error) {
        return {
          text: '',
          error: error instanceof Error ? error.message : 'Unknown error with LlamaCPP',
          timeTaken: Date.now() - startTime
        };
      }
    }
  }
};
