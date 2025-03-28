
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
  | 'local-embedding-model';             // Local embedding model for faster processing

export type PlatformType = 'huggingface' | 'ollama' | 'llamacpp';

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
  }
];

export const useAiModel = (initialModel: AiModelType = 'llama-3.1-sonar-small-128k-online') => {
  const [selectedModel, setSelectedModel] = useState<AiModelType>(initialModel);
  const [embeddingPipeline, setEmbeddingPipeline] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const getModelInfo = (modelId: AiModelType): ModelInfo | undefined => {
    return AI_MODELS.find(model => model.id === modelId);
  };

  const loadModel = async (modelId: AiModelType) => {
    setIsLoading(true);
    try {
      const modelInfo = getModelInfo(modelId);
      
      if (!modelInfo || !modelInfo.huggingfaceId) {
        throw new Error('Không tìm thấy thông tin model');
      }

      toast({
        title: "Đang tải model",
        description: `Đang tải ${modelInfo.name} từ Hugging Face...`,
      });
      
      // Tải model embedding từ Hugging Face
      const extractor = await pipeline(
        "feature-extraction",
        modelInfo.huggingfaceId,
        { quantized: modelId === 'local-embedding-model' }
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

  // Tạo embedding cho văn bản
  const generateEmbedding = async (text: string) => {
    if (!embeddingPipeline) {
      await loadModel(selectedModel);
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
    if (selectedModel) {
      loadModel(selectedModel);
    }
  }, [selectedModel]);

  return {
    selectedModel,
    setSelectedModel,
    models: AI_MODELS,
    getModelInfo,
    isLoading,
    loadModel,
    generateEmbedding,
    embeddingPipeline
  };
};
