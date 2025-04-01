
import { EmbeddingModelType } from '@/hooks/useAiModel';
import { pipeline, env } from '@huggingface/transformers';

// IMPORTANT: Create a polyfill for globalThisOrWindow to fix the reference error
// This needs to be done before any other transformers.js code runs
try {
  // Check if window is defined (browser environment)
  if (typeof window !== 'undefined') {
    // @ts-ignore - Dynamically adding a property to the global Window interface
    window.globalThisOrWindow = window;
  } 
  // Check if globalThis is defined (modern environments)
  else if (typeof globalThis !== 'undefined') {
    // @ts-ignore - Dynamically adding a property to the global object
    globalThis.globalThisOrWindow = globalThis;
  }
  // If neither is available, create a minimal global object (unlikely but just in case)
  else {
    const global = Function('return this')();
    // @ts-ignore - Dynamically adding a property to the global object
    global.globalThisOrWindow = global;
  }
  console.log("[DEBUG] Successfully polyfilled globalThisOrWindow");
} catch (error) {
  console.error("[DEBUG] Error setting up globalThisOrWindow polyfill:", error);
}

// Configure Transformers.js for sandbox environment - using minimal settings
env.useBrowserCache = false; // Disable browser cache as it may not work in sandbox
env.allowLocalModels = false; // Disable local models as they may not be accessible
env.cacheDir = undefined; // Don't specify cache dir as it may not be writable

// Disable advanced features that might not work in restricted environments
if (env.backends && env.backends.onnx) {
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1; // Minimal threading
  }
}

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

// Enhanced diagnostic logging with clear status indicators
const logDiagnostic = (message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  const prefix = {
    'info': '[VECTORUTILS] 🔍',
    'success': '[VECTORUTILS] ✅',
    'warning': '[VECTORUTILS] ⚠️',
    'error': '[VECTORUTILS] ❌'
  };
  
  console.log(`${prefix[status]} ${message}`);
};

