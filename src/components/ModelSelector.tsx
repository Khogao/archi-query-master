import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAiModel, AiModelType, PlatformType, EmbeddingModelType } from '@/hooks/useAiModel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Download, Loader2, Server, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { backendPlatforms, checkSystemRAM } from '@/utils/vectorUtils';

interface ModelSelectorProps {
  value: AiModelType;
  onValueChange: (value: AiModelType) => void;
  embeddingModel?: EmbeddingModelType;
  onEmbeddingModelChange?: (value: EmbeddingModelType) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  value, 
  onValueChange,
  embeddingModel,
  onEmbeddingModelChange
}) => {
  const { 
    models, 
    embeddingModels,
    getModelInfo, 
    isLoading, 
    loadModel,
    loadEmbeddingModel,
    selectedPlatform, 
    setSelectedPlatform, 
    getAvailablePlatforms,
    getModelsByPlatform
  } = useAiModel();
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const [selectedModelInfo, setSelectedModelInfo] = React.useState(getModelInfo(value));
  const [embeddingModelInfo, setEmbeddingModelInfo] = React.useState<any>(null);
  const [showRamWarning, setShowRamWarning] = React.useState(false);
  const [ramCheckResult, setRamCheckResult] = React.useState<{totalRAM: number, warning: boolean}>({ totalRAM: 0, warning: false });

  const availablePlatforms = getAvailablePlatforms();
  const filteredModels = getModelsByPlatform(selectedPlatform);

  const handleInfoClick = (modelId: AiModelType) => {
    setSelectedModelInfo(getModelInfo(modelId));
    setIsInfoOpen(true);
  };

  const handleEmbeddingInfoClick = (modelId: string) => {
    const model = embeddingModels.find(m => m.id === modelId);
    setEmbeddingModelInfo(model);
    setIsInfoOpen(true);
  };

  const handlePlatformChange = (platform: PlatformType) => {
    setSelectedPlatform(platform);
    const modelsForPlatform = getModelsByPlatform(platform);
    
    if (!modelsForPlatform.some(model => model.id === value) && modelsForPlatform.length > 0) {
      onValueChange(modelsForPlatform[0].id);
    }
  };

  const isLargeModel = (modelId: AiModelType): boolean => {
    const model = models.find(m => m.id === modelId);
    if (!model) return false;
    
    return model.parameters.includes('70B') || 
           model.parameters.includes('405B') || 
           parseInt(model.parameters) > 7;
  };

  useEffect(() => {
    const checkRam = () => {
      const ramInfo = checkSystemRAM();
      setRamCheckResult(ramInfo);
      setShowRamWarning(ramInfo.warning && isLargeModel(value));
    };
    
    checkRam();
  }, [value]);

  const handleLoadModel = async () => {
    if (!value) return;
    
    const ramInfo = checkSystemRAM();
    setRamCheckResult(ramInfo);
    
    if (ramInfo.warning && isLargeModel(value)) {
      setShowRamWarning(true);
      toast({
        title: "Cảnh báo RAM",
        description: `Máy tính của bạn chỉ có ${ramInfo.totalRAM}GB RAM. Model ${value} cần nhiều RAM để chạy hiệu quả.`,
        variant: "destructive",
      });
    }
    
    await loadModel(value);
    
    const modelInfo = getModelInfo(value);
    if (!modelInfo) return;
    
    const platform = backendPlatforms[modelInfo.platform as keyof typeof backendPlatforms];
    if (platform) {
      const response = await platform.callModel("Test connection", value);
      console.log("Backend response:", response);
      
      toast({
        title: "Đã kết nối backend",
        description: `Đã thiết lập kết nối với platform ${modelInfo.platform} thành công`,
      });
    }
  };

  const handleLoadEmbeddingModel = async () => {
    if (!embeddingModel) return;
    
    const ramInfo = checkSystemRAM();
    
    await loadEmbeddingModel(embeddingModel);
    
    toast({
      title: "Đã tải model embedding",
      description: `Model embedding ${embeddingModel.split('/').pop()} đã sẵn sàng sử dụng`,
    });
  };

  return (
    <div className="space-y-2">
      <div className="mb-2">
        <label className="text-sm font-medium mb-1 block">Platform</label>
        <Select
          value={selectedPlatform}
          onValueChange={handlePlatformChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn platform" />
          </SelectTrigger>
          <SelectContent>
            {availablePlatforms.map((platform) => (
              <SelectItem 
                key={platform} 
                value={platform}
              >
                <div className="flex items-center">
                  <Server className="h-4 w-4 mr-2" />
                  <span className="capitalize">{platform}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium mb-1 block">Model LLM</label>
        <div className="flex items-center gap-2">
          <Select
            value={value}
            onValueChange={onValueChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn mô hình" />
            </SelectTrigger>
            <SelectContent>
              {filteredModels.map((model) => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="flex justify-between"
                >
                  <div className="flex justify-between w-full">
                    <span>{model.name}</span>
                    <span className="text-gray-500 text-xs">{model.parameters}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleInfoClick(value)}
            disabled={isLoading}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {onEmbeddingModelChange && (
        <div className="space-y-1">
          <label className="text-sm font-medium mb-1 block">Model Embedding</label>
          <div className="flex items-center gap-2">
            <Select
              value={embeddingModel}
              onValueChange={onEmbeddingModelChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn mô hình embedding" />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.map((model) => (
                  <SelectItem 
                    key={model.id} 
                    value={model.id}
                    className="flex justify-between"
                  >
                    <div className="flex justify-between w-full">
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => embeddingModel && handleEmbeddingInfoClick(embeddingModel)}
              disabled={isLoading || !embeddingModel}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showRamWarning && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Cảnh báo RAM</AlertTitle>
          <AlertDescription className="text-amber-700">
            Máy tính của bạn chỉ có {ramCheckResult.totalRAM}GB RAM. Model này yêu cầu nhiều RAM hơn để chạy hiệu quả.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={handleLoadModel}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang tải model...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Tải LLM
            </>
          )}
        </Button>
        
        {onEmbeddingModelChange && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleLoadEmbeddingModel}
            disabled={isLoading || !embeddingModel}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Tải Embedding
              </>
            )}
          </Button>
        )}
      </div>

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedModelInfo ? selectedModelInfo.name : embeddingModelInfo?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedModelInfo && (
            <div className="space-y-4 pt-2">
              <div>
                <h4 className="font-medium">Mô tả</h4>
                <p className="text-sm text-gray-600">{selectedModelInfo.description}</p>
              </div>
              <div>
                <h4 className="font-medium">Thông số</h4>
                <p className="text-sm text-gray-600">Số tham số: {selectedModelInfo.parameters}</p>
              </div>
              <div>
                <h4 className="font-medium">Yêu cầu</h4>
                <p className="text-sm text-gray-600">{selectedModelInfo.requirements}</p>
              </div>
              <div>
                <h4 className="font-medium">Platform</h4>
                <p className="text-sm text-gray-600 capitalize">{selectedModelInfo.platform}</p>
              </div>
              {selectedModelInfo.huggingfaceId && (
                <div>
                  <h4 className="font-medium">Hugging Face ID</h4>
                  <p className="text-sm text-gray-600">{selectedModelInfo.huggingfaceId}</p>
                </div>
              )}
            </div>
          )}
          {embeddingModelInfo && !selectedModelInfo && (
            <div className="space-y-4 pt-2">
              <div>
                <h4 className="font-medium">Mô tả</h4>
                <p className="text-sm text-gray-600">{embeddingModelInfo.description}</p>
              </div>
              <div>
                <h4 className="font-medium">ID</h4>
                <p className="text-sm text-gray-600">{embeddingModelInfo.id}</p>
              </div>
              <div>
                <h4 className="font-medium">Platform</h4>
                <p className="text-sm text-gray-600 capitalize">{embeddingModelInfo.platform}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
