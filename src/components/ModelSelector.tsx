
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAiModel, AiModelType } from '@/hooks/useAiModel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Download, Loader2 } from 'lucide-react';

interface ModelSelectorProps {
  value: AiModelType;
  onValueChange: (value: AiModelType) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  value, 
  onValueChange 
}) => {
  const { models, getModelInfo, isLoading, loadModel } = useAiModel();
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const [selectedModelInfo, setSelectedModelInfo] = React.useState(getModelInfo(value));

  const handleInfoClick = (modelId: AiModelType) => {
    setSelectedModelInfo(getModelInfo(modelId));
    setIsInfoOpen(true);
  };

  const handleLoadModel = async () => {
    if (value) {
      await loadModel(value);
    }
  };

  return (
    <div className="space-y-2">
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
            {models.map((model) => (
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

      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
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
            Tải model về máy
          </>
        )}
      </Button>

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedModelInfo?.name}</DialogTitle>
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
                <p className="text-sm text-gray-600">{selectedModelInfo.platform}</p>
              </div>
              {selectedModelInfo.huggingfaceId && (
                <div>
                  <h4 className="font-medium">Hugging Face ID</h4>
                  <p className="text-sm text-gray-600">{selectedModelInfo.huggingfaceId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
