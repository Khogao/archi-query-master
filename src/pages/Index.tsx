import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAiModel, AiModelType, EmbeddingModelType, PlatformType } from '@/hooks/useAiModel';
import { useOcrConfig } from '@/hooks/useOcrConfig';
import { useDocuments } from '@/hooks/useDocuments';
import { MainLayout } from '@/layouts/MainLayout';
import { PageHeader } from '@/components/PageHeader';
import { SidebarContent } from '@/components/SidebarContent';
import { DocumentManagement } from '@/components/DocumentManagement';
import { QueryPanel } from '@/components/QueryPanel';

const Index = () => {
  // AI Model settings
  const [selectedModel, setSelectedModel] = useState<AiModelType>('llama3:8b');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('ollama');
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<EmbeddingModelType>(
    'bkai-foundation-models/vietnamese-bi-encoder'
  );
  
  // OCR configuration
  const { config: ocrConfig, updateConfig, getReadableConfig } = useOcrConfig();
  
  // Document management
  const { 
    documents, 
    folders, 
    addDocument, 
    deleteDocument, 
    addFolder, 
    renameFolder,
    deleteFolder,
    toggleFolderSelection,
    toggleAllFolders,
    getSelectedFolderIds,
    getDocumentsByFolder,
    getMainFolders,
    getSubFolders,
    getFolderById,
    getFolderPath
  } = useDocuments();
  
  const [selectedFolderId, setSelectedFolderId] = useState('standards-architecture');

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  // Get current folder information
  const currentFolder = getFolderById(selectedFolderId);
  const folderPath = getFolderPath(selectedFolderId);
  const currentFolderDocuments = getDocumentsByFolder(selectedFolderId);

  const sidebarContent = (
    <SidebarContent
      folders={folders}
      selectedFolderId={selectedFolderId}
      onFolderSelect={handleFolderSelect}
      onAddFolder={addFolder}
      onRenameFolder={renameFolder}
      onDeleteFolder={deleteFolder}
      onToggleFolderSelection={toggleFolderSelection}
      onToggleAllFolders={toggleAllFolders}
      getSubFolders={getSubFolders}
      getMainFolders={getMainFolders}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      selectedEmbeddingModel={selectedEmbeddingModel}
      onEmbeddingModelChange={setSelectedEmbeddingModel}
      selectedPlatform={selectedPlatform}
      onPlatformChange={setSelectedPlatform}
      ocrConfig={ocrConfig}
      onOcrConfigUpdate={updateConfig}
      readableOcrConfig={getReadableConfig()}
    />
  );

  const header = (
    <PageHeader title="QueryMaster" />
  );

  const mainContent = (
    <>
      <DocumentManagement
        selectedFolderId={selectedFolderId}
        folderPath={folderPath}
        currentFolderDocuments={currentFolderDocuments}
        addDocument={addDocument}
        deleteDocument={deleteDocument}
        getFolderPath={getFolderPath}
        folders={folders}
      />
      
      <QueryPanel 
        getSelectedFolderIds={getSelectedFolderIds}
        selectedModel={selectedModel}
        selectedEmbeddingModel={selectedEmbeddingModel}
        selectedPlatform={selectedPlatform}
      />
    </>
  );

  return (
    <MainLayout
      header={header}
      sidebar={sidebarContent}
      main={mainContent}
    />
  );
};

export default Index;
