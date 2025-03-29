
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Upload, Search, Folder } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAiModel, AiModelType, EmbeddingModelType } from '@/hooks/useAiModel';
import { useOcrConfig } from '@/hooks/useOcrConfig';
import { useDocuments, Folder as FolderType } from '@/hooks/useDocuments';
import { ModelSelector } from '@/components/ModelSelector';
import { DocumentList } from '@/components/DocumentList';
import { FolderList } from '@/components/FolderList';
import { ResizableSidebar } from '@/components/ResizableSidebar';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { OcrConfigPanel } from '@/components/OcrConfigPanel';
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable';

const uploadSchema = z.object({
  name: z.string().min(3, { message: "Tên tài liệu phải có ít nhất 3 ký tự" }),
  type: z.enum(["pdf", "docx"], { 
    required_error: "Hãy chọn loại tài liệu",
    invalid_type_error: "Loại tài liệu không hợp lệ"
  }),
  folderId: z.string(),
});

const Index = () => {
  // Sử dụng các giá trị mặc định như yêu cầu
  const [selectedModel, setSelectedModel] = useState<AiModelType>('llama3:8b');
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<EmbeddingModelType>(
    'bkai-foundation-models/vietnamese-bi-encoder'
  );
  
  const { config: ocrConfig, updateConfig, getReadableConfig } = useOcrConfig();
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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const { toast } = useToast();
  
  const uploadForm = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      type: "pdf",
      folderId: selectedFolderId
    }
  });

  const handleUploadSubmit = (values: z.infer<typeof uploadSchema>) => {
    addDocument({
      name: values.name,
      type: values.type,
      size: "1.2 MB", // In a real app, we'd get the actual file size
      folderId: values.folderId
    });
    uploadForm.reset();
    setIsUploadDialogOpen(false);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    uploadForm.setValue("folderId", folderId);
  };

  const handleSearch = () => {
    if (!chatInput.trim()) return;
    
    // Get selected folders for search scope
    const selectedFolders = getSelectedFolderIds();
    
    toast({
      title: "Đang xử lý",
      description: selectedFolders.length > 0 
        ? `Đang tìm kiếm trong ${selectedFolders.length} thư mục đã chọn` 
        : "Đang tìm kiếm trong tất cả các tài liệu",
    });
  };

  const currentFolder = getFolderById(selectedFolderId);
  const folderPath = getFolderPath(selectedFolderId);
  const currentFolderDocuments = getDocumentsByFolder(selectedFolderId);

  // Component for the sidebar content
  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold mb-2">Thư mục tài liệu</h2>
        <FolderList 
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
        />
      </div>

      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold mb-2">Mô hình AI</h2>
        <ModelSelector 
          value={selectedModel}
          onValueChange={setSelectedModel}
          embeddingModel={selectedEmbeddingModel}
          onEmbeddingModelChange={setSelectedEmbeddingModel}
        />
      </div>

      <div className="p-4 border-b border-gray-200">
        <OcrConfigPanel 
          config={ocrConfig}
          onConfigUpdate={updateConfig}
          readableConfig={getReadableConfig()}
        />
      </div>
    </>
  );

  // Component for the main content
  const MainContent = () => (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h2 className="text-xl font-semibold">Quản lý tài liệu</h2>
          <div className="mx-2 text-gray-500">›</div>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              {index > 0 && <div className="mx-2 text-gray-500">›</div>}
              <span 
                className={index === folderPath.length - 1 ? "font-medium" : "text-gray-600"}
              >
                {folder.name}
              </span>
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex gap-4 mb-4">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Tải lên tài liệu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tải lên tài liệu mới</DialogTitle>
              </DialogHeader>
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(handleUploadSubmit)} className="space-y-4">
                  <FormField
                    control={uploadForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên tài liệu</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập tên tài liệu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={uploadForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại tài liệu</FormLabel>
                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant={field.value === "pdf" ? "default" : "outline"}
                            onClick={() => uploadForm.setValue("type", "pdf")}
                            className="flex-1"
                          >
                            PDF
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "docx" ? "default" : "outline"}
                            onClick={() => uploadForm.setValue("type", "docx")}
                            className="flex-1"
                          >
                            DOCX
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={uploadForm.control}
                    name="folderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thư mục</FormLabel>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {folders.map((folder) => (
                            <Button 
                              key={folder.id}
                              type="button"
                              variant={field.value === folder.id ? "default" : "outline"}
                              onClick={() => uploadForm.setValue("folderId", folder.id)}
                              className="w-full justify-start"
                            >
                              <Folder className="mr-2 h-4 w-4" />
                              {getFolderPath(folder.id).map(f => f.name).join(' › ')}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button type="submit">Tải lên</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => toast({
            title: "Tính năng đang phát triển",
            description: "Chức năng nhập thư mục đang được phát triển"
          })}>
            <Folder className="mr-2 h-4 w-4" />
            Nhập thư mục
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <DocumentList 
            documents={currentFolderDocuments}
            onDelete={deleteDocument}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Truy vấn thông tin</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="mb-4 text-gray-600">Đặt câu hỏi về các quy định kiến trúc, quy hoạch hoặc pháp lý xây dựng:</p>
          <div className="flex gap-2">
            <Input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ví dụ: Thủ tục nộp hồ sơ quy hoạch 1/500 ở Quận 12 TPHCM?"
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Truy vấn
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>
              {getSelectedFolderIds().length > 0 ? 
                `Tìm kiếm trong ${getSelectedFolderIds().length} thư mục đã chọn` : 
                "Tìm kiếm trong tất cả tài liệu"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900">QuerryMaster</h1>
        <p className="text-gray-600">Hệ thống truy vấn tài liệu kiến trúc và quy hoạch</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          <ResizableSidebar>
            <SidebarContent />
          </ResizableSidebar>
          <MainContent />
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Index;
