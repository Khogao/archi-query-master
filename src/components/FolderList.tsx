
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Folder, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  Plus 
} from 'lucide-react';
import { Folder as FolderType } from '@/hooks/useDocuments';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface FolderListProps {
  folders: FolderType[];
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onAddFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  getSubFolders: (parentId: string) => FolderType[];
  getMainFolders: () => FolderType[];
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
  onAddFolder,
  onRenameFolder,
  getSubFolders,
  getMainFolders
}) => {
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['standards', 'local-regulations']);
  const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
  const [folderToRename, setFolderToRename] = useState<string | null>(null);
  
  const addForm = useForm<z.infer<typeof folderSchema>>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: "",
    },
  });

  const renameForm = useForm<z.infer<typeof folderSchema>>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: "",
    },
  });

  const onAddSubmit = (values: z.infer<typeof folderSchema>) => {
    onAddFolder(values.name, currentParentId);
    addForm.reset();
    setIsAddFolderOpen(false);
  };

  const onRenameSubmit = (values: z.infer<typeof folderSchema>) => {
    if (folderToRename) {
      onRenameFolder(folderToRename, values.name);
      renameForm.reset();
      setIsRenameFolderOpen(false);
      setFolderToRename(null);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId) 
        : [...prev, folderId]
    );
  };

  const handleOpenAddFolder = (parentId?: string) => {
    setCurrentParentId(parentId);
    setIsAddFolderOpen(true);
  };

  const handleOpenRenameFolder = (folder: FolderType) => {
    setFolderToRename(folder.id);
    renameForm.reset({
      name: folder.name
    });
    setIsRenameFolderOpen(true);
  };

  const renderFolder = (folder: FolderType) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.includes(folder.id);
    const subFolders = hasChildren ? getSubFolders(folder.id) : [];

    return (
      <div key={folder.id} className="space-y-1">
        <div className="flex items-center">
          {hasChildren && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 p-0 mr-1"
              onClick={() => toggleFolder(folder.id)}
            >
              {isExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </Button>
          )}
          {!hasChildren && <div className="w-6"></div>}
          
          <Button 
            variant={folder.id === selectedFolderId ? "default" : "ghost"}
            className="flex-1 justify-start text-left"
            onClick={() => onFolderSelect(folder.id)}
          >
            <Folder className="mr-2 h-4 w-4" />
            <span className="truncate">{folder.name}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 ml-1"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenRenameFolder(folder)}>
                <Edit className="mr-2 h-4 w-4" />
                Đổi tên thư mục
              </DropdownMenuItem>
              {hasChildren && (
                <DropdownMenuItem onClick={() => handleOpenAddFolder(folder.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm thư mục con
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && hasChildren && (
          <div className="pl-4 border-l border-gray-200 ml-3 space-y-1">
            {subFolders.map(subFolder => renderFolder(subFolder))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {getMainFolders().map(folder => renderFolder(folder))}
      </div>
      
      <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleOpenAddFolder()}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Thêm thư mục mới
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentParentId 
                ? "Thêm thư mục con" 
                : "Thêm thư mục mới"}
            </DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
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

      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên thư mục</DialogTitle>
          </DialogHeader>
          <Form {...renameForm}>
            <form onSubmit={renameForm.handleSubmit(onRenameSubmit)} className="space-y-4">
              <FormField
                control={renameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên thư mục mới</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên thư mục mới" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Lưu thay đổi</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
