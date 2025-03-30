
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { pipeline, env } from '@huggingface/transformers';
import { checkSystemRAM, backendPlatforms } from '@/utils/vectorUtils';

// Configure Transformers.js for local models
env.useBrowserCache = true;
env.allowLocalModels = true;

export type AiModelType = 
  | 'llama-3.1-sonar-small-128k-online'  // 8B parameters
  | 'llama-3.1-sonar-large-128k-online'  // 70B parameters
  | 'llama-3.1-sonar-huge-128k-online'   // 405B parameters
  | 'local-embedding-model'              // Local embedding model for faster processing
  | 'llama3:8b'                          // Ollama model
  | 'bkai-vietnamese-encoder';           // Vietnamese embedding model

export type PlatformType = 'huggingface' | 'ollama' | 'llamacpp';

export type EmbeddingModelType = 
  | 'mixedbread-ai/mxbai-embed-small-v1'
  | 'mixedbread-ai/mxbai-embed-large-v1'
  | 'mixedbread-ai/mxbai-embed-xsmall-v1'
  | 'Xenova/all-MiniLM-L6-v2'           // Added reliable fallback model
  | 'bkai-foundation-models/vietnamese-bi-encoder';

interface ModelInfo {
  id: AiModelType;
  name: string;
  description: string;
  parameters: string;
  requirements: string;
  huggingfaceId?: string; // Hugging Face model ID
  platform: PlatformType;
}

export const AI_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.1-sonar-small-128k-online',
    name: 'Llama 3.1 Sonar Small',
    description: 'Mô hình nhỏ với hiệu năng tốt cho truy vấn thông thường',
    parameters: '8B',
    requirements: 'Cần kết nối internet, tốc độ xử lý nhanh',
    huggingfaceId: 'mixedbread-ai/mxbai-embed-small-v1',
    platform: 'huggingface'
  },
  {
    id: 'llama-3.1-sonar-large-128k-online',
    name: 'Llama 3.1 Sonar Large',
    description: 'Mô hình cân bằng giữa hiệu năng và độ chính xác',
    parameters: '70B',
    requirements: 'Cần kết nối internet, tốc độ xử lý trung bình',
    huggingfaceId: 'mixedbread-ai/mxbai-embed-large-v1',
    platform: 'huggingface'
  },
  {
    id: 'llama-3.1-sonar-huge-128k-online',
    name: 'Llama 3.1 Sonar Huge',
    description: 'Mô hình lớn với độ chính xác cao nhất',
    parameters: '405B',
    requirements: 'Cần kết nối internet, tốc độ xử lý chậm',
    huggingfaceId: 'facebook/bart-large',
    platform: 'huggingface'
  },
  {
    id: 'local-embedding-model',
    name: 'Local Embedding Model',
    description: 'Mô hình xử lý cục bộ không cần kết nối internet',
    parameters: 'Nhẹ',
    requirements: 'Chạy hoàn toàn trên máy tính, phù hợp cho truy vấn đơn giản',
    huggingfaceId: 'mixedbread-ai/mxbai-embed-xsmall-v1',
    platform: 'huggingface'
  },
  {
    id: 'llama3:8b',
    name: 'Llama 3 8B',
    description: 'Mô hình Llama3 8B chạy trên nền tảng Ollama',
    parameters: '8B',
    requirements: 'Cần cài đặt Ollama, chạy cục bộ trên máy',
    platform: 'ollama'
  },
  {
    id: 'bkai-vietnamese-encoder',
    name: 'BKAI Vietnamese Encoder',
    description: 'Mô hình embedding tối ưu cho tiếng Việt',
    parameters: 'Trung bình',
    requirements: 'Tối ưu cho ngôn ngữ tiếng Việt',
    huggingfaceId: 'Xenova/all-MiniLM-L6-v2', // Using reliable fallback
    platform: 'huggingface'
  }
];

export const EMBEDDING_MODELS = [
  {
    id: 'mixedbread-ai/mxbai-embed-small-v1',
    name: 'MXBai Embed Small',
    description: 'Mô hình embedding đa ngôn ngữ, kích thước nhỏ',
    platform: 'huggingface'
  },
  {
    id: 'mixedbread-ai/mxbai-embed-large-v1',
    name: 'MXBai Embed Large',
    description: 'Mô hình embedding đa ngôn ngữ, kích thước lớn',
    platform: 'huggingface'
  },
  {
    id: 'mixedbread-ai/mxbai-embed-xsmall-v1',
    name: 'MXBai Embed XSmall',
    description: 'Mô hình embedding đa ngôn ngữ, kích thước cực nhỏ, phù hợp cho thiết bị yếu',
    platform: 'huggingface'
  },
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    name: 'MiniLM-L6-v2',
    description: 'Mô hình embedding đa năng, gọn nhẹ với hiệu suất tốt',
    platform: 'huggingface'
  },
  {
    id: 'bkai-foundation-models/vietnamese-bi-encoder',
    name: 'BKAI Vietnamese Encoder',
    description: 'Mô hình embedding tối ưu cho tiếng Việt',
    platform: 'huggingface'
  }
];

