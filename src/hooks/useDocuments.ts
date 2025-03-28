
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
    { id: 'standards', name: 'Tiêu chuẩn & Quy Chuẩn', children: ['standards-construction', 'standards-architecture', 'standards-fireprotection'] },
    { id: 'legal-investment', name: 'Pháp lý Đầu tư & dự án' },
    { id: 'legal-land', name: 'Pháp lý Đất đai' },
    { id: 'local-regulations', name: 'Quy định của Địa phương', children: ['local-hcmc', 'local-hanoi', 'local-danang'] },
    
    // Subfolders for Standards
    { id: 'standards-construction', name: 'Xây dựng', parentId: 'standards' },
    { id: 'standards-architecture', name: 'Kiến trúc', parentId: 'standards' },
    { id: 'standards-fireprotection', name: 'PCCC', parentId: 'standards' },
    
    // Subfolders for Local Regulations
    { id: 'local-hcmc', name: 'TP. Hồ Chí Minh', parentId: 'local-regulations' },
    { id: 'local-hanoi', name: 'Hà Nội', parentId: 'local-regulations' },
    { id: 'local-danang', name: 'Đà Nẵng', parentId: 'local-regulations' },
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

  const getDocumentsByFolder = (folderId: string) => {
    return documents.filter(doc => doc.folderId === folderId);
  };

  const getMainFolders = () => {
    return folders.filter(folder => !folder.parentId);
  };

  const getSubFolders = (parentId: string) => {
    return folders.filter(folder => folder.parentId === parentId);
  };

  const getFolderById = (id: string) => {
    return folders.find(folder => folder.id === id);
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
    getDocumentsByFolder,
    getMainFolders,
    getSubFolders,
    getFolderById,
    getFolderPath,
  };
};
