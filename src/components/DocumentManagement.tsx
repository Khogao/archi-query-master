
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Upload, Folder } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentList } from '@/components/DocumentList';
import { Folder as FolderType } from '@/hooks/useDocuments';

const uploadSchema = z.object({
  name: z.string().min(3, { message: "Tên tài liệu phải có ít nhất 3 ký tự" }),
  type: z.enum(["pdf", "docx"], { 
    required_error: "Hãy chọn loại tài liệu",
    invalid_type_error: "Loại tài liệu không hợp lệ"
  }),
  folderId: z.string(),
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
  const { toast } = useToast();
  
  const uploadForm = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      type: "pdf",
      folderId: selectedFolderId
    }
  });

  // Update form when selectedFolderId changes
  React.useEffect(() => {
    uploadForm.setValue("folderId", selectedFolderId);
  }, [selectedFolderId, uploadForm]);

  const handleUploadSubmit = (values: UploadFormValues) => {
    addDocument({
      name: values.name,
      type: values.type,
      size: "1.2 MB", // In a real app, we'd get the actual file size
      folderId: values.folderId
    });
    uploadForm.reset();
    setIsUploadDialogOpen(false);
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
  );
};
