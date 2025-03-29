
import React from 'react';
import { FolderList } from '@/components/FolderList';
import { ModelSelector } from '@/components/ModelSelector';
import { OcrConfigPanel } from '@/components/OcrConfigPanel';
import { Folder, AiModelType, EmbeddingModelType } from '@/hooks/useDocuments';
import { OcrConfig } from '@/hooks/useOcrConfig';

interface SidebarContentProps {
  folders: Folder[];
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onAddFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleFolderSelection: (id: string) => void;
  onToggleAllFolders: (selected: boolean) => void;
  getSubFolders: (parentId: string) => Folder[];
  getMainFolders: () => Folder[];
  selectedModel: AiModelType;
  onModelChange: (model: AiModelType) => void;
  selectedEmbeddingModel: EmbeddingModelType;
  onEmbeddingModelChange: (model: EmbeddingModelType) => void;
  ocrConfig: OcrConfig;
  onOcrConfigUpdate: (config: Partial<OcrConfig>) => void;
  readableOcrConfig: any;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  folders,
  selectedFolderId,
  onFolderSelect,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderSelection,
  onToggleAllFolders,
  getSubFolders,
  getMainFolders,
  selectedModel,
  onModelChange,
  selectedEmbeddingModel,
  onEmbeddingModelChange,
  ocrConfig,
  onOcrConfigUpdate,
  readableOcrConfig
}) => {
  return (
    <>
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold mb-2">Thư mục tài liệu</h2>
        <FolderList 
          folders={folders}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onAddFolder={onAddFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onToggleFolderSelection={onToggleFolderSelection}
          onToggleAllFolders={onToggleAllFolders}
          getSubFolders={getSubFolders}
          getMainFolders={getMainFolders}
        />
      </div>

      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold mb-2">Mô hình AI</h2>
        <ModelSelector 
          value={selectedModel}
          onValueChange={onModelChange}
          embeddingModel={selectedEmbeddingModel}
          onEmbeddingModelChange={onEmbeddingModelChange}
        />
      </div>

      <div className="p-4 border-b border-gray-200">
        <OcrConfigPanel 
          config={ocrConfig}
          onConfigUpdate={onOcrConfigUpdate}
          readableConfig={readableOcrConfig}
        />
      </div>
    </>
  );
};
