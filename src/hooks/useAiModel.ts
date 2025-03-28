
import { useState } from 'react';

export type AiModelType = 
  | 'llama-3.1-sonar-small-128k-online'  // 8B parameters
  | 'llama-3.1-sonar-large-128k-online'  // 70B parameters
  | 'llama-3.1-sonar-huge-128k-online'   // 405B parameters
  | 'local-embedding-model';             // Local embedding model for faster processing

interface ModelInfo {
  id: AiModelType;
  name: string;
  description: string;
  parameters: string;
  requirements: string;
}

export const AI_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.1-sonar-small-128k-online',
    name: 'Llama 3.1 Sonar Small',
    description: 'Mô hình nhỏ với hiệu năng tốt cho truy vấn thông thường',
    parameters: '8B',
    requirements: 'Cần kết nối internet, tốc độ xử lý nhanh'
  },
  {
    id: 'llama-3.1-sonar-large-128k-online',
    name: 'Llama 3.1 Sonar Large',
    description: 'Mô hình cân bằng giữa hiệu năng và độ chính xác',
    parameters: '70B',
    requirements: 'Cần kết nối internet, tốc độ xử lý trung bình'
  },
  {
    id: 'llama-3.1-sonar-huge-128k-online',
    name: 'Llama 3.1 Sonar Huge',
    description: 'Mô hình lớn với độ chính xác cao nhất',
    parameters: '405B',
    requirements: 'Cần kết nối internet, tốc độ xử lý chậm'
  },
  {
    id: 'local-embedding-model',
    name: 'Local Embedding Model',
    description: 'Mô hình xử lý cục bộ không cần kết nối internet',
    parameters: 'Nhẹ',
    requirements: 'Chạy hoàn toàn trên máy tính, phù hợp cho truy vấn đơn giản'
  }
];

export const useAiModel = (initialModel: AiModelType = 'llama-3.1-sonar-small-128k-online') => {
  const [selectedModel, setSelectedModel] = useState<AiModelType>(initialModel);

  const getModelInfo = (modelId: AiModelType): ModelInfo | undefined => {
    return AI_MODELS.find(model => model.id === modelId);
  };

  return {
    selectedModel,
    setSelectedModel,
    models: AI_MODELS,
    getModelInfo,
  };
};
