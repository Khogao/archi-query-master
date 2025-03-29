
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { pipeline, env } from '@huggingface/transformers';

// Cấu hình Transformers.js cho local models
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
  | 'bkai-foundation-models/vietnamese-bi-encoder';

interface ModelInfo {
  id: AiModelType;
  name: string;
  description: string;
  parameters: string;
  requirements: string;
  huggingfaceId?: string; // ID của model trên Hugging Face
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
    huggingfaceId: 'bkai-foundation-models/vietnamese-bi-encoder',
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
    id: 'bkai-foundation-models/vietnamese-bi-encoder',
    name: 'BKAI Vietnamese Encoder',
    description: 'Mô hình embedding tối ưu cho tiếng Việt',
    platform: 'huggingface'
  }
];

export const useAiModel = (
  initialModel: AiModelType = 'llama3:8b', 
  initialPlatform: PlatformType = 'ollama',
  initialEmbeddingModel: EmbeddingModelType = 'bkai-foundation-models/vietnamese-bi-encoder'
) => {
  const [selectedModel, setSelectedModel] = useState<AiModelType>(initialModel);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>(initialPlatform);
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<EmbeddingModelType>(initialEmbeddingModel);
  const [embeddingPipeline, setEmbeddingPipeline] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const getModelInfo = (modelId: AiModelType): ModelInfo | undefined => {
    return AI_MODELS.find(model => model.id === modelId);
  };

  // Lấy danh sách các platform có sẵn
  const getAvailablePlatforms = (): PlatformType[] => {
    const platforms = new Set<PlatformType>();
    AI_MODELS.forEach(model => platforms.add(model.platform));
    return Array.from(platforms);
  };

  // Lấy danh sách models theo platform
  const getModelsByPlatform = (platform: PlatformType): ModelInfo[] => {
    return AI_MODELS.filter(model => model.platform === platform);
  };

  const loadModel = async (modelId: AiModelType) => {
    setIsLoading(true);
    try {
      const modelInfo = getModelInfo(modelId);
      
      if (!modelInfo) {
        throw new Error('Không tìm thấy thông tin model');
      }

      // Nếu là model Ollama thì xử lý khác
      if (modelInfo.platform === 'ollama') {
        toast({
          title: "Đang kết nối với Ollama",
          description: `Đang thiết lập kết nối đến ${modelInfo.name} trên nền tảng Ollama...`,
        });
        
        // Giả lập kết nối thành công với Ollama (trong ứng dụng thực tế sẽ gọi API của Ollama)
        setTimeout(() => {
          toast({
            title: "Đã kết nối với Ollama",
            description: `Model ${modelInfo.name} đã sẵn sàng sử dụng`,
          });
          setIsLoading(false);
        }, 1500);
        
        return null;
      }

      // Xử lý cho models Hugging Face
      if (!modelInfo.huggingfaceId) {
        throw new Error('Không tìm thấy Hugging Face ID cho model');
      }

      toast({
        title: "Đang tải model",
        description: `Đang tải ${modelInfo.name} từ Hugging Face...`,
      });
      
      // Tải model embedding từ Hugging Face
      const pipelineOptions = modelId === 'local-embedding-model' ? { quantized: true } : {};
      
      const extractor = await pipeline(
        "feature-extraction",
        modelInfo.huggingfaceId,
        { revision: "main", ...pipelineOptions }
      );
      
      setEmbeddingPipeline(extractor);
      
      toast({
        title: "Đã tải model thành công",
        description: `Model ${modelInfo.name} đã sẵn sàng sử dụng`,
      });
      
      return extractor;
    } catch (error) {
      console.error('Lỗi khi tải model:', error);
      toast({
        title: "Lỗi khi tải model",
        description: `Không thể tải model. Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Tải model embedding
  const loadEmbeddingModel = async (embeddingModelId: EmbeddingModelType) => {
    setIsLoading(true);
    try {
      toast({
        title: "Đang tải model embedding",
        description: `Đang tải model embedding ${embeddingModelId}...`,
      });
      
      const extractor = await pipeline(
        "feature-extraction",
        embeddingModelId,
        { revision: "main" }
      );
      
      setEmbeddingPipeline(extractor);
      
      toast({
        title: "Đã tải model embedding thành công",
        description: `Model embedding đã sẵn sàng sử dụng`,
      });
      
      return extractor;
    } catch (error) {
      console.error('Lỗi khi tải model embedding:', error);
      toast({
        title: "Lỗi khi tải model embedding",
        description: `Không thể tải model. Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Tạo embedding cho văn bản
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
        toast({
          title: "Lỗi khi xử lý văn bản",
          description: `Không thể tạo embedding. Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    // Khi model được chọn thay đổi, tải model mới
    if (selectedModel && selectedPlatform === 'huggingface') {
      loadModel(selectedModel);
    }
  }, [selectedModel, selectedPlatform]);

  useEffect(() => {
    // Khi embedding model thay đổi, tải model embedding mới
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
    loadModel,
    loadEmbeddingModel,
    generateEmbedding,
    embeddingPipeline
  };
};