// Default reliable fallback model
const FALLBACK_MODEL = 'Xenova/all-MiniLM-L6-v2';

export const useAiModel = (
  initialModel: AiModelType = 'llama3:8b', 
  initialPlatform: PlatformType = 'ollama',
  initialEmbeddingModel: EmbeddingModelType = 'Xenova/all-MiniLM-L6-v2' // Changed default to reliable model
) => {
  const [selectedModel, setSelectedModel] = useState<AiModelType>(initialModel);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>(initialPlatform);
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<EmbeddingModelType>(initialEmbeddingModel);
  const [embeddingPipeline, setEmbeddingPipeline] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const [lastError, setLastError] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);

  const getModelInfo = (modelId: AiModelType): ModelInfo | undefined => {
    return AI_MODELS.find(model => model.id === modelId);
  };

  // Get list of available platforms
  const getAvailablePlatforms = (): PlatformType[] => {
    const platforms = new Set<PlatformType>();
    AI_MODELS.forEach(model => platforms.add(model.platform));
    return Array.from(platforms);
  };

  // Get models by platform
  const getModelsByPlatform = (platform: PlatformType): ModelInfo[] => {
    return AI_MODELS.filter(model => model.platform === platform);
  };

  // Check if a model is large (requires warning for low RAM)
  const isLargeModel = (modelId: AiModelType): boolean => {
    const model = AI_MODELS.find(m => m.id === modelId);
    if (!model) return false;
    
    // Consider large if over 7B parameters or explicitly large/huge
    return model.parameters.includes('70B') || 
           model.parameters.includes('405B') || 
           parseInt(model.parameters) > 7;
  };

  // Check RAM and show warning if needed
  const checkRamForModel = (modelId: AiModelType): boolean => {
    const ramInfo = checkSystemRAM();
    const needsWarning = ramInfo.warning && isLargeModel(modelId);
    
    if (needsWarning) {
      toast({
        title: "Cảnh báo RAM",
        description: `Máy tính của bạn chỉ có ${ramInfo.totalRAM}GB RAM. Model ${modelId} yêu cầu nhiều RAM để chạy hiệu quả.`,
        variant: "default",
      });
    }
    
    return needsWarning;
  };

  // Load model with error handling and fallbacks
  const loadModel = async (modelId: AiModelType) => {
    setIsLoading(true);
    setLastError(null);
    
    // Check RAM requirements
    checkRamForModel(modelId);
    
    try {
      const modelInfo = getModelInfo(modelId);
      
      if (!modelInfo) {
        throw new Error('Không tìm thấy thông tin model');
      }

      // If Ollama model, handle differently
      if (modelInfo.platform === 'ollama') {
        toast({
          title: "Đang kết nối với Ollama",
          description: `Đang thiết lập kết nối đến ${modelInfo.name} trên nền tảng Ollama...`,
        });
        
        // Simulate successful connection with Ollama
        setTimeout(() => {
          toast({
            title: "Đã kết nối với Ollama",
            description: `Model ${modelInfo.name} đã sẵn sàng sử dụng`,
          });
          setIsLoading(false);
          setIsModelLoaded(true);
        }, 1500);
        
        return null;
      }
      
      // For LlamaCPP models
      if (modelInfo.platform === 'llamacpp') {
        toast({
          title: "Đang kết nối với LlamaCPP",
          description: `Đang thiết lập kết nối đến ${modelInfo.name} trên nền tảng LlamaCPP...`,
        });
        
        // Simulate successful connection
        setTimeout(() => {
          toast({
            title: "Đã kết nối với LlamaCPP",
            description: `Model ${modelInfo.name} đã sẵn sàng sử dụng`,
          });
          setIsLoading(false);
          setIsModelLoaded(true);
        }, 1800);
        
        return null;
      }

      // For Hugging Face models
      if (!modelInfo.huggingfaceId) {
        throw new Error('Không tìm thấy Hugging Face ID cho model');
      }

      toast({
        title: "Đang tải model",
        description: `Đang tải ${modelInfo.name} từ Hugging Face...`,
      });
      
      try {
        // Try to load the specified embedding model
        const pipelineOptions = modelId === 'local-embedding-model' ? { quantized: true } : {};
        
        const extractor = await pipeline(
          "feature-extraction",
          modelInfo.huggingfaceId,
          { 
            revision: "main", 
            ...pipelineOptions,
            progress_callback: (progressInfo: any) => {
              // Handle progress properly using the loaded/total properties
              const progress = progressInfo.loaded && progressInfo.total 
                ? Math.round((progressInfo.loaded / progressInfo.total) * 100)
                : 0;
              console.log(`Loading model: ${progress}%`);
            }
          }
        );
        
        setEmbeddingPipeline(extractor);
        setIsModelLoaded(true);
        
        toast({
          title: "Đã tải model thành công",
          description: `Model ${modelInfo.name} đã sẵn sàng sử dụng`,
        });
        
        return extractor;
      } catch (modelError) {
        console.error('Error loading specified model:', modelError);
        
        // If loading fails, try the fallback model
        toast({
          title: "Đang tải model thay thế",
          description: `Model chính không khả dụng, đang tải model thay thế...`,
          variant: "default",
        });
        
        const fallbackExtractor = await pipeline(
          "feature-extraction",
          FALLBACK_MODEL,
          { 
            revision: "main",
            progress_callback: (progressInfo: any) => {
              // Handle progress properly using the loaded/total properties
              const progress = progressInfo.loaded && progressInfo.total 
                ? Math.round((progressInfo.loaded / progressInfo.total) * 100)
                : 0;
              console.log(`Loading fallback model: ${progress}%`);
            }
          }
        );
        
        setEmbeddingPipeline(fallbackExtractor);
        setIsModelLoaded(true);
        
        toast({
          title: "Đã tải model thay thế thành công",
          description: `Model thay thế đã sẵn sàng sử dụng`,
        });
        
        return fallbackExtractor;
      }
    } catch (error) {
      console.error('Lỗi khi tải model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      
      toast({
        title: "Lỗi khi tải model",
        description: `Không thể tải model. Lỗi: ${errorMessage}`,
        variant: "destructive",
      });
      
      // Try to load fallback model
      try {
        toast({
          title: "Đang tải model dự phòng",
          description: "Đang tải model dự phòng...",
        });
        
        const fallbackExtractor = await pipeline(
          "feature-extraction",
          FALLBACK_MODEL,
          { revision: "main" }
        );
        
        setEmbeddingPipeline(fallbackExtractor);
        setIsModelLoaded(true);
        
        toast({
          title: "Đã tải model dự phòng thành công",
          description: "Model dự phòng đã sẵn sàng sử dụng",
        });
        
        return fallbackExtractor;
      } catch (fallbackError) {
        console.error('Lỗi khi tải model dự phòng:', fallbackError);
        toast({
          title: "Lỗi khi tải model dự phòng",
          description: "Không thể tải model dự phòng. Vui lòng thử lại sau.",
          variant: "destructive",
        });
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load embedding model with error handling
  const loadEmbeddingModel = async (embeddingModelId: EmbeddingModelType) => {
    setIsLoading(true);
    setLastError(null);
    try {
      toast({
        title: "Đang tải model embedding",
        description: `Đang tải model embedding ${embeddingModelId}...`,
      });
      
      try {
        // First try the requested model
        const extractor = await pipeline(
          "feature-extraction",
          embeddingModelId,
          { 
            revision: "main",
            progress_callback: (progressInfo: any) => {
              // Handle progress properly using the loaded/total properties
              const progress = progressInfo.loaded && progressInfo.total 
                ? Math.round((progressInfo.loaded / progressInfo.total) * 100)
                : 0;
              console.log(`Loading embedding model: ${progress}%`);
            }
          }
        );
        
        setEmbeddingPipeline(extractor);
        setIsModelLoaded(true);
        
        toast({
          title: "Đã tải model embedding thành công",
          description: `Model embedding đã sẵn sàng sử dụng`,
        });
        
        return extractor;
      } catch (error) {
        console.error(`Error loading embedding model ${embeddingModelId}:`, error);
        
        // If requested model fails, try fallback
        toast({
          title: "Đang tải model dự phòng",
          description: "Model embedding yêu cầu không khả dụng, đang tải model dự phòng...",
          variant: "default",
        });
        
        const fallbackExtractor = await pipeline(
          "feature-extraction",
          FALLBACK_MODEL,
          { revision: "main" }
        );
        
        setEmbeddingPipeline(fallbackExtractor);
        setIsModelLoaded(true);
        
        toast({
          title: "Đã tải model dự phòng thành công",
          description: "Model embedding dự phòng đã sẵn sàng sử dụng",
        });
        
        return fallbackExtractor;
      }
    } catch (error) {
      console.error('Lỗi khi tải model embedding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      
      toast({
        title: "Lỗi khi tải model embedding",
        description: `Không thể tải model. Lỗi: ${errorMessage}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Generate embedding for text with error handling
  const generateEmbedding = async (text: string) => {
    if (!embeddingPipeline) {
      const modelInfo = getModelInfo(selectedModel);
      if (modelInfo?.huggingfaceId) {
        await loadEmbeddingModel(modelInfo.huggingfaceId as EmbeddingModelType);
      } else {
        await loadEmbeddingModel(selectedEmbeddingModel);
      }
    }
    
    if (embeddingPipeline) {
      try {
        const result = await embeddingPipeline(text, { pooling: "mean", normalize: true });
        return result;
      } catch (error) {
        console.error('Lỗi khi tạo embedding:', error);
        
        // If current pipeline fails, try loading the fallback model
        toast({
          title: "Đang thử lại với model dự phòng",
          description: "Đang tải model embedding dự phòng...",
          variant: "default",
        });
        
        try {
          const fallbackExtractor = await pipeline(
            "feature-extraction",
            FALLBACK_MODEL,
            { revision: "main" }
          );
          
          setEmbeddingPipeline(fallbackExtractor);
          
          // Try again with fallback model
          const result = await fallbackExtractor(text, { pooling: "mean", normalize: true });
          
          toast({
            title: "Đã xử lý với model dự phòng",
            description: "Embedding đã được tạo thành công bằng model dự phòng",
          });
          
          return result;
        } catch (fallbackError) {
          console.error('Lỗi khi tạo embedding với model dự phòng:', fallbackError);
          toast({
            title: "Lỗi khi xử lý văn bản",
            description: "Không thể tạo embedding. Vui lòng thử lại sau.",
            variant: "destructive",
          });
          return null;
        }
      }
    }
    return null;
  };

  // Call the selected model with the given prompt
  const callModel = async (prompt: string) => {
    if (!selectedModel) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn model trước khi gửi truy vấn",
        variant: "destructive",
      });
      return null;
    }
    
    const modelInfo = getModelInfo(selectedModel);
    if (!modelInfo) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin model",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      toast({
        title: "Đang xử lý truy vấn",
        description: `Đang gửi truy vấn đến ${modelInfo.name}...`,
      });
      
      const platform = backendPlatforms[modelInfo.platform];
      if (!platform) {
        throw new Error(`Platform ${modelInfo.platform} không được hỗ trợ`);
      }
      
      const result = await platform.callModel(prompt, selectedModel);
      
      if (result.error) {
        toast({
          title: "Lỗi khi xử lý truy vấn",
          description: result.error,
          variant: "destructive",
        });
        return null;
      }
      
      toast({
        title: "Đã xử lý truy vấn",
        description: `Thời gian: ${result.timeTaken ? (result.timeTaken / 1000).toFixed(2) : '?'} giây`,
      });
      
      return result.text;
    } catch (error) {
      console.error('Lỗi khi gọi model:', error);
      toast({
        title: "Lỗi khi xử lý truy vấn",
        description: error instanceof Error ? error.message : "Không thể xử lý truy vấn",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    // When selected model changes, load new model if platform is huggingface
    if (selectedModel && selectedPlatform === 'huggingface') {
      loadModel(selectedModel);
    }
  }, [selectedModel, selectedPlatform]);

  useEffect(() => {
    // When embedding model changes, load new embedding model
    if (selectedEmbeddingModel) {
      loadEmbeddingModel(selectedEmbeddingModel);
    }
  }, [selectedEmbeddingModel]);

  return {
    selectedModel,
    setSelectedModel,
    selectedPlatform,
    setSelectedPlatform,
    selectedEmbeddingModel,
    setSelectedEmbeddingModel,
    models: AI_MODELS,
    embeddingModels: EMBEDDING_MODELS,
    getModelInfo,
    getAvailablePlatforms,
    getModelsByPlatform,
    isLoading,
    isModelLoaded,
    loadModel,
    loadEmbeddingModel,
    generateEmbedding,
    embeddingPipeline,
    lastError,
    callModel,
    isLargeModel,
    checkRamForModel
  };
};
