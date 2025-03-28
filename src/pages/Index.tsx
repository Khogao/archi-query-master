
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Upload, Search, Folder } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAiModel, AiModelType } from '@/hooks/useAiModel';
import { useOcrConfig } from '@/hooks/useOcrConfig';
import { useDocuments } from '@/hooks/useDocuments';
import { ModelSelector } from '@/components/ModelSelector';
import { DocumentList } from '@/components/DocumentList';
import { FolderList } from '@/components/FolderList';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { OcrConfigPanel } from '@/components/OcrConfigPanel';

const uploadSchema = z.object({
  name: z.string().min(3, { message: "Tên tài liệu phải có ít nhất 3 ký tự" }),
  type: z.enum(["pdf", "docx"], { 
    required_error: "Hãy chọn loại tài liệu",
    invalid_type_error: "Loại tài liệu không hợp lệ"
  }),
  folderId: z.string(),
});

const Index = () => {
  const [selectedModel, setSelectedModel] = useState<AiModelType>('llama-3.1-sonar-small-128k-online');
  const { config: ocrConfig, updateConfig, getReadableConfig } = useOcrConfig();
  const { documents, folders, addDocument, deleteDocument, addFolder, getDocumentsByFolder } = useDocuments();
  const [selectedFolderId, setSelectedFolderId] = useState(folders[0].id);
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

  const currentFolderName = folders.find(f => f.id === selectedFolderId)?.name || "";
  const currentFolderDocuments = getDocumentsByFolder(selectedFolderId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900">ArchiQuery Master</h1>
        <p className="text-gray-600">Hệ thống truy vấn tài liệu kiến trúc và quy hoạch</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold mb-2">Thư mục tài liệu</h2>
            <FolderList 
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
              onAddFolder={addFolder}
            />
          </div>

          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold mb-2">Mô hình AI</h2>
            <ModelSelector 
              value={selectedModel}
              onValueChange={setSelectedModel}
            />
          </div>

          <div className="p-4 border-b border-gray-200">
            <OcrConfigPanel 
              config={ocrConfig}
              onConfigUpdate={updateConfig}
              readableConfig={getReadableConfig()}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Document Management Section */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Quản lý tài liệu - {currentFolderName}</h2>
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
                              <div className="space-y-1">
                                {folders.map((folder) => (
                                  <Button 
                                    key={folder.id}
                                    type="button"
                                    variant={field.value === folder.id ? "default" : "outline"}
                                    onClick={() => uploadForm.setValue("folderId", folder.id)}
                                    className="w-full justify-start"
                                  >
                                    <Folder className="mr-2 h-4 w-4" />
                                    {folder.name}
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
                  <Button onClick={() => {
                    if (!chatInput.trim()) return;
                    toast({
                      title: "Đang xử lý",
                      description: "Đang tìm kiếm thông tin từ các tài liệu"
                    });
                  }}>
                    <Search className="mr-2 h-4 w-4" />
                    Truy vấn
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
