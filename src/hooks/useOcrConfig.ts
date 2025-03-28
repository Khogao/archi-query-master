
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface OcrConfig {
  resolution: 'low' | 'medium' | 'high';
  language: 'vietnamese' | 'english' | 'mixed';
  accuracy: 'speed' | 'balanced' | 'accuracy';
}

export const DEFAULT_OCR_CONFIG: OcrConfig = {
  resolution: 'high',
  language: 'vietnamese',
  accuracy: 'balanced',
};

export const useOcrConfig = (initialConfig: OcrConfig = DEFAULT_OCR_CONFIG) => {
  const [config, setConfig] = useState<OcrConfig>(initialConfig);
  const { toast } = useToast();

  const updateConfig = (newConfig: Partial<OcrConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      return updated;
    });
    
    toast({
      title: "Đã lưu cấu hình OCR",
      description: "Các thông số OCR đã được cập nhật",
    });
  };

  const getReadableConfig = () => {
    const resolutionLabels = {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
    };

    const languageLabels = {
      vietnamese: 'Tiếng Việt',
      english: 'Tiếng Anh',
      mixed: 'Hỗn hợp',
    };

    const accuracyLabels = {
      speed: 'Tốc độ',
      balanced: 'Cân bằng',
      accuracy: 'Độ chính xác',
    };

    return {
      resolution: resolutionLabels[config.resolution],
      language: languageLabels[config.language],
      accuracy: accuracyLabels[config.accuracy],
    };
  };

  return {
    config,
    updateConfig,
    getReadableConfig,
  };
};
