import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'docx';
  size: string;
  dateAdded: string;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  children?: string[];
  isSelected?: boolean;
}

export const useDocuments = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: '1', name: 'Quy chuẩn thiết kế 01-2021', type: 'pdf', size: '2.4 MB', dateAdded: '2023-10-15', folderId: 'standards-architecture' },
    { id: '2', name: 'Thông tư 16-2019 Quy hoạch xây dựng', type: 'pdf', size: '3.8 MB', dateAdded: '2023-10-14', folderId: 'standards-architecture' },
    { id: '3', name: 'Luật Xây dựng 2020', type: 'docx', size: '1.2 MB', dateAdded: '2023-10-13', folderId: 'legal-investment' },
  ]);
  
  const [folders, setFolders] = useState<Folder[]>([
    // Main categories
    { id: 'standards', name: 'Tiêu chuẩn & Quy Chuẩn', children: ['standards-construction', 'standards-architecture', 'standards-fireprotection'], isSelected: false },
    { id: 'legal-investment', name: 'Pháp lý Đầu tư & dự án', isSelected: false },
    { id: 'legal-land', name: 'Pháp lý Đất đai', isSelected: false },
    { id: 'local-regulations', name: 'Quy định của Địa phương', children: ['local-hcmc', 'local-hanoi', 'local-danang'], isSelected: false },
    
    // Subfolders for Standards
    { id: 'standards-construction', name: 'Xây dựng', parentId: 'standards', isSelected: false },
    { id: 'standards-architecture', name: 'Kiến trúc', parentId: 'standards', isSelected: false },
    { id: 'standards-fireprotection', name: 'PCCC', parentId: 'standards', isSelected: false },
    
    // Subfolders for Local Regulations
    { id: 'local-hcmc', name: 'TP. Hồ Chí Minh', parentId: 'local-regulations', isSelected: false },
    { id: 'local-hanoi', name: 'Hà Nội', parentId: 'local-regulations', isSelected: false },
    { id: 'local-danang', name: 'Đà Nẵng', parentId: 'local-regulations', isSelected: false },
  ]);

  const addDocument = (document: Omit<DocumentItem, 'id' | 'dateAdded'>) => {
    const newDoc = {
      ...document,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    
    setDocuments(prev => [...prev, newDoc]);
    toast({
      title: "Tải lên thành công",
      description: `Đã thêm tài liệu "${document.name}" vào hệ thống`,
    });
    
    return newDoc;
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Đã xóa tài liệu",
      description: "Tài liệu đã được xóa khỏi hệ thống",
    });
  };

  const addFolder = (name: string, parentId?: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      isSelected: false,
      ...(parentId && { parentId }),
    };
    
    setFolders(prev => {
      const updatedFolders = [...prev, newFolder];
      
      // If this is a subfolder, update the parent's children array
      if (parentId) {
        return updatedFolders.map(folder => {
          if (folder.id === parentId) {
            return {
              ...folder,
              children: folder.children ? [...folder.children, newFolder.id] : [newFolder.id]
            };
          }
          return folder;
        });
      }
      
      return updatedFolders;
    });
    
    toast({
      title: "Đã tạo thư mục mới",
      description: `Thư mục "${name}" đã được thêm vào hệ thống`,
    });
    
    return newFolder;
  };

  const renameFolder = (id: string, newName: string) => {
    setFolders(prev => prev.map(folder => 
      folder.id === id ? { ...folder, name: newName } : folder
    ));
    
    toast({
      title: "Đổi tên thư mục thành công",
      description: `Thư mục đã được đổi tên thành "${newName}"`,
    });
  };

  const deleteFolder = (id: string) => {
    const folderToDelete = getFolderById(id);
    
    if (!folderToDelete) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thư mục này",
        variant: "destructive",
      });
      return;
    }
    
    const descendantIds = getAllDescendantIds(id);
    
    setFolders(prev => prev.filter(folder => 
      folder.id !== id && !descendantIds.includes(folder.id)
    ));
    
    const allFolderIds = [id, ...descendantIds];
    setDocuments(prev => prev.filter(doc => 
      !allFolderIds.includes(doc.folderId)
    ));
    
    if (folderToDelete.parentId) {
      setFolders(prev => prev.map(folder => {
        if (folder.id === folderToDelete.parentId) {
          return {
            ...folder,
            children: folder.children?.filter(childId => childId !== id)
          };
        }
        return folder;
      }));
    }
    
    toast({
      title: "Đã xóa thư mục",
      description: `Thư mục "${folderToDelete.name}" đã được xóa khỏi hệ thống`,
    });
  };

  const getAllDescendantIds = (folderId: string): string[] => {
    const result: string[] = [];
    const folder = getFolderById(folderId);
    
    if (folder?.children) {
      for (const childId of folder.children) {
        result.push(childId);
        result.push(...getAllDescendantIds(childId));
      }
    }
    
    return result;
  };

  const toggleFolderSelection = (folderId: string) => {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    const newIsSelected = !folder.isSelected;
    
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, isSelected: newIsSelected } : f
    ));
    
    const childrenIds = getAllDescendantIds(folderId);
    if (childrenIds.length) {
      setFolders(prev => prev.map(f => 
        childrenIds.includes(f.id) ? { ...f, isSelected: newIsSelected } : f
      ));
    }
    
    updateParentFolderSelection();
  };

  const toggleAllFolders = (selected: boolean) => {
    setFolders(prev => prev.map(folder => ({ ...folder, isSelected: selected })));
  };

  const updateParentFolderSelection = () => {
    const parentFolders = folders.filter(f => f.children && f.children.length > 0);
    
    setFolders(prev => {
      let updated = [...prev];
      
      parentFolders.sort((a, b) => {
        const aDepth = getFolderDepth(a.id);
        const bDepth = getFolderDepth(b.id);
        return bDepth - aDepth;
      });
      
      for (const parent of parentFolders) {
        const childrenFolders = parent.children?.map(id => getFolderById(id, updated)) || [];
        
        if (childrenFolders.length === 0) continue;
        
        const allSelected = childrenFolders.every(f => f?.isSelected);
        const noneSelected = childrenFolders.every(f => !f?.isSelected);
        
        updated = updated.map(f => {
          if (f.id === parent.id) {
            return { ...f, isSelected: allSelected };
          }
          return f;
        });
      }
      
      return updated;
    });
  };

  const getFolderDepth = (folderId: string, depth = 0, folderList = folders): number => {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder || !folder.parentId) return depth;
    return getFolderDepth(folder.parentId, depth + 1, folderList);
  };

  const getSelectedFolderIds = (): string[] => {
    return folders.filter(f => f.isSelected).map(f => f.id);
  };

  const getDocumentsByFolder = (folderId: string) => {
    return documents.filter(doc => doc.folderId === folderId);
  };

  const getMainFolders = () => {
    return folders.filter(folder => !folder.parentId);
  };

  const getSubFolders = (parentId: string) => {
    return folders.filter(folder => folder.parentId === parentId);
  };

  const getFolderById = (id: string, folderList = folders) => {
    return folderList.find(folder => folder.id === id);
  };

  const getFolderPath = (folderId: string): Folder[] => {
    const result: Folder[] = [];
    let currentFolder = getFolderById(folderId);
    
    while (currentFolder) {
      result.unshift(currentFolder);
      if (currentFolder.parentId) {
        currentFolder = getFolderById(currentFolder.parentId);
      } else {
        break;
      }
    }
    
    return result;
  };

  return {
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
    getFolderPath,
  };
};