// Generate embedding for a text query with proper error handling
export const generateEmbedding = async (text: string, modelId: EmbeddingModelType): Promise<number[]> => {
  logDiagnostic(`Starting embedding generation with model: ${modelId}`);
  
  try {
    // CRITICAL: Add explicit check for null or undefined text
    if (!text) {
      logDiagnostic('Text input is null or undefined - THIS IS THE SOURCE OF THE ERROR', 'error');
      throw new Error('Text input cannot be null or undefined');
    }
    
    if (text.trim().length === 0) {
      logDiagnostic('Text input is empty after trimming', 'error');
      throw new Error('Text input cannot be empty');
    }
    
    // Log the actual text content (first 50 chars) to help debug
    logDiagnostic(`Processing text input: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'info');
    
    // Add detailed diagnostics
    logDiagnostic(`Environment config:`, 'info');
    logDiagnostic(`useBrowserCache: ${env.useBrowserCache}`, 'info');
    logDiagnostic(`allowLocalModels: ${env.allowLocalModels}`, 'info');
    logDiagnostic(`cacheDir: ${env.cacheDir ? env.cacheDir : 'undefined'}`, 'info');
    
    // Test network connectivity before attempting to load model
    try {
      logDiagnostic(`Testing network connectivity to HuggingFace...`);
      const testUrl = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`;
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        headers: {
          'Accept': 'application/json'
        }
      });
      logDiagnostic(`HuggingFace connectivity test: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');
      
      if (!response.ok) {
        throw new Error(`Failed to access model info at HuggingFace: ${response.status} ${response.statusText}`);
      }
    } catch (networkError) {
      logDiagnostic(`Network error accessing HuggingFace: ${networkError instanceof Error ? networkError.message : String(networkError)}`, 'error');
      throw new Error(`Network connectivity issue: ${networkError instanceof Error ? networkError.message : String(networkError)}`);
    }
    
    try {
      // Create pipeline with minimal configuration to avoid compatibility issues
      logDiagnostic(`Creating pipeline for model: ${modelId} with minimal options`);
      
      // Use try-catch to handle potential globalThisOrWindow issues during pipeline creation
      const extractor = await pipeline(
        "feature-extraction",
        modelId,
        {
          // Extremely minimal options to avoid compatibility issues
          progress_callback: (progress) => {
            logDiagnostic(`Model loading progress: ${JSON.stringify(progress)}`);
          }
        }
      );
      
      logDiagnostic("Pipeline created successfully", 'success');
      
      // Generate embedding with minimal options
      logDiagnostic(`Generating embedding for text: "${text.substring(0, 20)}..."`, 'info');
      const result = await extractor(text, { 
        pooling: "mean", 
        normalize: true 
      });
      
      logDiagnostic("Embedding generated successfully - REAL EMBEDDING", 'success');
      
      // Convert to array of numbers
      if (result && result.data) {
        return Array.from(result.data);
      } else {
        logDiagnostic("Invalid embedding result format", 'error');
        throw new Error('Invalid embedding result format');
      }
    } catch (pipelineError) {
      logDiagnostic(`Pipeline creation/execution error: ${pipelineError instanceof Error ? pipelineError.message : String(pipelineError)}`, 'error');
      throw pipelineError;
    }
  } catch (error) {
    logDiagnostic(`Primary embedding error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    
    try {
      logDiagnostic(`Using deterministic mock embeddings since sandbox environment has compatibility issues`, 'warning');
      
      // Create a deterministic "mock" embedding based on the text content
      // This ensures consistent results for the same text input
      const getHashCode = (str: string): number => {
        let hash = 0;
        if (!str) {
          logDiagnostic('Warning: Creating hash for empty/null string', 'warning');
          str = 'empty_string'; // Default value to prevent errors
        }
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
        }
        return hash;
      };
      
      // Generate a deterministic vector based on the text's hash
      const seed = getHashCode(text || 'empty_string');
      const mockEmbedding = Array(384).fill(0).map((_, i) => {
        // Use a simple deterministic function based on the seed and index
        const x = Math.sin(seed + i) * 10000;
        return Math.sin(x) * 0.5; // Range between -0.5 and 0.5
      });
      
      logDiagnostic("Mock embedding created successfully - USING MOCK EMBEDDING", 'warning');
      return mockEmbedding;
    } catch (mockError) {
      logDiagnostic(`Even mock embedding generation failed: ${mockError instanceof Error ? mockError.message : String(mockError)}`, 'error');
      // Last resort fallback - truly random embedding
      logDiagnostic(`Using random embedding as absolute last resort - RANDOM EMBEDDING`, 'error');
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
 * Search for similar chunks with enhanced diagnostic logging
 */
export async function searchSimilarChunks(
  query: string,
  embeddingModelId: EmbeddingModelType,
  folderIds: string[] = [],
  limit: number = 5
): Promise<VectorChunk[]> {
  // CRITICAL: Validate query input before processing
  if (!query) {
    logDiagnostic(`Invalid empty query provided to searchSimilarChunks`, 'error');
    return performTextSearch('', folderIds, limit); // Fallback to empty search
  }
  
  logDiagnostic(`Searching for similar chunks with model: ${embeddingModelId}`);
  logDiagnostic(`Query text: "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}"`, 'info');
  logDiagnostic(`Folders to search: ${folderIds.length > 0 ? folderIds.join(', ') : 'All folders'}`);
  
  try {
    // Generate embedding for the query
    logDiagnostic(`Generating embedding for query: "${query.substring(0, 30)}..."`);
    const queryEmbedding = await generateEmbedding(query, embeddingModelId);
    
    // Filter by folders if specified
    let filteredChunks = inMemoryVectorStore;
    if (folderIds.length > 0) {
      filteredChunks = inMemoryVectorStore.filter(chunk => folderIds.includes(chunk.folderId));
      logDiagnostic(`Filtered to ${filteredChunks.length} chunks from selected folders`, 'info');
    }
    
    // Calculate similarity scores
    logDiagnostic(`Calculating similarity scores for ${filteredChunks.length} chunks`, 'info');
    const scoredChunks = filteredChunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity score (descending)
    scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    logDiagnostic(`Vector search complete. Found ${scoredChunks.length} chunks, returning top ${limit}`, 'success');
    
    // Return top N results
    return scoredChunks.slice(0, limit);
  } catch (error) {
    logDiagnostic(`Error in vector search: ${error instanceof Error ? error.message : String(error)}`, 'error');
    logDiagnostic('Falling back to text search', 'warning');
    
    // Text search fallback
    return performTextSearch(query, folderIds, limit);
  }
}

// Text search fallback that doesn't rely on embeddings
function performTextSearch(query: string, folderIds: string[] = [], limit: number = 5): VectorChunk[] {
  console.log('[DEBUG] Performing text search fallback');
  
  try {
    // Handle empty query case
    if (!query || query.trim() === '') {
      logDiagnostic('Empty query provided to text search, returning empty results', 'warning');
      return [];
    }
    
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
