import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Upload, Folder, AlertTriangle, FileText, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentList } from '@/components/DocumentList';
import { Folder as FolderType } from '@/hooks/useDocuments';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAiModel } from '@/hooks/useAiModel';
import { processDocument } from '@/utils/documentProcessor';

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

const uploadSchema = z.object({
  folderId: z.string(),
  file: z.instanceof(FileList).refine(files => files.length > 0, {
    message: "Vui lòng chọn ít nhất một tệp tin"
  })
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface DocumentManagementProps {
  selectedFolderId: string;
  folderPath: FolderType[];
  currentFolderDocuments: any[];
  addDocument: (document: any) => void;
  deleteDocument: (id: string) => void;
  getFolderPath: (folderId: string) => FolderType[];
  folders: FolderType[];
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  selectedFolderId,
  folderPath,
  currentFolderDocuments,
  addDocument,
  deleteDocument,
  getFolderPath,
  folders
}) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processingProgress, setProcessingProgress] = React.useState(0);
  const [processingFile, setProcessingFile] = React.useState('');
  const [includeSubfolders, setIncludeSubfolders] = React.useState(true);
  const [selectedFiles, setSelectedFiles] = React.useState<FileList | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { embeddingPipeline, selectedEmbeddingModel, loadEmbeddingModel } = useAiModel();
  
  const uploadForm = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      folderId: selectedFolderId
    }
  });

  React.useEffect(() => {
    uploadForm.setValue("folderId", selectedFolderId);
  }, [selectedFolderId, uploadForm]);

  const handleUploadSubmit = async (values: UploadFormValues) => {
    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      
      const files = values.file;
      const totalFiles = files.length;
      
      if (!embeddingPipeline) {
        toast({
          title: "Đang tải model embedding",
          description: "Vui lòng đợi trong khi model embedding đang được tải...",
        });
        await loadEmbeddingModel(selectedEmbeddingModel);
      }
      
      toast({
        title: "Bắt đầu xử lý",
        description: `Đang xử lý ${totalFiles} tệp tin...`,
      });
      
      let processedFiles = 0;
      let totalChunks = 0;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        setProcessingFile(file.name);
        
        try {
          const result = await processDocument(file, values.folderId, file.name, (progress) => {
            const overallProgress = ((processedFiles + progress / 100) / totalFiles) * 100;
            setProcessingProgress(overallProgress);
          }, embeddingPipeline);
          
          totalChunks += result.chunks;
          
          const newDoc = {
            name: file.name,
            type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx',
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            folderId: values.folderId
          };
          
          addDocument(newDoc);
          processedFiles++;
          
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          toast({
            title: `Lỗi khi xử lý ${file.name}`,
            description: fileError instanceof Error ? fileError.message : "Có lỗi xảy ra",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Tải lên thành công",
        description: `Đã xử lý ${processedFiles}/${totalFiles} tệp tin và trích xuất ${totalChunks} đoạn văn bản`,
      });
    } catch (error) {
      console.error('Error processing documents:', error);
      toast({
        title: "Lỗi khi xử lý tài liệu",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra khi xử lý tài liệu",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedFiles(null);
      uploadForm.reset();
      setIsUploadDialogOpen(false);
    }
  };

  const handleFolderUpload = async () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  const handleFolderSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = event.target.files;
    if (!allFiles || allFiles.length === 0) return;
    
    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      
      if (!embeddingPipeline) {
        toast({
          title: "Đang tải model embedding",
          description: "Vui lòng đợi trong khi model embedding đang được tải...",
        });
        await loadEmbeddingModel(selectedEmbeddingModel);
      }
      
      // Filter files based on subfolder option
      let filesToProcess: File[] = Array.from(allFiles);
      
      if (!includeSubfolders) {
        // Only include files from root folder (no '/' in webkitRelativePath after folder name)
        const firstFile = allFiles[0] as any;
        const rootFolderName = firstFile.webkitRelativePath?.split('/')[0] || '';
        
        filesToProcess = filesToProcess.filter((file: any) => {
          const relativePath = file.webkitRelativePath || file.name;
          const pathParts = relativePath.split('/');
          // Only root level: folderName/fileName.ext (2 parts)
          return pathParts.length === 2;
        });
        
        if (filesToProcess.length === 0) {
          toast({
            title: "Không có tệp tin",
            description: "Không tìm thấy tệp tin nào trong thư mục gốc",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Chỉ xử lý thư mục gốc",
          description: `Tìm thấy ${filesToProcess.length} tệp tin (bỏ qua ${allFiles.length - filesToProcess.length} tệp trong thư mục con)`,
        });
      }
      
      const totalFiles = filesToProcess.length;
      let processedFiles = 0;
      let totalChunks = 0;
      
      toast({
        title: "Bắt đầu xử lý thư mục",
        description: `Đang xử lý ${totalFiles} tệp tin...`,
      });
      
      for (let i = 0; i < totalFiles; i++) {
        const file = filesToProcess[i];
        setProcessingFile(file.name);
        
        try {
          const result = await processDocument(file, selectedFolderId, file.name, (progress) => {
            const overallProgress = ((processedFiles + progress / 100) / totalFiles) * 100;
            setProcessingProgress(overallProgress);
          }, embeddingPipeline);
          
          totalChunks += result.chunks;
          
          const newDoc = {
            name: file.name,
            type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx',
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            folderId: selectedFolderId
          };
          
          addDocument(newDoc);
          
          processedFiles++;
          
          if (processedFiles % 3 === 0 || processedFiles === totalFiles) {
            toast({
              title: `Đã xử lý ${processedFiles}/${totalFiles} tệp tin`,
              description: `Đã trích xuất ${totalChunks} đoạn văn bản`,
            });
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          toast({
            title: `Lỗi khi xử lý tệp tin ${file.name}`,
            description: fileError instanceof Error ? fileError.message : "Có lỗi xảy ra",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Xử lý thư mục hoàn tất",
        description: `Đã xử lý ${processedFiles}/${totalFiles} tệp tin và trích xuất ${totalChunks} đoạn văn bản`,
      });
    } catch (error) {
      console.error('Error processing folder:', error);
      toast({
        title: "Lỗi khi xử lý thư mục",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra khi xử lý thư mục",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      uploadForm.setValue("file", files);
    }
  };

  return (
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
      
      {isProcessing && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Đang xử lý tài liệu</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span>Đang xử lý: {processingFile}</span>
                <span>{Math.round(processingProgress)}%</span>
              </div>
              <Progress value={processingProgress} className="h-2" />
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-4 mb-4">
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={isProcessing}>
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
                  name="file"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Chọn tệp tin (có thể chọn nhiều)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <Input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".pdf,.docx,.txt"
                            multiple
                            onChange={(e) => {
                              onChange(e.target.files);
                              handleFileChange(e);
                            }}
                            {...rest}
                          />
                          {selectedFiles && selectedFiles.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                              <div className="text-sm font-medium text-green-600 flex items-center">
                                <Check className="mr-1 h-4 w-4" />
                                Đã chọn {selectedFiles.length} tệp tin:
                              </div>
                              {Array.from(selectedFiles).map((file, index) => (
                                <div key={index} className="text-xs text-gray-600 ml-5">
                                  • {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
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
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? (
                      <>Đang xử lý...</>
                    ) : (
                      <>Tải lên</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleFolderUpload}
            disabled={isProcessing}
          >
            <Folder className="mr-2 h-4 w-4" />
            Nhập thư mục
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
            <input
              type="checkbox"
              id="includeSubfolders"
              checked={includeSubfolders}
              onChange={(e) => setIncludeSubfolders(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="includeSubfolders" className="text-sm cursor-pointer">
              Bao gồm thư mục con
            </label>
          </div>
        </div>
        
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory="true"
          directory=""
          multiple
          className="hidden"
          onChange={handleFolderSelected}
          aria-label="Chọn thư mục để tải lên"
          title="Chọn thư mục để tải lên"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DocumentList 
          documents={currentFolderDocuments}
          onDelete={deleteDocument}
        />
      </div>
    </div>
  );
};
