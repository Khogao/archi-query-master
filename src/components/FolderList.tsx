
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Folder, FilePlus } from 'lucide-react';
import { Folder as FolderType } from '@/hooks/useDocuments';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

interface FolderListProps {
  folders: FolderType[];
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onAddFolder: (name: string) => void;
}

const folderSchema = z.object({
  name: z.string().min(3, {
    message: "Tên thư mục phải có ít nhất 3 ký tự.",
  }),
});

export const FolderList: React.FC<FolderListProps> = ({ 
  folders, 
  selectedFolderId, 
  onFolderSelect,
  onAddFolder
}) => {
  const [isAddFolderOpen, setIsAddFolderOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof folderSchema>>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: z.infer<typeof folderSchema>) => {
    onAddFolder(values.name);
    form.reset();
    setIsAddFolderOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {folders.map((folder) => (
          <Button 
            key={folder.id}
            variant={folder.id === selectedFolderId ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => onFolderSelect(folder.id)}
          >
            <Folder className="mr-2 h-4 w-4" />
            {folder.name}
          </Button>
        ))}
      </div>
      
      <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Thêm thư mục mới
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thư mục mới</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên thư mục</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên thư mục" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Thêm thư mục</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
